import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
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
const MONITOR_FOLDER = process.env.MONITOR_FOLDER || '.cowork';
const COWORK_PATH = path.join(WORKSPACE_PATH, MONITOR_FOLDER);

// GET config (to tell frontend what folder we are monitoring)
app.get('/api/workspace/config', (req, res) => {
    res.json({ monitorFolder: MONITOR_FOLDER });
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
        if (!fs.existsSync(COWORK_PATH)) {
            return res.status(404).json({ error: '.cowork folder not found' });
        }
        
        const subfolders = fs.readdirSync(COWORK_PATH)
            .filter(file => fs.statSync(path.join(COWORK_PATH, file)).isDirectory());
        
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
    
    const folderPath = path.join(COWORK_PATH, folder as string);
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
        
        const history: Record<string, any[]> = {};
        let currentDate = '';
        
        output.split('\n').forEach(line => {
            if (line.startsWith('COMMIT:')) {
                currentDate = line.replace('COMMIT:', '');
                if (!history[currentDate]) history[currentDate] = [];
            } else if (line && currentDate) {
                const [status, filePath] = line.split('\t');
                const dateEntries = history[currentDate];
                if (filePath && dateEntries) {
                    if (filePath.startsWith(MONITOR_FOLDER)) {
                        dateEntries.push({
                            name: path.basename(filePath),
                            path: filePath,
                            status: status // 'M', 'A', 'D'
                        });
                    }
                }
            }
        });
        
        // Convert to array and filter out empty dates
        const result = Object.entries(history)
            .filter(([_, files]) => files.length > 0)
            .map(([date, files]) => ({ date, files }))
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
        const { nodes, edges } = parseTraceability(COWORK_PATH);
        const mermaid = generateMermaid(nodes, edges);
        res.json({ nodes, edges, mermaid });
    } catch (error) {
        console.error('Traceability error:', error);
        res.status(500).json({ error: 'Failed to parse traceability' });
    }
});

// GET file content
app.get('/api/workspace/content', (req, res) => {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'File path required' });
    
    // Safety check: ensure path is within the monitored folder
    const fullPath = path.join(WORKSPACE_PATH, filePath as string);
    if (!fullPath.startsWith(COWORK_PATH)) {
        return res.status(403).json({ error: `Access denied: outside ${MONITOR_FOLDER}` });
    }
    
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found' });
    
    try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        res.json({ content });
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
