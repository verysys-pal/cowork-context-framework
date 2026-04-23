import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { execFile, execSync } from 'child_process';
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
let currentMonitorFolder = process.env.MONITOR_FOLDER || '.cowork';

const getCOWORKPath = () => path.join(WORKSPACE_PATH, currentMonitorFolder);

const normalizeMonitorFolder = (folder: string): string | null => {
    const normalized = folder.trim();
    if (!normalized) return null;

    const resolved = path.resolve(WORKSPACE_PATH, normalized);
    const relative = path.relative(WORKSPACE_PATH, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) return null;

    return relative || '.';
};

const listAvailableMonitorFolders = (): string[] => {
    const entries = fs.readdirSync(WORKSPACE_PATH, { withFileTypes: true });
    return ['.', ...entries.filter((entry) => entry.isDirectory() && entry.name !== 'node_modules').map((entry) => entry.name).sort((a, b) => a.localeCompare(b))];
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
        execFile('opencode', ['stats', '--models'], { cwd: WORKSPACE_PATH, encoding: 'utf8' }, (error, stdout, stderr) => {
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

void refreshOpencodeUsageState();
setInterval(() => {
    void refreshOpencodeUsageState();
}, 30000);

// GET config (to tell frontend what folder we are monitoring)
app.get('/api/workspace/config', (req, res) => {
    res.json({ monitorFolder: currentMonitorFolder, availableFolders: listAvailableMonitorFolders() });
});

app.put('/api/workspace/config', (req, res) => {
    const { monitorFolder } = req.body ?? {};
    if (typeof monitorFolder !== 'string') {
        return res.status(400).json({ error: 'monitorFolder must be a string' });
    }

    const normalized = normalizeMonitorFolder(monitorFolder);
    if (normalized === null) {
        return res.status(400).json({ error: 'Invalid monitor folder' });
    }

    currentMonitorFolder = normalized;
    res.json({ monitorFolder: currentMonitorFolder, availableFolders: listAvailableMonitorFolders() });
});

// Helper to get git status of files
const getGitStatus = (dir: string) => {
    try {
        const output = execSync('git status --porcelain', { cwd: WORKSPACE_PATH }).toString();
        const statusMap: Record<string, string> = {};
        
        output.split('\n').forEach(line => {
            if (!line) return;
            const status = line.substring(0, 2).trim();
            const filePath = line.substring(3).trim();
            statusMap[filePath] = status;
        });
        
        return statusMap;
    } catch (error) {
        console.error('Git status error:', error);
        return {};
    }
};

// GET folders
app.get('/api/workspace/folders', (req, res) => {
    try {
        const coworkPath = getCOWORKPath();
        if (!fs.existsSync(coworkPath)) {
            return res.status(404).json({ error: '.cowork folder not found' });
        }
        
        const subfolders = fs.readdirSync(coworkPath)
            .filter(file => fs.statSync(path.join(coworkPath, file)).isDirectory());
        
        // Always include the root directory itself to view top-level files
        res.json(['.', ...subfolders]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read folders' });
    }
});

// GET files in a folder (recursive)
app.get('/api/workspace/files', (req, res) => {
    const { folder } = req.query;
    if (!folder) return res.status(400).json({ error: 'Folder query param required' });
    
    const folderPath = path.join(getCOWORKPath(), folder as string);
    if (!fs.existsSync(folderPath)) return res.status(404).json({ error: 'Folder not found' });
    
    try {
        const gitStatus = getGitStatus(WORKSPACE_PATH);
        const fileList: any[] = [];
        
        const scanDir = (dir: string) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    scanDir(fullPath);
                } else {
                    const relativePath = path.relative(WORKSPACE_PATH, fullPath);
                    const folderRelativePath = path.relative(folderPath, fullPath);
                    fileList.push({
                        name: entry.name,
                        path: folderRelativePath,
                        status: gitStatus[relativePath] || 'none'
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

// GET change history grouped by date
app.get('/api/workspace/history', (req, res) => {
    try {
        // Get git log with date and changed files
        const output = execSync('git log --date=short --pretty=format:"COMMIT:%ad" --name-status', { cwd: WORKSPACE_PATH }).toString();
        
        const history: Record<string, Map<string, { name: string; path: string; status: string }>> = {};
        let currentDate = '';
        
        output.split('\n').forEach(line => {
            if (line.startsWith('COMMIT:')) {
                currentDate = line.replace('COMMIT:', '');
                if (!history[currentDate]) history[currentDate] = new Map();
            } else if (line && currentDate) {
                const [status, filePath] = line.split('\t');
                if (!status || !filePath) {
                    return;
                }
                const dateEntries = history[currentDate];
                if (filePath && dateEntries) {
                    if (currentMonitorFolder === '.' || filePath.startsWith(currentMonitorFolder)) {
                        if (!dateEntries.has(filePath)) {
                            dateEntries.set(filePath, {
                                name: path.basename(filePath),
                                path: filePath,
                                status: status // 'M', 'A', 'D'
                            });
                        }
                    }
                }
            }
        });
        
        // Convert to array and filter out empty dates
        const result = Object.entries(history)
            .filter(([_, files]) => files.size > 0)
            .map(([date, files]) => ({ date, files: Array.from(files.values()) }))
            .sort((a, b) => b.date.localeCompare(a.date));
        
        res.json(result);
    } catch (error) {
        console.error('Git log error:', error);
        res.status(500).json({ error: 'Failed to read history' });
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

// GET file content
app.get('/api/workspace/content', (req, res) => {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'File path required' });
    
    // Safety check: ensure path is within the monitored folder
    const fullPath = path.join(WORKSPACE_PATH, filePath as string);
    if (!fullPath.startsWith(getCOWORKPath())) {
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

// Fallback 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
