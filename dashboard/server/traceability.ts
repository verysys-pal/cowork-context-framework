import fs from 'fs';
import path from 'path';

interface Node {
    id: string;
    label: string;
    type: 'intent' | 'milestone' | 'task' | 'adr';
}

interface Edge {
    source: string;
    target: string;
}

export const parseTraceability = (coworkPath: string) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const scanDirectory = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                scanDirectory(fullPath);
            } else if (entry.name.endsWith('.md')) {
                parseFile(fullPath);
            }
        }
    };

    const parseFile = (filePath: string) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        
        let inTable = false;
        lines.forEach(line => {
            // Detect table header with | ID |
            if (line.includes('|') && line.includes('ID')) {
                inTable = true;
                return;
            }
            // Parse table rows
            if (inTable && line.trim().startsWith('|') && !line.includes('---')) {
                const parts = line.split('|').map(p => p.trim());
                if (parts.length < 3) {
                    // Maybe table ended
                    if (line.trim() === '') inTable = false;
                    return;
                }
                
                const id = parts[1] || '';
                const label = parts[2] || '';
                
                // Identify node type by ID prefix
                let type: Node['type'] | null = null;
                if (id.startsWith('INT-')) type = 'intent';
                else if (id.startsWith('MS-')) type = 'milestone';
                else if (id.startsWith('TASK-')) type = 'task';
                else if (id.startsWith('ADR-')) type = 'adr';
                else if (id.startsWith('RULE-')) type = 'task'; // Rules treated as tasks for styling
                
                if (id && type) {
                    nodes.push({ id, label, type });
                    
                    // Extract references from all columns
                    parts.forEach(part => {
                        const refs = part.match(/(INT|MS|TASK|ADR|RULE)-[a-zA-Z0-9_]+/g);
                        if (refs) {
                            refs.forEach(ref => {
                                if (ref !== id) {
                                    edges.push({ source: id, target: ref });
                                }
                            });
                        }
                    });
                }
            } else if (line.trim() === '') {
                inTable = false;
            }
        });
    };

    if (fs.existsSync(coworkPath)) {
        scanDirectory(coworkPath);
    }

    return { nodes, edges };
};

export const generateMermaid = (nodes: Node[], edges: Edge[]) => {
    let mermaid = 'graph TD\n';
    
    // Style classes
    mermaid += '  classDef intent fill:#6366f1,stroke:#fff,stroke-width:2px,color:#fff\n';
    mermaid += '  classDef milestone fill:#10b981,stroke:#fff,stroke-width:2px,color:#fff\n';
    mermaid += '  classDef task fill:#3b82f6,stroke:#fff,stroke-width:2px,color:#fff\n';
    mermaid += '  classDef adr fill:#f59e0b,stroke:#fff,stroke-width:2px,color:#fff\n';

    nodes.forEach(node => {
        mermaid += `  ${node.id}["${node.id}: ${node.label}"]\n`;
        mermaid += `  class ${node.id} ${node.type}\n`;
    });

    edges.forEach(edge => {
        mermaid += `  ${edge.source} --> ${edge.target}\n`;
    });

    return mermaid;
};
