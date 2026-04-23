import { useState, useEffect, useRef, useCallback } from 'react'
import Mermaid from './components/Mermaid'
import FilePreview from './components/FilePreview'
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

interface WorkspaceConfig {
  monitorFolder: string;
  availableFolders?: string[];
}

interface FilePreviewData {
  fileName: string;
  filePath: string;
  extension: string;
  kind: 'markdown' | 'text' | 'image' | 'pdf' | 'unknown';
  mimeType: string;
  size: number;
  content?: string;
  dataUrl?: string;
}

interface OpencodeUsageRow {
  model: string;
  messageValue: number;
  usageValue: number;
  message: string;
  inTokens: string;
  outTokens: string;
  cacheRead: string;
}

function App() {
  const [folders, setFolders] = useState<string[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null)
  const [files, setFiles] = useState<GitFile[]>([])
  const [viewMode, setViewMode] = useState<'folder' | 'history' | 'traceability' | 'opencodeUsage'>('folder')
  const [mermaidChart, setMermaidChart] = useState<string>('')
  const [previewFile, setPreviewFile] = useState<FilePreviewData | null>(null)
  const [monitorFolder, setMonitorFolder] = useState<string>('.cowork')
  const [selectedMonitorFolder, setSelectedMonitorFolder] = useState<string>('.cowork')
  const [availableMonitorFolders, setAvailableMonitorFolders] = useState<string[]>([])
  const [monitorFolderUpdating, setMonitorFolderUpdating] = useState(false)
  const [monitorFolderError, setMonitorFolderError] = useState<string | null>(null)
  const [opencodeUsage, setOpencodeUsage] = useState<OpencodeUsageRow[]>([])
  const [opencodeUsageLoading, setOpencodeUsageLoading] = useState(true)
  const [opencodeUsageRefreshing, setOpencodeUsageRefreshing] = useState(false)
  const [opencodeUsageError, setOpencodeUsageError] = useState<string | null>(null)
  const opencodeUsageLoadedRef = useRef(false)

  const API_BASE = 'http://localhost:3002/api/workspace'

  const fetchJson = useCallback(async (endpoint: string) => {
    const res = await fetch(`${API_BASE}${endpoint}`)
    const text = await res.text()
    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`
      try {
        const parsed = JSON.parse(text)
        if (parsed?.error) errorMessage = parsed.error
      } catch {
        // Keep HTTP error message.
      }
      throw new Error(errorMessage)
    }

    return JSON.parse(text)
  }, [API_BASE])

  const loadWorkspaceData = useCallback(async () => {
    const [configData, foldersData, historyData] = await Promise.all([
      fetchJson('/config') as Promise<WorkspaceConfig>,
      fetchJson('/folders'),
      fetchJson('/history'),
    ])

    return { configData, foldersData, historyData }
  }, [fetchJson])

  useEffect(() => {
    let cancelled = false

    void loadWorkspaceData()
      .then(({ configData, foldersData, historyData }) => {
        if (cancelled) return

        if (configData && typeof configData.monitorFolder === 'string') {
          setMonitorFolder(configData.monitorFolder)
          setSelectedMonitorFolder(configData.monitorFolder)
          setAvailableMonitorFolders(Array.isArray(configData.availableFolders) ? configData.availableFolders : [])
        }

        if (Array.isArray(foldersData)) setFolders(foldersData)
        else console.error('Failed to load folders:', foldersData)

        if (Array.isArray(historyData)) setHistory(historyData)
        else console.error('Failed to load history:', historyData)
      })
      .catch(err => console.error('Workspace sync error:', err))

    return () => {
      cancelled = true
    }
  }, [loadWorkspaceData])

  useEffect(() => {
    let active = true

    const loadOpencodeUsage = async () => {
      let keepLoading = false
      try {
        const isInitialLoad = !opencodeUsageLoadedRef.current
        if (isInitialLoad) {
          setOpencodeUsageLoading(true)
        } else {
          setOpencodeUsageRefreshing(true)
        }
        setOpencodeUsageError(null)

        const res = await fetch(`${API_BASE}/opencode-usage`)
        const text = await res.text()
        if (!res.ok) {
          let errorMessage = `HTTP ${res.status}`
          try {
            const parsed = JSON.parse(text)
            if (parsed?.error) errorMessage = parsed.error
          } catch {
            // Keep the HTTP status message when the payload is not JSON.
          }
          throw new Error(errorMessage)
        }

        const data = JSON.parse(text)
        if (!active) return
        const rows = Array.isArray(data.rows) ? data.rows : []
        setOpencodeUsage(rows)
        keepLoading = Boolean(data.loading) && rows.length === 0
        opencodeUsageLoadedRef.current = true
      } catch (err) {
        if (!active) return
        if (!opencodeUsageLoadedRef.current) {
          setOpencodeUsage([])
          keepLoading = true
        }
        setOpencodeUsageError(err instanceof Error ? err.message : 'Failed to load opencode usage')
      } finally {
        if (active) {
          setOpencodeUsageLoading(keepLoading)
          setOpencodeUsageRefreshing(false)
        }
      }
    }

    void loadOpencodeUsage()
    const interval = window.setInterval(() => {
      void loadOpencodeUsage()
    }, 30000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  const handleFolderSelect = (folder: string) => {
    setSelectedFolder(folder)
    setSelectedHistory(null)
    setViewMode('folder')
    setPreviewFile(null)
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
    setPreviewFile(null)
    setFiles(item.files)
  }

  const handleTraceability = () => {
    setViewMode('traceability')
    setSelectedFolder(null)
    setSelectedHistory(null)
    setPreviewFile(null)
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

  const handleOpencodeUsage = () => {
    setViewMode('opencodeUsage')
    setSelectedFolder(null)
    setSelectedHistory(null)
    setPreviewFile(null)
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
        setPreviewFile(data)
      })
      .catch(err => {
        console.error('Content fetch error:', err);
        setPreviewFile({
          fileName: file.name,
          filePath,
          extension: '',
          kind: 'unknown',
          mimeType: 'text/plain',
          size: 0,
          content: `Error loading file: ${err.message}`,
        });
      })
  }

  const handleMonitorFolderApply = async () => {
    try {
      setMonitorFolderError(null)
      setMonitorFolderUpdating(true)
      const res = await fetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monitorFolder: selectedMonitorFolder }),
      })
      const text = await res.text()
      if (!res.ok) {
        let message = `HTTP ${res.status}`
        try {
          const parsed = JSON.parse(text)
          if (parsed?.error) message = parsed.error
        } catch {
          // keep HTTP status
        }
        throw new Error(message)
      }

      const data = JSON.parse(text) as WorkspaceConfig
      setMonitorFolder(data.monitorFolder)
      setSelectedFolder(null)
      setSelectedHistory(null)
      setFiles([])
      setPreviewFile(null)
      setViewMode('folder')
      setAvailableMonitorFolders(Array.isArray(data.availableFolders) ? data.availableFolders : [])
      const { configData, foldersData, historyData } = await loadWorkspaceData()
      if (configData && typeof configData.monitorFolder === 'string') {
        setMonitorFolder(configData.monitorFolder)
        setSelectedMonitorFolder(configData.monitorFolder)
        setAvailableMonitorFolders(Array.isArray(configData.availableFolders) ? configData.availableFolders : [])
      }
      if (Array.isArray(foldersData)) setFolders(foldersData)
      if (Array.isArray(historyData)) setHistory(historyData)
    } catch (error) {
      setMonitorFolderError(error instanceof Error ? error.message : 'Failed to update monitor folder')
      console.error('Monitor folder update failed:', error)
    } finally {
      setMonitorFolderUpdating(false)
    }
  }

  return (
    <div className={`app-container ${previewFile ? 'has-preview' : ''}`}>
      {/* 1st Column: Folders */}
      <div className="sidebar">
        <div className="sidebar-title">Monitor Folder</div>
        <div className="monitor-folder-controls">
          <select
            className="monitor-folder-select"
            value={selectedMonitorFolder}
            onChange={(event) => setSelectedMonitorFolder(event.target.value)}
          >
            {availableMonitorFolders.map((folder) => (
              <option key={folder} value={folder}>{folder}</option>
            ))}
          </select>
          <button
            className="monitor-folder-button"
            onClick={() => void handleMonitorFolderApply()}
            disabled={monitorFolderUpdating || selectedMonitorFolder === monitorFolder}
          >
            {monitorFolderUpdating ? 'Applying…' : 'Apply'}
          </button>
          {monitorFolderError && <div className="monitor-folder-error">{monitorFolderError}</div>}
          <div className="monitor-folder-current">Current: {monitorFolder}</div>
        </div>
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
        <div 
          className={`nav-item ${viewMode === 'opencodeUsage' ? 'active' : ''}`}
          onClick={handleOpencodeUsage}
        >
          🤖 opencode usage
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
               viewMode === 'traceability' ? 'Traceability Map' :
               'opencode usage'}</h1>
          <p>{viewMode === 'traceability' ? 'Visualizing organic connections between project Registry files' : 
              viewMode === 'opencodeUsage' ? 'Model-level usage snapshot from `opencode stats --models`' : 
              'Monitoring local file system and git state'}</p>
        </div>

        {viewMode === 'traceability' ? (
          mermaidChart ? <Mermaid chart={mermaidChart} /> : <div>Loading graph...</div>
        ) : viewMode === 'opencodeUsage' ? (
          <div className="usage-page">
            <div className="usage-page-meta">
              <span>{opencodeUsageLoading ? 'Loading…' : `${opencodeUsage.length} models`}</span>
              {opencodeUsageRefreshing && <span>Refreshing…</span>}
              {opencodeUsageError && <span className="usage-page-error">{opencodeUsageError}</span>}
            </div>
            <div className="usage-table usage-table-page">
              <div className="usage-table-header">
                <span>Model</span>
                <span>Usage Bar</span>
                <span>Message</span>
                <span>In-Tokens</span>
                <span>Out-Tokens</span>
                <span>Cache Read</span>
              </div>
              {opencodeUsageLoading && <div className="usage-empty">Loading opencode stats…</div>}
              {!opencodeUsageLoading && opencodeUsageError && <div className="usage-empty">{opencodeUsageError}</div>}
              {!opencodeUsageLoading && !opencodeUsageError && opencodeUsage.length === 0 && (
                <div className="usage-empty">No model usage found.</div>
              )}
              {!opencodeUsageLoading && !opencodeUsageError && opencodeUsage.length > 0 && (() => {
                const sortedRows = [...opencodeUsage].sort((a, b) => b.messageValue - a.messageValue)
                const peakUsage = Math.max(...sortedRows.map(row => row.usageValue), 0)
                return sortedRows.map(row => {
                  const percentage = peakUsage > 0 ? Math.max(0, Math.min((row.usageValue / peakUsage) * 100, 100)) : 0
                  return (
                    <div key={row.model} className="usage-table-row">
                      <div className="usage-model" title={row.model}>{row.model}</div>
                      <div className="usage-bar-cell" aria-label={`${row.model} usage ${percentage.toFixed(0)}%`}>
                        <div className="usage-bar-track">
                          <div className="usage-bar-fill" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                      <div className="usage-metric">{row.message}</div>
                      <div className="usage-metric">{row.inTokens}</div>
                      <div className="usage-metric">{row.outTokens}</div>
                      <div className="usage-metric">{row.cacheRead}</div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
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
      {previewFile && (
        <div className="preview-pane">
          <FilePreview
            file={previewFile}
            onClose={() => setPreviewFile(null)}
          />
        </div>
      )}
    </div>
  )
}

export default App
