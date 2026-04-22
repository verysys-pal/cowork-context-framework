import { useState, useEffect } from 'react'
import Mermaid from './components/Mermaid'
import MarkdownPreview from './components/MarkdownPreview'
import './App.css'

interface GitFile {
  name: string;
  status: string;
  path?: string;
  fullName?: string;
}

interface HistoryItem {
  date: string;
  files: GitFile[];
}

function App() {
  const [folders, setFolders] = useState<string[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null)
  const [files, setFiles] = useState<GitFile[]>([])
  const [viewMode, setViewMode] = useState<'folder' | 'history' | 'traceability'>('folder')
  const [mermaidChart, setMermaidChart] = useState<string>('')
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [previewFileName, setPreviewFileName] = useState<string | null>(null)
  const [monitorFolder, setMonitorFolder] = useState<string>('.cowork')

  const API_BASE = 'http://localhost:3002/api/workspace'

  useEffect(() => {
    const handleFetchErr = async (res: Response, endpoint: string) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (err) {
        console.error(`Received invalid JSON from ${endpoint}:`, text.slice(0, 100));
        throw new Error(`Expected JSON, got: ${text.slice(0, 50)}`);
      }
    };

    fetch(`${API_BASE}/config`)
      .then(res => handleFetchErr(res, '/config'))
      .then(data => setMonitorFolder(data.monitorFolder))
      .catch(err => console.error('Fetch config error:', err))

    fetch(`${API_BASE}/folders`)
      .then(res => handleFetchErr(res, '/folders'))
      .then(data => {
        if (Array.isArray(data)) setFolders(data)
        else console.error('Failed to load folders:', data)
      })
      .catch(err => console.error('Fetch folders error:', err))

    fetch(`${API_BASE}/history`)
      .then(res => handleFetchErr(res, '/history'))
      .then(data => {
        if (Array.isArray(data)) setHistory(data)
        else console.error('Failed to load history:', data)
      })
      .catch(err => console.error('Fetch history error:', err))
  }, [])

  const handleFolderSelect = (folder: string) => {
    setSelectedFolder(folder)
    setSelectedHistory(null)
    setViewMode('folder')
    setPreviewContent(null)
    fetch(`${API_BASE}/files?folder=${folder}`)
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        return JSON.parse(text);
      })
      .then(data => {
        if (Array.isArray(data)) setFiles(data)
        else {
          console.error('Failed to load files:', data)
          setFiles([])
        }
      })
      .catch(err => {
        console.error('Fetch files error:', err)
        setFiles([])
      })
  }

  const handleHistorySelect = (item: HistoryItem) => {
    setSelectedHistory(item)
    setSelectedFolder(null)
    setViewMode('history')
    setPreviewContent(null)
    setFiles(item.files)
  }

  const handleTraceability = () => {
    setViewMode('traceability')
    setSelectedFolder(null)
    setSelectedHistory(null)
    setPreviewContent(null)
    fetch(`${API_BASE}/traceability`)
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        return JSON.parse(text);
      })
      .then(data => setMermaidChart(data.mermaid))
      .catch(err => {
        console.error('Traceability fetch error:', err);
        setMermaidChart('graph TD\n  Error["Failed to load graph"]');
      })
  }

  const handleFileClick = (file: GitFile) => {
    let filePath = '';
    if (viewMode === 'folder' && selectedFolder) {
      filePath = `${monitorFolder}/${selectedFolder}/${file.path || file.name}`;
    } else {
      filePath = file.path || '';
    }

    if (!filePath) return;

    fetch(`${API_BASE}/content?path=${encodeURIComponent(filePath)}`)
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        return JSON.parse(text);
      })
      .then(data => {
        setPreviewContent(data.content)
        setPreviewFileName(file.name)
      })
      .catch(err => {
        console.error('Content fetch error:', err);
        setPreviewContent(`Error loading file: ${err.message}`);
      })
  }

  return (
    <div className={`app-container ${previewContent ? 'has-preview' : ''}`}>
      {/* 1st Column: Folders */}
      <div className="sidebar">
        <div className="sidebar-title">Project Structure</div>
        {folders.map(folder => (
          <div 
            key={folder} 
            className={`nav-item ${selectedFolder === folder ? 'active' : ''}`}
            onClick={() => handleFolderSelect(folder)}
          >
            📁 {folder}
          </div>
        ))}
        <div style={{ marginTop: 'auto' }} className="nav-item">
          📊 Progress Overview
        </div>
        <div 
          className={`nav-item ${viewMode === 'traceability' ? 'active' : ''}`}
          onClick={handleTraceability}
        >
          🕸️ Traceability Map
        </div>
      </div>

      {/* 2nd Column: History */}
      <div className="sidebar" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
        <div className="sidebar-title">Recent Changes</div>
        {history.map(item => (
          <div 
            key={item.date} 
            className={`nav-item ${selectedHistory?.date === item.date ? 'active' : ''}`}
            onClick={() => handleHistorySelect(item)}
          >
            📅 {item.date} ({item.files.length})
          </div>
        ))}
      </div>

      {/* 3rd Column: Main Content */}
      <div className="main-content">
        <div className="dashboard-header">
          <h1>{viewMode === 'folder' ? `Folder: ${selectedFolder}` : 
               viewMode === 'history' ? `Changed on ${selectedHistory?.date}` : 
               'Traceability Map'}</h1>
          <p>{viewMode === 'traceability' ? 'Visualizing organic connections between project Registry files' : 
              'Monitoring local file system and git state'}</p>
        </div>

        {viewMode === 'traceability' ? (
          mermaidChart ? <Mermaid chart={mermaidChart} /> : <div>Loading graph...</div>
        ) : (
          <div className="folder-grid">
            {Object.entries(
              files.reduce((groups: Record<string, GitFile[]>, file) => {
                const dir = file.path?.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '.';
                if (!groups[dir]) groups[dir] = [];
                groups[dir].push(file);
                return groups;
              }, {})
            ).sort(([a], [b]) => a === '.' ? -1 : b === '.' ? 1 : a.localeCompare(b))
            .map(([dir, dirFiles]) => (
              <div key={dir} className="folder-card">
                <div className="folder-header">
                  <span className="folder-icon">📂</span>
                  <span className="folder-name">{dir === '.' ? '(root)' : dir}</span>
                  <span className="file-count">{dirFiles.length}</span>
                </div>
                <div className="folder-file-list">
                  {dirFiles.map(file => (
                    <div 
                      key={file.path || file.name} 
                      className="folder-file-item clickable"
                      onClick={() => handleFileClick(file)}
                    >
                      <div className="file-main">
                        <span className="small-file-icon">📄</span>
                        <span className="small-file-name">{file.name}</span>
                      </div>
                      <div className={`mini-status status-${file.status}`}>
                        {file.status === 'none' ? '' : file.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {files.length === 0 && !selectedFolder && !selectedHistory && (
              <div style={{ textAlign: 'center', width: '100%', padding: '100px', color: 'var(--text-muted)' }}>
                Select a folder or date to view file statuses.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4th Column: Preview */}
      {previewContent && (
        <div className="preview-pane">
          <MarkdownPreview 
            content={previewContent} 
            fileName={previewFileName || ''} 
            onClose={() => setPreviewContent(null)} 
          />
        </div>
      )}
    </div>
  )
}

export default App
