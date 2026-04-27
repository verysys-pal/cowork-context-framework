import { useState, useEffect, useRef, useCallback, useMemo, type ReactElement } from 'react'
import Mermaid from './components/Mermaid'
import FilePreview from './components/FilePreview'
import GitHubMarkdown from './components/GitHubMarkdown'
import './components/MarkdownPreview.css'
import './App.css'

import { LinkPage } from './pages/LinkPage'
import { OpencodeUsagePage } from './pages/OpencodeUsagePage'
import { CliPage } from './pages/CliPage'
import { TraceabilityPage } from './pages/TraceabilityPage'
import { DirectoryPage } from './pages/DirectoryPage'
import type { GitFile, HistoryItem, WorkspaceConfig, FilePreviewData, OpencodeUsageRow, LinkItem } from './types'
import { 
  DEFAULT_LINKS,
  LEGACY_LINK_STORAGE_KEY,
  LINK_GROUP_COLOR_STORAGE_KEY,
  readLegacyLinks, 
  filterExcludedFiles, 
  isExcludedPath, 
  iconForExplorerFile, 
  statusLabelForFile, 
  readLinkGroupColors 
} from './utils'


function App() {
  const [folders, setFolders] = useState<string[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null)
  const [files, setFiles] = useState<GitFile[]>([])
  const [viewMode, setViewMode] = useState<'folder' | 'history' | 'directory' | 'traceability' | 'opencodeUsage' | 'linkPage' | 'cli'>('directory')
  const [mermaidChart, setMermaidChart] = useState<string>('')
  const [previewFile, setPreviewFile] = useState<FilePreviewData | null>(null)
  const [monitorFolder, setMonitorFolder] = useState<string>('.cowork')
  const [selectedMonitorFolder, setSelectedMonitorFolder] = useState<string>('.cowork')
  const [monitorFolderInput, setMonitorFolderInput] = useState<string>('.cowork')
  const [monitoringActive, setMonitoringActive] = useState(() => {
    return localStorage.getItem('monitoringActive') === 'true';
  })

  // Synchronize localStorage whenever monitoringActive changes
  useEffect(() => {
    localStorage.setItem('monitoringActive', monitoringActive.toString());
  }, [monitoringActive])
  const [middlePanelMode, setMiddlePanelMode] = useState<'history' | 'navigation'>('history')
  const [monitorFolderUpdating, setMonitorFolderUpdating] = useState(false)
  const [monitorFolderError, setMonitorFolderError] = useState<string | null>(null)
  const [excludeFolders, setExcludeFolders] = useState<string[]>([])
  const [newExcludeFolder, setNewExcludeFolder] = useState('')
  const [opencodeUsage, setOpencodeUsage] = useState<OpencodeUsageRow[]>([])
  const [opencodeUsageLoading, setOpencodeUsageLoading] = useState(true)
  const [opencodeUsageRefreshing, setOpencodeUsageRefreshing] = useState(false)
  const [opencodeUsageError, setOpencodeUsageError] = useState<string | null>(null)
  const [activeCliTab, setActiveCliTab] = useState<number>(7682)
  const [cliPorts, setCliPorts] = useState<number[]>([7682])
  const [cliFontSize, setCliFontSize] = useState<number>(14)
  const [cliBgColor, setCliBgColor] = useState<string>('#0d1117')
  const [cliLineHeight, setCliLineHeight] = useState<number>(1.2)
  const [cliSettingsApplied, setCliSettingsApplied] = useState<number>(Date.now())
  const [links, setLinks] = useState<LinkItem[]>([])
  const [linksLoading, setLinksLoading] = useState(true)
  const [linksError, setLinksError] = useState<string | null>(null)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTag, setLinkTag] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [opencodeWebLaunching, setOpencodeWebLaunching] = useState(false)
  const [opencodeWebMessage, setOpencodeWebMessage] = useState<string | null>(null)
  const [opencodeWebError, setOpencodeWebError] = useState<string | null>(null)
  const [notePanelLinkId, setNotePanelLinkId] = useState<string | null>(null)
  const [notePanelMode, setNotePanelMode] = useState<'view' | 'edit'>('view')
  const [noteDraft, setNoteDraft] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [activeTagDropdownId, setActiveTagDropdownId] = useState<string | null>(null)
  const [linkGroupColors, setLinkGroupColors] = useState<Record<string, string>>(() => readLinkGroupColors())
  const opencodeUsageLoadedRef = useRef(false)
  const opencodeWebLaunchInFlightRef = useRef(false)

  const API_BASE = 'http://localhost:3002/api/workspace'

  const fetchJson = useCallback(async (endpoint: string) => {
    const res = await fetch(`${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}t=${Date.now()}`)
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
    const configData = await fetchJson('/config') as WorkspaceConfig
    const [foldersResult, historyResult, cliResult, rootFilesResult] = await Promise.allSettled([
      fetchJson('/folders'),
      fetchJson('/history'),
      fetchJson('/cli/sessions'),
      fetchJson('/files?folder=.'),
    ])

    const foldersData = foldersResult.status === 'fulfilled' ? foldersResult.value : []
    const historyData = historyResult.status === 'fulfilled' ? historyResult.value : []
    const cliData = cliResult.status === 'fulfilled' ? cliResult.value : null
    const rootFilesData = rootFilesResult.status === 'fulfilled' ? rootFilesResult.value : []

    if (foldersResult.status === 'rejected') console.error('Failed to load folders:', foldersResult.reason)
    if (historyResult.status === 'rejected') console.error('Failed to load history:', historyResult.reason)
    if (cliResult.status === 'rejected') console.error('Failed to load CLI sessions:', cliResult.reason)
    if (rootFilesResult.status === 'rejected') console.error('Failed to load root files:', rootFilesResult.reason)

    if (cliData && Array.isArray(cliData.ports)) {
      setCliPorts(cliData.ports);
      if (cliData.ports.length > 0) setActiveCliTab(cliData.ports[0]);
      if (cliData.settings) {
        setCliFontSize(cliData.settings.fontSize || 14);
        setCliBgColor(cliData.settings.bgColor || '#0d1117');
        setCliLineHeight(cliData.settings.lineHeight || 1.2);
      }
    }

    if (configData && Array.isArray(configData.excludeFolders)) {
      setExcludeFolders(configData.excludeFolders)
    }

    if (Array.isArray(rootFilesData)) {
      setSelectedFolder('.')
      setFiles(rootFilesData)
    }

    if (Array.isArray(historyData)) {
      setHistory(historyData)
    }


    return { configData, foldersData, historyData }
  }, [fetchJson])

  const saveLinks = useCallback(async (nextLinks: LinkItem[]) => {
    const res = await fetch(`${API_BASE}/links`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: nextLinks }),
    })
    const text = await res.text()
    if (!res.ok) {
      let message = `HTTP ${res.status}`
      try {
        const parsed = JSON.parse(text)
        if (parsed?.error) message = parsed.error
      } catch {
        // keep HTTP status message
      }
      throw new Error(message)
    }

    const data = JSON.parse(text) as { links?: LinkItem[] }
    setLinks(Array.isArray(data.links) ? data.links : nextLinks)
  }, [API_BASE])

  const loadLinks = useCallback(async () => {
    setLinksLoading(true)
    setLinksError(null)

    try {
      const data = await fetchJson('/links') as { links?: LinkItem[] }
      const loaded = Array.isArray(data.links)
        ? data.links.filter((item): item is LinkItem => Boolean(item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.url === 'string')).map((item) => ({
          id: item.id,
          title: item.title,
          url: item.url,
          note: typeof item.note === 'string' ? item.note : '',
          tag: typeof (item as any).tag === 'string' ? ((item as any).tag.trim() || 'General') : 'General',
        }))
        : DEFAULT_LINKS
      if (loaded.length === 0) {
        const legacyLinks = readLegacyLinks()
        if (legacyLinks.length > 0) {
          await saveLinks(legacyLinks)
          window.localStorage.removeItem(LEGACY_LINK_STORAGE_KEY)
          setLinks(legacyLinks)
          return
        }
      }

      setLinks(loaded)
    } catch (error) {
      setLinks(DEFAULT_LINKS)
      setLinksError(error instanceof Error ? error.message : 'Failed to load links')
    } finally {
      setLinksLoading(false)
    }
  }, [fetchJson, saveLinks])

  useEffect(() => {
    // Disable 'Leave site' confirmation dialog
    window.onbeforeunload = null;
  }, []);

  useEffect(() => {
    let cancelled = false

    void loadWorkspaceData()
      .then(({ configData, foldersData, historyData }) => {
        if (cancelled) return

        if (configData && typeof configData.monitorFolder === 'string') {
          setMonitorFolder(configData.monitorFolder)
          setSelectedMonitorFolder(configData.monitorFolder)
          setMonitorFolderInput(configData.monitorFolder)
          if (Array.isArray(configData.excludeFolders)) {
            setExcludeFolders(configData.excludeFolders)
          }
        }

        if (Array.isArray(foldersData)) setFolders(foldersData)
        else console.error('Failed to load folders:', foldersData)

        if (Array.isArray(historyData)) setHistory(historyData)
        else console.error('Failed to load history:', historyData)
      })
      .catch(err => console.error('Workspace sync error:', err))

    void loadLinks()

    return () => {
      cancelled = true
    }
  }, [loadLinks, loadWorkspaceData])

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

  useEffect(() => {
    if (previewFile && isExcludedPath(previewFile.filePath, excludeFolders)) {
      setPreviewFile(null)
    }
  }, [excludeFolders, previewFile])

  const loadFilesForFolder = useCallback(async (folder: string) => {
    const res = await fetch(`${API_BASE}/files?folder=${encodeURIComponent(folder)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('Invalid files response')
    setFiles(data)
  }, [API_BASE])

  const loadFoldersForFolder = useCallback(async (folder: string) => {
    const res = await fetch(`${API_BASE}/folders?folder=${encodeURIComponent(folder)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('Invalid folders response')
    setFolders(data)
  }, [API_BASE])

  const handleWorkspaceFolderSelect = useCallback((folder: string) => {
    setSelectedFolder(folder)
    setMonitorFolderInput(folder === '.' ? monitorFolder : folder)
    setSelectedHistory(null)
    setPreviewFile(null)
    setNotePanelLinkId(null)
    setViewMode('directory')
    setMiddlePanelMode('navigation')

    void loadFilesForFolder(folder).catch((err) => {
      console.error('Fetch files error:', err)
      setFiles([])
    })
    void loadFoldersForFolder(folder).catch((err) => {
      console.error('Fetch folders error:', err)
    })
  }, [loadFilesForFolder, loadFoldersForFolder])

  const handleWorkspaceHistorySelect = useCallback((item: HistoryItem) => {
    setSelectedHistory(item)
    setSelectedFolder(null)
    setPreviewFile(null)
    setNotePanelLinkId(null)
    setViewMode('directory')
    setFiles(item.files)
  }, [])
  const handleMonitorFolderApply = useCallback(async (
    targetFolder = selectedMonitorFolder,
    nextExcludeFolders = excludeFolders,
    activateMonitoring = true,
    refreshPageAfterApply = false,
  ) => {
    try {
      setMonitorFolderError(null)
      setMonitorFolderUpdating(true)
      const res = await fetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monitorFolder: targetFolder,
          excludeFolders: nextExcludeFolders
        }),
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
      setSelectedMonitorFolder(data.monitorFolder)
      setMonitorFolderInput(data.monitorFolder)
      setSelectedFolder(activateMonitoring ? '.' : null)
      setSelectedHistory(null)
      setFiles([])
      setPreviewFile(null)
      setNotePanelLinkId(null)
      setMonitoringActive(activateMonitoring)
      setViewMode('directory')
      if (Array.isArray(data.excludeFolders)) {
        setExcludeFolders(data.excludeFolders)
      }

      if (activateMonitoring) {
        setMonitoringActive(true)
        setMiddlePanelMode('history')
      }

      if (refreshPageAfterApply) {
        // We no longer need full reload, but if it's explicitly desired, 
        // we can still do dynamic loading instead.
        // window.location.reload() // Removed to persist state
      }

      // Reload everything to ensure fresh data for the new path
      void loadWorkspaceData().then(({ foldersData, historyData }) => {
        if (Array.isArray(foldersData)) setFolders(foldersData)
        if (Array.isArray(historyData)) setHistory(historyData)
        if (!activateMonitoring) {
          setSelectedFolder(null)
          setSelectedHistory(null)
          setFiles([])
          setPreviewFile(null)
        }
      })
    } catch (error) {
      setMonitorFolderError(error instanceof Error ? error.message : 'Failed to update monitor folder')
      console.error('Monitor folder update failed:', error)
    } finally {
      setMonitorFolderUpdating(false)
    }
  }, [selectedMonitorFolder, excludeFolders, API_BASE, loadWorkspaceData])

  const handleMonitoringToggle = useCallback(() => {
    if (monitorFolderUpdating) return
    
    // Priority: Explicit input > Current Navigated Folder > Previously selected monitor folder
    let targetFolder = monitorFolderInput.trim()
    if (!targetFolder && selectedFolder && selectedFolder !== '.') {
      targetFolder = selectedFolder
    }
    if (!targetFolder) {
      targetFolder = selectedMonitorFolder
    }

    if (monitoringActive && targetFolder === monitorFolder) {
      setMonitoringActive(false)
      setSelectedFolder(null)
      setSelectedHistory(null)
      setFiles([])
      setPreviewFile(null)
      setNotePanelLinkId(null)
      return
    }

    setSelectedMonitorFolder(targetFolder)
    void handleMonitorFolderApply(targetFolder, excludeFolders, true, true)
  }, [excludeFolders, handleMonitorFolderApply, monitorFolder, monitorFolderInput, monitorFolderUpdating, monitoringActive, selectedMonitorFolder, selectedFolder])


  const handleMonitorCrumbSelect = useCallback((folder: string) => {
    setSelectedMonitorFolder(folder);
    setMonitorFolderInput(folder);
    // Use the CURRENT monitoringActive state instead of forcing true
    void handleMonitorFolderApply(folder, excludeFolders, monitoringActive, true);
    
    // Also refresh subfolders for the new root
    void loadFoldersForFolder('.').catch(console.error);
    void loadFilesForFolder('.').catch(console.error);
  }, [excludeFolders, handleMonitorFolderApply, monitoringActive, loadFoldersForFolder, loadFilesForFolder]);


  const handleTraceability = () => {
    setViewMode('traceability')
    setSelectedFolder(null)
    setSelectedHistory(null)
    setPreviewFile(null)
    setNotePanelLinkId(null)
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
    setNotePanelLinkId(null)
  }

  const handleAddLink = useCallback(() => {
    const title = linkTitle.trim()
    const url = linkUrl.trim()

    if (!title) {
      setLinkError('링크 제목을 입력해 주세요.')
      return
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      setLinkError('올바른 URL을 입력해 주세요. 예: https://example.com')
      return
    }

    const nextLink: LinkItem = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      url: parsedUrl.toString(),
      note: '',
      tag: linkTag.trim() || 'General',
    }

    void (async () => {
      try {
        const nextLinks = [nextLink, ...links]
        await saveLinks(nextLinks)
        setLinkTitle('')
        setLinkUrl('')
        setLinkTag('')
        setLinkError(null)
        setViewMode('linkPage')
      } catch (error) {
        setLinkError(error instanceof Error ? error.message : 'Failed to save link')
      }
    })()
  }, [linkTitle, linkUrl, linkTag, links, saveLinks])

  const handleAddExcludeFolder = useCallback(() => {
    const trimmed = newExcludeFolder.trim()
    if (!trimmed) return
    const next = Array.from(new Set([...excludeFolders, trimmed])).filter(Boolean)
    setExcludeFolders(next)
    setNewExcludeFolder('')
    void handleMonitorFolderApply(monitorFolder, next, monitoringActive)
  }, [newExcludeFolder, excludeFolders, monitorFolder, monitoringActive, handleMonitorFolderApply])

  const handleRemoveExcludeFolder = useCallback((folder: string) => {
    const next = excludeFolders.filter(f => f !== folder)
    setExcludeFolders(next)
    void handleMonitorFolderApply(monitorFolder, next, monitoringActive)
  }, [excludeFolders, monitorFolder, monitoringActive, handleMonitorFolderApply])

  const handleRemoveLink = useCallback((id: string) => {
    void (async () => {
      try {
        const nextLinks = links.filter((item) => item.id !== id)
        await saveLinks(nextLinks)
      } catch (error) {
        setLinkError(error instanceof Error ? error.message : 'Failed to delete link')
      }
    })()
  }, [links, saveLinks])

  const handleUpdateLinkTag = useCallback((id: string, newTag: string) => {
    const updatedLinks = links.map(l => l.id === id ? { ...l, tag: newTag.trim() || 'General' } : l)
    void saveLinks(updatedLinks)
  }, [links, saveLinks])

  const handleUpdateLinkTagPrompt = useCallback((id: string) => {
    const link = links.find(l => l.id === id)
    if (!link) return
    const newTag = window.prompt('새로운 태그명을 입력해 주세요.', link.tag)
    if (newTag !== null) handleUpdateLinkTag(id, newTag)
  }, [links, handleUpdateLinkTag])

  const handleUpdateLinkGroupColor = useCallback((tag: string, color: string) => {
    setLinkGroupColors((current) => {
      const next = { ...current, [tag]: color }
      window.localStorage.setItem(LINK_GROUP_COLOR_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const openNoteModal = useCallback((linkId: string) => {
    const link = links.find((item) => item.id === linkId)
    if (!link) return

    void (async () => {
      try {
        setNotePanelLinkId(linkId)
        setNotePanelMode('view')
        setNoteError(null)
        setPreviewFile(null)
        setNoteDraft('불러오는 중…')

        const data = await fetchJson(`/links/${linkId}/note`) as { note: string }
        setNoteDraft(data.note || '')
      } catch (error) {
        setNoteError(error instanceof Error ? error.message : 'Failed to load note content')
        setNoteDraft(link.note || '') // Fallback to local state
      }
    })()
  }, [links, fetchJson])

  const closeNoteModal = useCallback(() => {
    if (noteSaving) return
    setNotePanelLinkId(null)
    setNotePanelMode('view')
    setNoteDraft('')
    setNoteError(null)
  }, [noteSaving])

  const handleSaveNote = useCallback(() => {
    if (!notePanelLinkId) return

    void (async () => {
      try {
        setNoteSaving(true)
        setNoteError(null)
        const nextLinks = links.map((item) => (
          item.id === notePanelLinkId ? { ...item, note: noteDraft } : item
        ))
        await saveLinks(nextLinks)
        setNotePanelMode('view')
      } catch (error) {
        setNoteError(error instanceof Error ? error.message : 'Failed to save note')
      } finally {
        setNoteSaving(false)
      }
    })()
  }, [links, noteDraft, notePanelLinkId, saveLinks])

  const handleOpenLinkPage = () => {
    setViewMode('linkPage')
    setSelectedFolder(null)
    setSelectedHistory(null)
    setPreviewFile(null)
  }

  const handleOpenDirectoryPage = () => {
    setViewMode('directory')
    setSelectedFolder(null)
    setSelectedHistory(null)
    setPreviewFile(null)
    setNotePanelLinkId(null)
  }

  const handleLaunchOpencodeWeb = useCallback(async () => {
    if (opencodeWebLaunchInFlightRef.current) return

    opencodeWebLaunchInFlightRef.current = true
    setOpencodeWebLaunching(true)
    setOpencodeWebError(null)
    setOpencodeWebMessage(null)
    const popup = window.open('', '_blank')

    try {
      const res = await fetch(`${API_BASE}/opencode-web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const text = await res.text()

      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}`
        try {
          const parsed = JSON.parse(text)
          if (parsed?.error) errorMessage = parsed.error
        } catch {
          // keep HTTP error message
        }
        throw new Error(errorMessage)
      }

      const data = JSON.parse(text) as { message?: string; url?: string }
      setOpencodeWebMessage(data.message ?? 'OpenCode Web 실행 요청을 보냈습니다.')
      if (data.url) {
        if (popup) {
          popup.location.href = data.url
        } else {
          window.open(data.url, '_blank', 'noopener,noreferrer')
        }
      }
      setViewMode('linkPage')
    } catch (error) {
      setOpencodeWebError(error instanceof Error ? error.message : 'OpenCode Web 실행에 실패했습니다.')
      popup?.close()
    } finally {
      opencodeWebLaunchInFlightRef.current = false
      setOpencodeWebLaunching(false)
    }
  }, [API_BASE])

  const handleApplyCliSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/cli/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fontSize: cliFontSize,
          bgColor: cliBgColor,
          lineHeight: cliLineHeight
        })
      })
      if (!res.ok) throw new Error('Failed to apply settings')
      setCliSettingsApplied(Date.now())
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddCliSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/cli/sessions`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to start session')
      const data = await res.json()
      setCliPorts(prev => [...prev, data.port])
      setActiveCliTab(data.port)
    } catch (err) {
      console.error(err)
    }
  }

  const handleRemoveCliSession = async (port: number, event: React.MouseEvent) => {
    event.stopPropagation()
    if (cliPorts.length <= 1) return
    try {
      await fetch(`${API_BASE}/cli/sessions/${port}`, { method: 'DELETE' })
      setCliPorts(prev => {
        const next = prev.filter(p => p !== port)
        if (activeCliTab === port) {
          setActiveCliTab(next[next.length - 1] || next[0])
        }
        return next
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleFileClick = (file: GitFile) => {
    let filePath = '';
    if ((viewMode === 'folder' || viewMode === 'directory') && selectedFolder) {
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


  const fullFolderPath = useMemo(() => {
    if (!selectedFolder || selectedFolder === '.') return monitorFolder
    if (selectedFolder.startsWith('/')) return selectedFolder
    return (monitorFolder.endsWith('/') ? monitorFolder : monitorFolder + '/') + selectedFolder
  }, [monitorFolder, selectedFolder])

  const viewTitle = viewMode === 'folder'
    ? `Folder: ${fullFolderPath}`
    : viewMode === 'history'
      ? `Changed on ${selectedHistory?.date}`
      : viewMode === 'directory'
        ? `Workspace : ${monitorFolder}`
        : viewMode === 'traceability'
          ? 'Traceability Map'
          : viewMode === 'linkPage'
            ? 'Link 페이지'
            : viewMode === 'opencodeUsage'
              ? 'OpenCode Usage'
              : 'Terminal CLI'

  const viewDescription = viewMode === 'traceability'
    ? 'Visualizing organic connections between project Registry files'
    : viewMode === 'directory'
      ? 'Change the monitored workspace and review recent changes in one place'
      : viewMode === 'linkPage'
        ? '사용자가 직접 링크와 마크다운 메모를 관리하는 페이지입니다.'
        : viewMode === 'opencodeUsage'
          ? 'Model-level usage snapshot from `opencode stats --models`'
          : viewMode === 'cli'
            ? 'Web-based terminal for direct workspace interaction'
            : 'Monitoring local file system and git state'

  const showGlobalPreview = Boolean(previewFile && viewMode !== 'directory')
  const visibleFolders = useMemo(() => (
    folders.filter((folder) => !isExcludedPath(folder, excludeFolders))
  ), [excludeFolders, folders])
  const visibleFiles = useMemo(() => (
    filterExcludedFiles(files, excludeFolders)
  ), [excludeFolders, files])

  return (
    <div className={`app-container ${showGlobalPreview || notePanelLinkId ? 'has-preview' : ''}`}>
      {/* 1st Column: Folders */}
      <div className="sidebar">
        <div className="sidebar-title">Navigation</div>
        <div
          className={`nav-item ${viewMode === 'directory' ? 'active' : ''}`}
          onClick={handleOpenDirectoryPage}
        >
          📂 Workspace
        </div>
        <div className="sidebar-spacer" />
        <div className="nav-item">
          📊 Progress Overview
        </div>
        <div
          className={`nav-item ${viewMode === 'traceability' ? 'active' : ''}`}
          onClick={handleTraceability}
        >
          🕸️ Traceability Map
        </div>
        <div
          className={`nav-item ${viewMode === 'linkPage' ? 'active' : ''}`}
          onClick={handleOpenLinkPage}
        >
          🔗 Link 페이지
        </div>
        <div
          className={`nav-item ${viewMode === 'opencodeUsage' ? 'active' : ''}`}
          onClick={handleOpencodeUsage}
        >
          🤖 OpenCode Usage
        </div>
        <div
          className={`nav-item ${viewMode === 'cli' ? 'active' : ''}`}
          onClick={() => setViewMode('cli')}
        >
          💻 Terminal CLI
        </div>
      </div>

      {/* 2nd Column: Main Content */}
      <div className="main-content">
        <div className="dashboard-header">
          <div>
            <h1 title={viewMode === 'directory' ? monitorFolder : undefined}>{viewTitle}</h1>
            <p>{viewDescription}</p>
          </div>
          {viewMode === 'opencodeUsage' && (
            <div className="link-page-card" style={{ maxWidth: '300px', margin: 0, padding: '15px', textAlign: 'center' }}>
              <div className="sidebar-title" style={{ fontSize: '0.9rem', marginBottom: '12px', textAlign: 'center' }}>External Tools</div>
              <button
                type="button"
                className="monitor-folder-button opencode-launch-button"
                style={{ width: '100%', height: '32px', fontSize: '0.85rem' }}
                disabled={opencodeWebLaunching}
                onClick={() => void handleLaunchOpencodeWeb()}
              >
                {opencodeWebLaunching ? '실행 중…' : 'OpenCode Web 실행'}
              </button>
              {opencodeWebLaunching && <div className="link-error" style={{ fontSize: '0.75rem', marginTop: '4px' }}>OpenCode Web 실행 중…</div>}
              {opencodeWebMessage && <div className="link-error" style={{ fontSize: '0.75rem', marginTop: '4px' }}>{opencodeWebMessage}</div>}
              {opencodeWebError && <div className="link-error" style={{ fontSize: '0.75rem', marginTop: '4px' }}>{opencodeWebError}</div>}
            </div>
          )}
        </div>

        {viewMode === 'traceability' ? (
          <TraceabilityPage mermaidChart={mermaidChart} />
        ) : viewMode === 'directory' ? (
          <DirectoryPage
            selectedMonitorFolder={selectedMonitorFolder}
            monitorFolder={monitorFolder}
            setSelectedMonitorFolder={setSelectedMonitorFolder}
            setMonitorFolderInput={setMonitorFolderInput}
            setMiddlePanelMode={setMiddlePanelMode}
            handleMonitoringToggle={handleMonitoringToggle}
            monitoringActive={monitoringActive}
            monitorFolderUpdating={monitorFolderUpdating}
            monitorFolderError={monitorFolderError}
            handleWorkspaceFolderSelect={handleWorkspaceFolderSelect}
            selectedFolder={selectedFolder}
            setSelectedFolder={setSelectedFolder}
            handleMonitorCrumbSelect={handleMonitorCrumbSelect}
            visibleFolders={visibleFolders}
            visibleFiles={visibleFiles}
            selectedHistory={selectedHistory}
            previewFile={previewFile}
            setPreviewFile={setPreviewFile}
            handleFileClick={handleFileClick}
            middlePanelMode={middlePanelMode}
            history={history}
            handleWorkspaceHistorySelect={handleWorkspaceHistorySelect}
            excludeFolders={excludeFolders}
            newExcludeFolder={newExcludeFolder}
            setNewExcludeFolder={setNewExcludeFolder}
            handleAddExcludeFolder={handleAddExcludeFolder}
            handleRemoveExcludeFolder={handleRemoveExcludeFolder}
          />
        ) : viewMode === 'linkPage' ? (
          <LinkPage 
            linksLoading={linksLoading}
            links={links}
            linksError={linksError}
            linkTitle={linkTitle}
            setLinkTitle={setLinkTitle}
            linkUrl={linkUrl}
            setLinkUrl={setLinkUrl}
            linkTag={linkTag}
            setLinkTag={setLinkTag}
            handleAddLink={handleAddLink}
            linkGroupColors={linkGroupColors}
            handleUpdateLinkGroupColor={handleUpdateLinkGroupColor}
            activeTagDropdownId={activeTagDropdownId}
            setActiveTagDropdownId={setActiveTagDropdownId}
            handleUpdateLinkTag={handleUpdateLinkTag}
            handleUpdateLinkTagPrompt={handleUpdateLinkTagPrompt}
            openNoteModal={openNoteModal}
            handleRemoveLink={handleRemoveLink}
            linkError={linkError}
          />
        ) : viewMode === 'opencodeUsage' ? (
          <OpencodeUsagePage 
            opencodeUsageLoading={opencodeUsageLoading}
            opencodeUsage={opencodeUsage}
            opencodeUsageRefreshing={opencodeUsageRefreshing}
            opencodeUsageError={opencodeUsageError}
          />
        ) : viewMode === 'cli' ? null : (
          <div className="folder-grid">
            {Object.entries(
              visibleFiles.reduce((groups: Record<string, GitFile[]>, file) => {
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
                        <span className="file-icon">📄</span>
                        <span className="file-name">{file.name}</span>
                        {file.status !== 'none' && (
                          <span className={`file-status status-${file.status.toLowerCase()}`}>{file.status}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Persistent CLI Containers */}
        <CliPage 
          cliPorts={cliPorts}
          activeCliTab={activeCliTab}
          setActiveCliTab={setActiveCliTab}
          handleRemoveCliSession={handleRemoveCliSession}
          handleAddCliSession={handleAddCliSession}
          cliFontSize={cliFontSize}
          setCliFontSize={setCliFontSize}
          cliBgColor={cliBgColor}
          setCliBgColor={setCliBgColor}
          cliLineHeight={cliLineHeight}
          setCliLineHeight={setCliLineHeight}
          handleApplyCliSettings={handleApplyCliSettings}
          cliSettingsApplied={cliSettingsApplied}
          viewMode={viewMode}
        />
      </div>

      {/* 4th Column: Preview */}
      {showGlobalPreview && previewFile && (
        <div className="preview-pane">
          <FilePreview
            file={previewFile}
            onClose={() => setPreviewFile(null)}
          />
        </div>
      )}

      {notePanelLinkId && (
        <div className="preview-pane">
          <div className="note-panel">
            <div className="preview-header note-panel-header">
              <div className="preview-title">
                <span className="preview-icon">🗒️</span>
                <div>
                  <div>{links.find((item) => item.id === notePanelLinkId)?.title}</div>
                  <div className="preview-meta">Link note</div>
                </div>
              </div>
              <button className="preview-close" onClick={closeNoteModal}>×</button>
            </div>

            <div className="note-panel-toolbar">
              {notePanelMode === 'view' ? (
                <button type="button" className="monitor-folder-button opencode-launch-button note-action-btn" onClick={() => setNotePanelMode('edit')}>
                  수정
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="monitor-folder-button link-remove-button note-action-btn"
                    onClick={closeNoteModal}
                    disabled={noteSaving}
                  >
                    취소
                  </button>
                  <button type="button" className="monitor-folder-button link-note-button note-action-btn" onClick={() => setNotePanelMode('view')} disabled={noteSaving}>
                    미리보기
                  </button>
                  <button type="button" className="monitor-folder-button opencode-launch-button note-action-btn" onClick={() => void handleSaveNote()} disabled={noteSaving}>
                    {noteSaving ? '저장 중…' : '저장'}
                  </button>
                </>
              )}
            </div>

            {noteError && <div className="note-modal-error">{noteError}</div>}

            {notePanelMode === 'view' ? (
              <div className="preview-content markdown-body note-preview">
                {noteDraft ? (
                  <GitHubMarkdown content={noteDraft} />
                ) : (
                  <div className="link-empty">&nbsp;</div>
                )}
              </div>
            ) : (
              <div className="note-modal-body note-panel-body">
                <textarea
                  className="note-editor"
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="마크다운 메모를 입력하세요."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
