import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { execFile, execFileSync, execSync, spawn, type ChildProcess } from 'child_process';
import net from 'net';
import os from 'os';
import { fileURLToPath } from 'url';
import { parseTraceability, generateMermaid } from './traceability.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Set permissive CSP to avoid blocking browser devtools and local API calls
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' *; connect-src *; img-src * data:; frame-ancestors 'self';");
    next();
});

app.get('/', (req, res) => {
    res.json({ message: 'Cowork Monitoring Dashboard API', status: 'running' });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

const WORKSPACE_PATH = path.resolve(__dirname, '../../');
const HOME_PATH = os.homedir();
const HARD_EXCLUDE_FOLDERS = new Set([
    '.cache',
    '.cargo',
    '.config',
    '.docker',
    '.git',
    '.local',
    '.npm',
    '.nvm',
    '.rustup',
    '.vscode-server',
    'build',
    'dist',
    'node_modules',
]);
const DEFAULT_EXCLUDE_FOLDERS = ['node_modules', '.git', 'dist', 'build', '.cowork'];
const MAX_SCAN_FILES = 2000;
let currentMonitorFolder = process.env.MONITOR_FOLDER || '/home/mhdev/workspace_private';

const getCOWORKPath = () => currentMonitorFolder;

const isWithinPath = (targetPath: string, parentPath: string): boolean => {
    const relative = path.relative(parentPath, targetPath);
    return relative === '' || !relative.startsWith('..');
};

const isHomeDirectory = (targetPath: string): boolean => path.resolve(targetPath) === HOME_PATH;

const gitRootCache = new Map<string, string | null>();
const findGitRoot = (startPath: string): string | null => {
    const resolvedPath = path.resolve(startPath);
    if (gitRootCache.has(resolvedPath)) return gitRootCache.get(resolvedPath)!;

    try {
        // Suppress stderr to avoid log flooding when not in a git repo
        const output = execSync('git rev-parse --show-toplevel 2>/dev/null', { cwd: resolvedPath, encoding: 'utf8' }).trim();
        const result = output || null;
        gitRootCache.set(resolvedPath, result);
        return result;
    } catch {
        gitRootCache.set(resolvedPath, null);
        return null;
    }
};

const GIT_ROOT = findGitRoot(WORKSPACE_PATH);

let currentExcludeFolders: string[] = DEFAULT_EXCLUDE_FOLDERS;

const shouldSkipDirectory = (folderName: string): boolean => (
    HARD_EXCLUDE_FOLDERS.has(folderName) || currentExcludeFolders.includes(folderName)
);

const normalizeMonitorFolder = (folder: string): string | null => {
    const normalized = folder.trim();
    if (!normalized) return null;

    // Resolve relative paths (like '..') against the CURRENT monitor folder, not the server root
    const resolved = path.isAbsolute(normalized) 
        ? normalized 
        : path.resolve(currentMonitorFolder, normalized);
    
    // Check if within allowed limit (home directory)
    const relativeToHome = path.relative(HOME_PATH, resolved);
    if (relativeToHome.startsWith('..')) return null;

    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) return null;

    return resolved;
};

const CONFIG_PATH = path.join(__dirname, 'data/config.json');

const readConfig = () => {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            if (data.monitorFolder) currentMonitorFolder = data.monitorFolder;
            if (Array.isArray(data.excludeFolders)) {
                currentExcludeFolders = data.excludeFolders.map((folder: unknown) => String(folder).trim()).filter(Boolean);
            }
        }
    } catch (e) {
        console.error('Config load error:', e);
    }
};

const saveConfig = () => {
    try {
        const dataDir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({
            monitorFolder: currentMonitorFolder,
            excludeFolders: currentExcludeFolders
        }, null, 2));
    } catch (e) {
        console.error('Config save error:', e);
    }
};

interface CliPaneStatus {
    windowIndex: number;
    paneIndex: number;
    active: boolean;
    command: string;
    path: string;
    title: string;
}

interface TmuxSessionStatusBase {
    sessionName: string;
    running: boolean;
    windows: number;
    attached: number;
    paneCount: number;
    activePaneCommand: string;
    activePanePath: string;
    activePaneTitle: string;
    panes: CliPaneStatus[];
}

type CliSessionStatus = {
    port: number;
    source: 'managed' | 'external';
} & TmuxSessionStatusBase;

type ExternalTmuxSessionStatus = TmuxSessionStatusBase;

interface CliSessionRecord {
    port: number;
    sessionName: string;
    process: ChildProcess;
    preserveTmux: boolean;
}

const cliSessions = new Map<number, CliSessionRecord>();
let currentCliSettings = { fontSize: 14, bgColor: '#0d1117', lineHeight: 1.2 };

const tmuxSessionNameForPort = (port: number): string => `cowork-cli-${port}`;

const runTmux = (args: string[], cwd = getCOWORKPath()): string => {
    return execFileSync('tmux', args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
};

const parsePaneLine = (line: string): CliPaneStatus | null => {
    const [windowIndexRaw, paneIndexRaw, activeRaw, command = '', panePath = '', title = ''] = line.split('\t');
    const windowIndex = Number(windowIndexRaw);
    const paneIndex = Number(paneIndexRaw);
    if (Number.isNaN(windowIndex) || Number.isNaN(paneIndex)) return null;

    return {
        windowIndex,
        paneIndex,
        active: activeRaw === '1',
        command,
        path: panePath,
        title,
    };
};

const readTmuxSessionStatus = (sessionName: string): TmuxSessionStatusBase | null => {
    try {
        const sessionOutput = runTmux([
            'display-message',
            '-p',
            '-t',
            sessionName,
            '#{session_name}\t#{session_windows}\t#{session_attached}',
        ]).trim();

        if (!sessionOutput) return null;

        const [name = sessionName, windowsRaw = '0', attachedRaw = '0'] = sessionOutput.split('\t');
        const paneOutput = runTmux([
            'list-panes',
            '-t',
            sessionName,
            '-F',
            '#{window_index}\t#{pane_index}\t#{pane_active}\t#{pane_current_command}\t#{pane_current_path}\t#{pane_title}',
        ]).trim();

        const panes = paneOutput
            ? paneOutput.split('\n').map(parsePaneLine).filter((pane): pane is CliPaneStatus => pane !== null)
            : [];

        const activePane = panes.find((pane) => pane.active) ?? panes[0] ?? {
            windowIndex: 0,
            paneIndex: 0,
            active: true,
            command: 'unknown',
            path: getCOWORKPath(),
            title: sessionName,
        };

        return {
            sessionName: name,
            running: true,
            windows: Number(windowsRaw) || 0,
            attached: Number(attachedRaw) || 0,
            paneCount: panes.length,
            activePaneCommand: activePane.command,
            activePanePath: activePane.path,
            activePaneTitle: activePane.title,
            panes,
        };
    } catch {
        return null;
    }
};

const readCliSessionStatus = (port: number, sessionName: string): CliSessionStatus | null => {
    const status = readTmuxSessionStatus(sessionName);
    return status ? { port, source: 'managed', ...status } : null;
};

const listTmuxSessionNames = (): string[] => {
    try {
        const output = runTmux([
            'list-sessions',
            '-F',
            '#{session_name}',
        ]).trim();

        return output
            ? output.split('\n').map((sessionName) => sessionName.trim()).filter(Boolean)
            : [];
    } catch {
        return [];
    }
};

const collectExternalTmuxSessionStatuses = (): ExternalTmuxSessionStatus[] => {
    const dashboardSessionNames = new Set(Array.from(cliSessions.values()).map((record) => record.sessionName));
    return listTmuxSessionNames()
        .filter((sessionName) => !dashboardSessionNames.has(sessionName))
        .map((sessionName) => readTmuxSessionStatus(sessionName))
        .filter((session): session is ExternalTmuxSessionStatus => session !== null)
        .sort((a, b) => a.sessionName.localeCompare(b.sessionName));
};

const getNextCliPort = (): number => {
    const activePorts = Array.from(cliSessions.keys());
    const nextPort = activePorts.length === 0 ? 7682 : Math.max(...activePorts) + 1;
    return nextPort === 61208 ? nextPort + 1 : nextPort;
};

const spawnTtydForTmux = (port: number, tmuxArgs: string[], cwd = getCOWORKPath()): ChildProcess | null => {
    const ttydPath = path.resolve(WORKSPACE_PATH, '.bin/ttyd');
    if (!fs.existsSync(ttydPath)) return null;

    const child = spawn(ttydPath, ['-p', port.toString(), ...tmuxArgs], {
        cwd,
        detached: true,
        stdio: 'ignore',
    });
    child.unref();
    return child;
};

const collectCliSessionStatuses = (): CliSessionStatus[] => {
    return Array.from(cliSessions.values())
        .map((record) => {
            const source: 'managed' | 'external' = record.preserveTmux ? 'external' : 'managed';
            const status = readCliSessionStatus(record.port, record.sessionName);
            if (status) {
                return { ...status, source };
            }

            return {
                port: record.port,
                source,
                sessionName: record.sessionName,
                running: false,
                windows: 0,
                attached: 0,
                paneCount: 0,
                activePaneCommand: 'stopped',
                activePanePath: getCOWORKPath(),
                activePaneTitle: record.sessionName,
                panes: [],
            };
        })
        .sort((a, b) => a.port - b.port);
};

const startCliSession = async (
    port: number,
    settings = currentCliSettings,
    options?: {
        sessionName?: string;
        preserveTmux?: boolean;
        attach?: boolean;
    }
) => {
    if (cliSessions.has(port)) {
        await stopCliSession(port);
        // Small delay to ensure port is released by the OS
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    const theme = JSON.stringify({
        background: settings.bgColor,
        foreground: '#ffffff',
        cursor: '#ffffff'
    });
    const sessionName = options?.sessionName ?? tmuxSessionNameForPort(port);
    const runningSession = readTmuxSessionStatus(sessionName);
    if (options?.attach && !runningSession) return null;

    const child = spawnTtydForTmux(port, [
        '-t', `fontSize=${settings.fontSize}`,
        '-t', `lineHeight=${settings.lineHeight}`,
        '-t', `theme=${theme}`,
        'tmux',
        ...(options?.attach
            ? ['attach', '-t', sessionName]
            : [
                'new-session',
                '-A',
                '-D',
                '-s',
                sessionName,
                '-n',
                'shell',
                '-c',
                getCOWORKPath(),
                'bash',
            ]),
    ]);
    if (!child) return null;

    cliSessions.set(port, { port, sessionName, process: child, preserveTmux: options?.preserveTmux ?? false });
    return port;
};

const startExternalTmuxSession = async (sessionName: string, settings = currentCliSettings) => {
    const existingRecord = Array.from(cliSessions.values()).find((record) => record.sessionName === sessionName);
    if (existingRecord) return existingRecord.port;

    const port = getNextCliPort();
    return startCliSession(port, settings, { sessionName, preserveTmux: true, attach: true });
};

const stopCliSession = async (port: number) => {
    const record = cliSessions.get(port);
    if (record) {
        if (!record.preserveTmux) {
            try {
                runTmux(['kill-session', '-t', record.sessionName]);
            } catch (e) {
                // Ignore missing or already-closed tmux sessions.
            }
        }

        try {
            // Kill the whole process group since ttyd keeps the browser terminal open.
            if (record.process.pid) {
                process.kill(-record.process.pid, 'SIGKILL');
            }
        } catch (e) {
            try {
                process.kill(record.process.pid!, 'SIGKILL');
            } catch (err) {}
        }
        cliSessions.delete(port);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
};

// API for CLI Sessions
app.get('/api/workspace/cli/sessions', (req, res) => {
    res.json({
        ports: Array.from(cliSessions.keys()),
        settings: currentCliSettings,
        sessions: collectCliSessionStatuses(),
        externalSessions: collectExternalTmuxSessionStatuses(),
    });
});

app.post('/api/workspace/cli/sessions', async (req, res) => {
    const port = getNextCliPort();
    const started = await startCliSession(port);
    if (started) {
        res.json({ port: started });
    } else {
        res.status(500).json({ error: 'Failed to start session' });
    }
});

app.post('/api/workspace/cli/external-sessions', async (req, res) => {
    const sessionName = String(req.body?.sessionName || '').trim();
    if (!sessionName) {
        res.status(400).json({ error: 'sessionName is required' });
        return;
    }

    const port = await startExternalTmuxSession(sessionName);
    if (port) {
        res.json({ port });
    } else {
        res.status(500).json({ error: 'Failed to open external tmux session' });
    }
});

app.post('/api/workspace/cli/settings', async (req, res) => {
    const settings = req.body;
    currentCliSettings = { ...currentCliSettings, ...settings };
    
    // Restart all sessions with new settings sequentially to avoid port race
    const activeRecords = Array.from(cliSessions.values());
    for (const record of activeRecords) {
        await startCliSession(record.port, currentCliSettings, {
            sessionName: record.sessionName,
            preserveTmux: record.preserveTmux,
            attach: record.preserveTmux,
        });
    }
    
    res.json({ success: true, settings: currentCliSettings });
});

app.delete('/api/workspace/cli/sessions/:port', async (req, res) => {
    const port = parseInt(req.params.port);
    await stopCliSession(port);
    res.json({ success: true });
});

app.post('/api/workspace/cli/sessions/kill', async (req, res) => {
    const sessionName = String(req.body?.sessionName || '').trim();
    if (!sessionName) {
        res.status(400).json({ error: 'sessionName is required' });
        return;
    }

    try {
        runTmux(['kill-session', '-t', sessionName]);
        
        // Also remove from managed sessions if exists
        const portRecord = Array.from(cliSessions.entries()).find(([, r]) => r.sessionName === sessionName);
        if (portRecord) {
            const [port] = portRecord;
            await stopCliSession(port);
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to kill tmux session' });
    }
});

const listAvailableMonitorFolders = (): string[] => {
    const basePath = getCOWORKPath();

    if (!fs.existsSync(basePath) || !fs.statSync(basePath).isDirectory()) {
        return [HOME_PATH];
    }

    const folders = new Set<string>([
        currentMonitorFolder,
        WORKSPACE_PATH,
        HOME_PATH,
    ]);

    if (GIT_ROOT) folders.add(GIT_ROOT);

    for (const quickFolder of [
        path.join(WORKSPACE_PATH, 'dashboard'),
        path.dirname(WORKSPACE_PATH),
    ]) {
        if (fs.existsSync(quickFolder) && fs.statSync(quickFolder).isDirectory()) {
            folders.add(quickFolder);
        }
    }

    const parentFolder = path.dirname(basePath);
    const relToHomeFromParent = path.relative(HOME_PATH, parentFolder);
    
    if (!relToHomeFromParent.startsWith('..')) {
        folders.add(parentFolder);
    }

    try {
        for (const entry of fs.readdirSync(basePath, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            if (shouldSkipDirectory(entry.name)) continue;
            
            const fullPath = path.join(basePath, entry.name);
            const relToHome = path.relative(HOME_PATH, fullPath);
            if (!relToHome.startsWith('..')) {
                folders.add(fullPath);
            }
        }
    } catch (e) {
        // ignore read errors
    }

    return Array.from(folders).sort((a, b) => {
        if (a === currentMonitorFolder) return -1;
        if (b === currentMonitorFolder) return 1;
        return a.localeCompare(b);
    });
};

const OPENCODE_METRIC_LABELS = ['Messages', 'Input Tokens', 'Output Tokens', 'Cache Read'] as const;

type OpencodeMetricLabel = (typeof OPENCODE_METRIC_LABELS)[number];

type OpencodeModelBlock = {
    name: string;
    metrics: Array<[OpencodeMetricLabel, string]>;
};

type OpencodeUsageRow = {
    model: string;
    messageValue: number;
    usageValue: number;
    message: string;
    inTokens: string;
    outTokens: string;
    cacheRead: string;
};

type OpencodeUsageSnapshot = {
    order: string[];
    models: Record<string, Partial<Record<OpencodeMetricLabel, string>>>;
};

type OpencodeUsageState = {
    rows: OpencodeUsageRow[];
    loading: boolean;
    updatedAt: string | null;
    error: string | null;
};

type StoredLink = {
    id: string;
    title: string;
    url: string;
    note: string;
    tag: string;
};

type LinkStore = {
    links: StoredLink[];
};

type FilePreviewKind = 'markdown' | 'text' | 'image' | 'pdf' | 'unknown';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdx']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.ico']);
const PDF_EXTENSIONS = new Set(['.pdf']);

const TEXT_EXTENSIONS = new Set([
    '.txt', '.log', '.json', '.jsonc', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    '.css', '.scss', '.sass', '.less', '.html', '.htm', '.xml', '.yaml', '.yml',
    '.toml', '.ini', '.env', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp',
    '.sh', '.bash', '.zsh', '.ps1', '.sql', '.csv', '.md', '.markdown', '.mdx'
]);

const detectPreviewKind = (filePath: string): FilePreviewKind => {
    const extension = path.extname(filePath).toLowerCase();
    if (MARKDOWN_EXTENSIONS.has(extension)) return 'markdown';
    if (IMAGE_EXTENSIONS.has(extension)) return 'image';
    if (PDF_EXTENSIONS.has(extension)) return 'pdf';
    if (TEXT_EXTENSIONS.has(extension)) return 'text';
    return 'unknown';
};

const mimeTypeForPath = (filePath: string): string => {
    const extension = path.extname(filePath).toLowerCase();
    switch (extension) {
        case '.md':
        case '.markdown':
        case '.mdx':
        case '.txt':
        case '.log':
        case '.json':
        case '.jsonc':
        case '.js':
        case '.jsx':
        case '.ts':
        case '.tsx':
        case '.mjs':
        case '.cjs':
        case '.css':
        case '.scss':
        case '.sass':
        case '.less':
        case '.html':
        case '.htm':
        case '.xml':
        case '.yaml':
        case '.yml':
        case '.toml':
        case '.ini':
        case '.env':
        case '.py':
        case '.go':
        case '.rs':
        case '.java':
        case '.c':
        case '.cpp':
        case '.h':
        case '.hpp':
        case '.sh':
        case '.bash':
        case '.zsh':
        case '.ps1':
        case '.sql':
        case '.csv':
            return 'text/plain; charset=utf-8';
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.gif':
            return 'image/gif';
        case '.webp':
            return 'image/webp';
        case '.bmp':
            return 'image/bmp';
        case '.svg':
            return 'image/svg+xml';
        case '.ico':
            return 'image/x-icon';
        case '.pdf':
            return 'application/pdf';
        default:
            return 'application/octet-stream';
    }
};

type FilePreviewResponse = {
    fileName: string;
    filePath: string;
    extension: string;
    kind: FilePreviewKind;
    mimeType: string;
    size: number;
    content?: string;
    dataUrl?: string;
};

const cleanBoxLine = (line: string) => line.replace(/^│\s*|\s*│$/g, '');

const parseMetric = (content: string): [OpencodeMetricLabel, string] | null => {
    for (const label of OPENCODE_METRIC_LABELS) {
        if (content.startsWith(label)) {
            return [label, content.slice(label.length).trim()];
        }
    }

    return null;
};

const extractModelBlocks = (text: string): OpencodeModelBlock[] => {
    const blocks: OpencodeModelBlock[] = [];
    let inModelSection = false;
    let awaitingModel = false;
    let currentName: string | null = null;
    let currentMetrics: Array<[OpencodeMetricLabel, string]> = [];

    for (const line of text.split('\n')) {
        if (!inModelSection) {
            if (line.includes('MODEL USAGE')) {
                inModelSection = true;
                awaitingModel = false;
            }

            continue;
        }

        if (line.startsWith('└')) {
            if (currentName !== null) {
                blocks.push({ name: currentName, metrics: currentMetrics });
            }
            break;
        }

        if (line.startsWith('├') || line.startsWith('┌')) {
            if (currentName !== null) {
                blocks.push({ name: currentName, metrics: currentMetrics });
                currentName = null;
                currentMetrics = [];
            }
            awaitingModel = true;
            continue;
        }

        if (!line.startsWith('│')) continue;

        const content = cleanBoxLine(line);
        if (!content) continue;

        if (awaitingModel) {
            currentName = content;
            currentMetrics = [];
            awaitingModel = false;
            continue;
        }

        if (currentName === null) continue;

        const metric = parseMetric(content);
        if (metric) currentMetrics.push(metric);
    }

    return blocks;
};

const parseMetricValue = (value: string): number | null => {
    const normalized = value.trim().replace(/,/g, '');
    if (!normalized || normalized === '-') return null;

    const stripped = normalized.startsWith('$') ? normalized.slice(1) : normalized;
    const match = stripped.match(/^([0-9]+(?:\.[0-9]+)?)([KMB])?$/i);
    if (!match) {
        const parsed = Number(stripped);
        return Number.isFinite(parsed) ? parsed : null;
    }

    const magnitude = Number(match[1]);
    const suffix = (match[2] ?? '').toUpperCase();
    const multiplier = {
        '': 1,
        K: 1_000,
        M: 1_000_000,
        B: 1_000_000_000,
    }[suffix] ?? 1;

    return magnitude * multiplier;
};

const buildOpencodeUsageSnapshot = (text: string): OpencodeUsageSnapshot => {
    const blocks = extractModelBlocks(text);

    return {
        order: blocks.map((block) => block.name),
        models: Object.fromEntries(
            blocks.map((block) => [block.name, Object.fromEntries(block.metrics)]),
        ),
    };
};

const formatMetricValue = (label: OpencodeMetricLabel, value: number): string => {
    if (label === 'Messages') {
        return value < 1 ? '0' : String(Math.round(value));
    }

    const absolute = Math.abs(value);
    if (absolute >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2);
};

const formatMessageValue = (value: number): string => (value < 1 ? '0' : formatMetricValue('Messages', value));

const opencodeBaselineModels: Record<string, Partial<Record<OpencodeMetricLabel, string>>> = {};
const opencodeUsageState: OpencodeUsageState = {
    rows: [],
    loading: true,
    updatedAt: null,
    error: null,
};
let opencodeUsageRefreshPromise: Promise<void> | null = null;
let opencodeWebProcess: ReturnType<typeof spawn> | null = null;
let opencodeBinaryPath: string | null = null;
const OPENCODE_WEB_HOST = '127.0.0.1';
const OPENCODE_WEB_PORT = Number(process.env.OPENCODE_WEB_PORT ?? 4096);
const LINK_STORE_PATH = path.resolve(__dirname, 'data/link-store.json');
const NOTES_DIR = path.resolve(__dirname, 'data/notes');
const EMPTY_LINK_STORE: LinkStore = { links: [] };

const ensureLinkStoreDir = () => {
    fs.mkdirSync(path.dirname(LINK_STORE_PATH), { recursive: true });
    fs.mkdirSync(NOTES_DIR, { recursive: true });
};

const normalizeStoredLink = (value: unknown): StoredLink | null => {
    if (!value || typeof value !== 'object') return null;

    const candidate = value as Partial<StoredLink>;
    if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string' || typeof candidate.url !== 'string') {
        return null;
    }

    return {
        id: candidate.id,
        title: candidate.title,
        url: candidate.url,
        note: typeof candidate.note === 'string' ? candidate.note : '',
        tag: typeof candidate.tag === 'string' ? (candidate.tag.trim() || 'General') : 'General',
    };
};

const readLinkStore = (): LinkStore => {
    try {
        if (!fs.existsSync(LINK_STORE_PATH)) {
            return EMPTY_LINK_STORE;
        }

        const raw = fs.readFileSync(LINK_STORE_PATH, 'utf-8').trim();
        if (!raw) return EMPTY_LINK_STORE;

        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { links?: unknown }).links)) {
            return EMPTY_LINK_STORE;
        }

        const links = ((parsed as { links: unknown[] }).links)
            .map((item) => normalizeStoredLink(item))
            .filter((item): item is StoredLink => item !== null)
            .map((item) => {
                const notePath = path.join(NOTES_DIR, `${item.id}.md`);
                if (fs.existsSync(notePath)) {
                    try {
                        const noteContent = fs.readFileSync(notePath, 'utf-8');
                        return { ...item, note: noteContent };
                    } catch (err) {
                        console.error(`Failed to read note file for ${item.id}:`, err);
                    }
                } else if (item.note) {
                    // Auto-migration: save note from JSON to separate file
                    try {
                        ensureLinkStoreDir();
                        fs.writeFileSync(notePath, item.note, 'utf-8');
                        console.log(`Migrated note for link ${item.id} to file.`);
                    } catch (err) {
                        console.error(`Failed to migrate note for ${item.id}:`, err);
                    }
                }
                return item;
            });

        return { links };
    } catch (error) {
        console.error('Link store read error:', error);
        return EMPTY_LINK_STORE;
    }
};

const writeLinkStore = (store: LinkStore): LinkStore => {
    ensureLinkStoreDir();

    // Map to save to JSON (strip notes to avoid duplication)
    const normalized: LinkStore = {
        links: store.links.map((item) => ({
            id: item.id,
            title: item.title,
            url: item.url,
            note: '', // Notes are stored in separate files
            tag: typeof item.tag === 'string' ? (item.tag.trim() || 'General') : 'General',
        })),
    };

    // Save individual note files
    const validIds = new Set(store.links.map((l) => `${l.id}.md`));
    for (const item of store.links) {
        try {
            const notePath = path.join(NOTES_DIR, `${item.id}.md`);
            fs.writeFileSync(notePath, item.note || '', 'utf-8');
        } catch (err) {
            console.error(`Failed to write note file for ${item.id}:`, err);
        }
    }

    // Cleanup notes for links that no longer exist
    try {
        const existingFiles = fs.readdirSync(NOTES_DIR);
        for (const file of existingFiles) {
            if (file.endsWith('.md') && !validIds.has(file)) {
                fs.unlinkSync(path.join(NOTES_DIR, file));
            }
        }
    } catch (err) {
        console.error('Failed to cleanup note files:', err);
    }

    const tempPath = `${LINK_STORE_PATH}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf-8');
    fs.renameSync(tempPath, LINK_STORE_PATH);
    return store;
};

const resolveOpencodeBinary = (): string => {
    if (opencodeBinaryPath) return opencodeBinaryPath;

    try {
        const resolved = execSync('command -v opencode', { cwd: WORKSPACE_PATH, encoding: 'utf8' }).trim();
        if (!resolved) {
            throw new Error('opencode binary not found in PATH');
        }

        opencodeBinaryPath = resolved;
        return resolved;
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to resolve opencode binary');
    }
};

const recordBaselineModels = (snapshot: OpencodeUsageSnapshot) => {
    for (const model of snapshot.order) {
        if (!opencodeBaselineModels[model]) {
            opencodeBaselineModels[model] = { ...(snapshot.models[model] ?? {}) };
        }
    }
};

const subtractSnapshot = (current: OpencodeUsageSnapshot): OpencodeUsageRow[] => {
    return current.order.map((model) => {
        const currentMetrics = current.models[model] ?? {};
        const baselineMetrics = opencodeBaselineModels[model] ?? currentMetrics;

        const currentMessages = parseMetricValue(currentMetrics.Messages ?? '') ?? 0;
        const baselineMessages = parseMetricValue(baselineMetrics.Messages ?? '') ?? 0;
        const currentInput = parseMetricValue(currentMetrics['Input Tokens'] ?? '') ?? 0;
        const baselineInput = parseMetricValue(baselineMetrics['Input Tokens'] ?? '') ?? 0;
        const currentOutput = parseMetricValue(currentMetrics['Output Tokens'] ?? '') ?? 0;
        const baselineOutput = parseMetricValue(baselineMetrics['Output Tokens'] ?? '') ?? 0;
        const currentCache = parseMetricValue(currentMetrics['Cache Read'] ?? '') ?? 0;
        const baselineCache = parseMetricValue(baselineMetrics['Cache Read'] ?? '') ?? 0;

        const message = Math.max(0, currentMessages - baselineMessages);
        const inTokens = Math.max(0, currentInput - baselineInput);
        const outTokens = Math.max(0, currentOutput - baselineOutput);
        const cacheRead = Math.max(0, currentCache - baselineCache);

        return {
            model,
            messageValue: message,
            usageValue: message + inTokens + outTokens + cacheRead,
            message: formatMessageValue(message),
            inTokens: formatMetricValue('Input Tokens', inTokens),
            outTokens: formatMetricValue('Output Tokens', outTokens),
            cacheRead: formatMetricValue('Cache Read', cacheRead),
        };
    });
};
const runOpencodeStatsCommand = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        execFile('opencode', ['stats', '--models'], { cwd: WORKSPACE_PATH, encoding: 'utf8' }, (error: Error | null, stdout: string, stderr: string) => {
            if (error) {
                reject(new Error(stderr || error.message || 'Failed to collect opencode stats'));
                return;
            }

            resolve(stdout);
        });
    });
};

const refreshOpencodeUsageState = async (): Promise<void> => {
    if (opencodeUsageRefreshPromise) {
        return opencodeUsageRefreshPromise;
    }

    opencodeUsageRefreshPromise = (async () => {
        try {
            const output = await runOpencodeStatsCommand();
            const snapshot = buildOpencodeUsageSnapshot(output);
            recordBaselineModels(snapshot);
            const rows = subtractSnapshot(snapshot).sort((a, b) => b.messageValue - a.messageValue);

            opencodeUsageState.rows = rows;
            opencodeUsageState.loading = false;
            opencodeUsageState.updatedAt = new Date().toISOString();
            opencodeUsageState.error = null;
        } catch (error) {
            opencodeUsageState.error = error instanceof Error ? error.message : 'Failed to read opencode usage';
            opencodeUsageState.loading = opencodeUsageState.rows.length === 0;
        } finally {
            opencodeUsageRefreshPromise = null;
        }
    })();

    return opencodeUsageRefreshPromise;
};

const getOpencodeWebUrl = (): string => `http://${OPENCODE_WEB_HOST}:${OPENCODE_WEB_PORT}`;

const launchOpencodeWeb = (): { alreadyRunning: boolean; pid: number | undefined; url: string } => {
    if (opencodeWebProcess && opencodeWebProcess.exitCode === null && !opencodeWebProcess.killed) {
        return { alreadyRunning: true, pid: opencodeWebProcess.pid ?? undefined, url: getOpencodeWebUrl() };
    }

    const opencodeBinary = resolveOpencodeBinary();
    const child = spawn(opencodeBinary, ['web', '--hostname', OPENCODE_WEB_HOST, '--port', String(OPENCODE_WEB_PORT)], {
        cwd: WORKSPACE_PATH,
        detached: true,
        stdio: 'ignore',
    });

    child.unref();
    opencodeWebProcess = child;
    child.on('exit', () => {
        if (opencodeWebProcess === child) {
            opencodeWebProcess = null;
        }
    });

    return { alreadyRunning: false, pid: child.pid ?? undefined, url: getOpencodeWebUrl() };
};

void refreshOpencodeUsageState();
setInterval(() => {
    void refreshOpencodeUsageState();
}, 30000);

// GET config (to tell frontend what folder we are monitoring)
app.get('/api/workspace/config', (req, res) => {
    res.json({ 
        monitorFolder: currentMonitorFolder, 
        availableFolders: listAvailableMonitorFolders(),
        excludeFolders: currentExcludeFolders
    });
});

app.put('/api/workspace/config', (req, res) => {
    const { monitorFolder, excludeFolders } = req.body ?? {};
    
    if (typeof monitorFolder === 'string') {
        const normalized = normalizeMonitorFolder(monitorFolder);
        if (normalized !== null) {
            currentMonitorFolder = normalized;
        }
    }

        if (Array.isArray(excludeFolders)) {
            currentExcludeFolders = Array.from(new Set(
                excludeFolders.map(f => String(f).trim()).filter(Boolean)
            ));
        }

    saveConfig();

    res.json({ 
        monitorFolder: currentMonitorFolder, 
        availableFolders: listAvailableMonitorFolders(),
        excludeFolders: currentExcludeFolders
    });
});

// Helper to get git status of files
const getGitStatus = (baseDir: string) => {
    const gitRoot = findGitRoot(baseDir);
    if (!gitRoot) {
        return {};
    }

    try {
        const output = execSync('git status --porcelain=v1 -uall', { cwd: gitRoot }).toString();
        const statusMap: Record<string, string> = {};
        
        output.split('\n').forEach(line => {
            if (!line) return;
            const status = line.substring(0, 2).trim() || line.substring(0, 2);
            const filePath = line.substring(3).trim();
            const fullPath = path.resolve(gitRoot, filePath);
            statusMap[fullPath] = status;
        });
        
        return statusMap;
    } catch (error) {
        return {};
    }
};

// GET folders
app.get('/api/workspace/folders', (req, res) => {
    try {
        const coworkPath = getCOWORKPath();
        const targetRelative = typeof req.query.folder === 'string' ? req.query.folder : '.';
        const targetPath = path.resolve(coworkPath, targetRelative);

        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ error: 'Directory not found' });
        }
        
        const subfolders = fs.readdirSync(targetPath, { withFileTypes: true })
            .filter(entry => {
                if (!entry.isDirectory()) return false;
                return !shouldSkipDirectory(entry.name);
            })
            .map(entry => {
                const relativePath = path.relative(coworkPath, path.join(targetPath, entry.name));
                return relativePath;
            });
        
        // Always include the current directory itself
        res.json(['.', ...subfolders]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read folders' });
    }
});

// GET files in a folder (recursive)
app.get('/api/workspace/files', (req, res) => {
    const { folder } = req.query;
    if (!folder) return res.status(400).json({ error: 'Folder query param required' });
    
    const monitorRoot = getCOWORKPath();
    const folderPath = path.isAbsolute(folder as string) ? (folder as string) : path.resolve(monitorRoot, folder as string);

    if (isHomeDirectory(monitorRoot)) {
        return res.json([]);
    }
    
    // Check home directory boundary
    const relativeToHome = path.relative(HOME_PATH, folderPath);
    if (relativeToHome.startsWith('..')) {
        return res.status(403).json({ error: 'Folder outside allowed area' });
    }

    if (!fs.existsSync(folderPath)) return res.status(404).json({ error: 'Folder not found' });
    
    try {
        const gitStatus = getGitStatus(folderPath);
        const fileList: any[] = [];
        
        const scanDir = (dir: string) => {
            let entries: fs.Dirent[];
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch {
                return;
            }

            for (const entry of entries) {
                if (fileList.length >= MAX_SCAN_FILES) return;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (shouldSkipDirectory(entry.name)) {
                        continue;
                    }
                    scanDir(fullPath);
                    if (fileList.length >= MAX_SCAN_FILES) return;
                } else {
                    const folderRelativePath = path.relative(folderPath, fullPath);
                        fileList.push({
                            name: entry.name,
                            path: folderRelativePath,
                            status: gitStatus[fullPath] || 'none'
                        });
                }
            }
        };
        
        scanDir(folderPath);
        res.json(fileList);
    } catch (error) {
        console.error('File read error:', error);
        res.status(500).json({ error: 'Failed to read files' });
    }
});

// Load initial config
readConfig();

// GET change history grouped by date
app.get('/api/workspace/history', (req, res) => {
    try {
        const monitorPath = getCOWORKPath();
        if (!fs.existsSync(monitorPath)) {
            return res.json([]);
        }

        if (isHomeDirectory(monitorPath)) {
            return res.json([]);
        }

        const files: { name: string; path: string; mtime: Date }[] = [];
        
        const scan = (dir: string) => {
            let entries: fs.Dirent[];
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch {
                return;
            }

            for (const entry of entries) {
                if (files.length >= MAX_SCAN_FILES) return;
                const fullPath = path.join(dir, entry.name);
                const folderName = entry.name;

                if (entry.isDirectory()) {
                    if (shouldSkipDirectory(folderName)) {
                        continue;
                    }

                    scan(fullPath);
                    if (files.length >= MAX_SCAN_FILES) return;
                } else {
                    try {
                        const stats = fs.statSync(fullPath);
                        files.push({
                            name: entry.name,
                            path: path.relative(currentMonitorFolder, fullPath),
                            mtime: stats.mtime
                        });
                    } catch (e) {
                        // Skip files that can't be accessed
                    }
                }
            }
        };

        scan(monitorPath);

        // Group by date (YYYY-MM-DD)
        const grouped: Record<string, { name: string; path: string; status: string }[]> = {};
        files.forEach(f => {
            const dateParts = f.mtime.toISOString().split('T');
            const date = dateParts[0];
            if (date) {
                if (!grouped[date]) {
                    grouped[date] = [];
                }
                
                // Avoid duplicate paths
                const dateEntries = grouped[date];
                if (!dateEntries.some((item: { path: string }) => item.path === f.path)) {
                    dateEntries.push({
                        name: f.name,
                        path: f.path,
                        status: 'none'
                    });
                }
            }
        });

        // Convert to array and sort by date descending
        const historyList = Object.entries(grouped)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, dateFiles]) => ({
                date,
                files: dateFiles.sort((a, b) => a.name.localeCompare(b.name))
            }))
            .slice(0, 30); // Last 30 unique modification dates

        res.json(historyList);
    } catch (error) {
        console.error('History read error:', error);
        res.status(500).json({ error: 'Failed to read file history' });
    }
});

// GET traceability graph
app.get('/api/workspace/traceability', (req, res) => {
    try {
        const { nodes, edges } = parseTraceability(getCOWORKPath());
        const mermaid = generateMermaid(nodes, edges);
        res.json({ nodes, edges, mermaid });
    } catch (error) {
        console.error('Traceability error:', error);
        res.status(500).json({ error: 'Failed to parse traceability' });
    }
});

app.get('/api/workspace/opencode-usage', (req, res) => {
    res.json({
        capturedAt: opencodeUsageState.updatedAt,
        loading: opencodeUsageState.loading,
        error: opencodeUsageState.error,
        rows: opencodeUsageState.rows,
    });
});

app.get('/api/workspace/links', (req, res) => {
    res.json(readLinkStore());
});

app.get('/api/workspace/links/:id/note', (req, res) => {
    try {
        const { id } = req.params;
        const notePath = path.join(NOTES_DIR, `${id}.md`);
        if (fs.existsSync(notePath)) {
            const noteContent = fs.readFileSync(notePath, 'utf-8');
            res.json({ note: noteContent });
        } else {
            res.json({ note: '' });
        }
    } catch (error) {
        console.error('Note read error:', error);
        res.status(500).json({ error: 'Failed to read note file' });
    }
});

app.put('/api/workspace/links', (req, res) => {
    try {
        const rawLinks = req.body?.links;
        if (!Array.isArray(rawLinks)) {
            return res.status(400).json({ error: 'links must be an array' });
        }

        const links = rawLinks
            .map((item) => normalizeStoredLink(item))
            .filter((item): item is StoredLink => item !== null);

        const saved = writeLinkStore({ links });
        res.json(saved);
    } catch (error) {
        console.error('Link store write error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save links' });
    }
});

app.post('/api/workspace/opencode-web', (req, res) => {
    try {
        const result = launchOpencodeWeb();
        res.json({
            started: true,
            alreadyRunning: result.alreadyRunning,
            pid: result.pid,
            url: result.url,
            message: result.alreadyRunning
                ? 'OpenCode Web is already running.'
                : 'OpenCode Web is starting in the background.',
        });
    } catch (error) {
        console.error('OpenCode Web launch error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to start OpenCode Web',
        });
    }
});

// GET file content
app.get('/api/workspace/content', (req, res) => {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'File path required' });
    
    // Safety check: ensure path is within the monitored folder
    const fullPath = path.resolve(WORKSPACE_PATH, filePath as string);
    if (!isWithinPath(fullPath, getCOWORKPath())) {
        return res.status(403).json({ error: `Access denied: outside ${currentMonitorFolder}` });
    }
    
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found' });
    
    try {
        const stat = fs.statSync(fullPath);
        const extension = path.extname(fullPath).toLowerCase();
        const kind = detectPreviewKind(fullPath);
        const mimeType = mimeTypeForPath(fullPath);
        const baseResponse: FilePreviewResponse = {
            fileName: path.basename(fullPath),
            filePath: String(filePath),
            extension,
            kind,
            mimeType,
            size: stat.size,
        };

        if (kind === 'image' || kind === 'pdf') {
            const buffer = fs.readFileSync(fullPath);
            res.json({
                ...baseResponse,
                dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
            });
            return;
        }

        if (kind === 'markdown' || kind === 'text' || kind === 'unknown') {
            const content = fs.readFileSync(fullPath, 'utf-8');
            res.json({
                ...baseResponse,
                content,
            });
            return;
        }

        res.json(baseResponse);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read file content' });
    }
});

// Port status check endpoint (for monitor iframes)
app.get('/api/port-status', (req, res) => {
    const port = parseInt(req.query.port as string);
    if (!port || port < 1 || port > 65535) {
        return res.status(400).json({ error: 'Invalid port' });
    }
    const socket = new net.Socket();
    const timeout = 500;
    let open = false;
    socket.setTimeout(timeout);
    socket.on('connect', () => { open = true; socket.destroy(); });
    socket.on('timeout', () => { socket.destroy(); });
    socket.on('error', () => { socket.destroy(); });
    socket.on('close', () => { res.json({ port, open }); });
    socket.connect(port, '127.0.0.1');
});

// Fallback 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
