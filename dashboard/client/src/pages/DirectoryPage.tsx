import type { ReactElement } from 'react';
import type { GitFile, HistoryItem, FilePreviewData } from '../types';
import { iconForExplorerFile, statusLabelForFile, filterExcludedFiles } from '../utils';
import FilePreview from '../components/FilePreview';

export type MiddlePanelMode = 'history' | 'navigation' | 'hidden';

export interface DirectoryPageProps {
  selectedMonitorFolder: string;
  monitorFolder: string;
  setSelectedMonitorFolder: (v: string) => void;
  setMonitorFolderInput: (v: string) => void;
  setMiddlePanelMode: (v: MiddlePanelMode) => void;
  handleMonitoringToggle: () => void;
  monitoringActive: boolean;
  monitorFolderUpdating: boolean;
  monitorFolderError: string | null;
  handleWorkspaceFolderSelect: (folder: string) => void;
  selectedFolder: string | null;
  setSelectedFolder: (folder: string | null) => void;
  handleMonitorCrumbSelect: (folder: string) => void;
  visibleFolders: string[];
  visibleFiles: GitFile[];
  selectedHistory: HistoryItem | null;
  previewFile: FilePreviewData | null;
  setPreviewFile: (file: FilePreviewData | null) => void;
  handleFileClick: (file: GitFile) => void;
  middlePanelMode: MiddlePanelMode;
  history: HistoryItem[];
  handleWorkspaceHistorySelect: (item: HistoryItem) => void;
  excludeFolders: string[];
  newExcludeFolder: string;
  setNewExcludeFolder: (v: string) => void;
  handleAddExcludeFolder: () => void;
  handleRemoveExcludeFolder: (folder: string) => void;
}

export function DirectoryPage({
  selectedMonitorFolder,
  monitorFolder,
  setSelectedMonitorFolder,
  setMonitorFolderInput,
  setMiddlePanelMode,
  handleMonitoringToggle,
  monitoringActive,
  monitorFolderUpdating,
  monitorFolderError,
  handleWorkspaceFolderSelect,
  selectedFolder,
  setSelectedFolder,
  handleMonitorCrumbSelect,
  visibleFolders,
  visibleFiles,
  selectedHistory,
  previewFile,
  setPreviewFile,
  handleFileClick,
  middlePanelMode,
  history,
  handleWorkspaceHistorySelect,
  excludeFolders,
  newExcludeFolder,
  setNewExcludeFolder,
  handleAddExcludeFolder,
  handleRemoveExcludeFolder,
}: DirectoryPageProps): ReactElement {
  const showNavigationMode = middlePanelMode === 'navigation' && !monitoringActive
  const showHiddenMode = middlePanelMode === 'hidden' && !monitoringActive

  return (
    <div className="workspace-page">
      <section className="workspace-explorer">
        <div className="workspace-panel-header">
          <span>Explorer</span>
          <span>•••</span>
        </div>
        <div className="workspace-directory-controls">
          <div className="workspace-nav-info">
            <div className="workspace-target-label">Target: <span className="workspace-current-base">{selectedMonitorFolder}</span></div>
          </div>
          <div className="workspace-top-actions">
            <button
              type="button"
              className="monitor-folder-button workspace-select-btn"
              onClick={() => {
                  const target = selectedFolder || monitorFolder;
                  setSelectedMonitorFolder(target);
                  setMonitorFolderInput(target === '.' ? monitorFolder : target);
                  setMiddlePanelMode('navigation');
              }}
              title="현재 보시는 폴더를 대상으로 선택합니다"
            >
              📁 Folder Select
            </button>
            <button
              type="button"
              className={`monitor-folder-button workspace-start-btn ${monitoringActive ? 'is-monitoring' : ''}`}
              onClick={handleMonitoringToggle}
              disabled={monitorFolderUpdating || (!monitoringActive && !selectedMonitorFolder)}
              title={monitoringActive ? 'Click to Stop Monitoring' : 'Click to Start Monitoring'}
            >
              {monitoringActive ? ' Monitoring Active' : '🚀 Monitoring Start'}
            </button>
          </div>
        </div>
        {monitorFolderError && <div className="monitor-folder-error">{monitorFolderError}</div>}

        <div className="workspace-tree">
          <div className="workspace-tree-section">
            <div className="workspace-section-label">Navigation</div>
            
            {/* Current and Parent Navigation */}
            <button
              type="button"
              className="workspace-tree-row workspace-nav-row"
              onClick={() => handleWorkspaceFolderSelect('.')}
            >
              <span className="workspace-folder-icon">🏠</span>
              <span className="workspace-tree-name">. (Current)</span>
            </button>
            <button
              type="button"
              className="workspace-tree-row workspace-nav-row"
              onClick={() => {
                  const pathParts = (selectedFolder || '.').split('/').filter(Boolean);
                  if (pathParts.length > 0) {
                      pathParts.pop();
                      handleWorkspaceFolderSelect(pathParts.length > 0 ? pathParts.join('/') : '.');
                  } else if (monitorFolder !== '/') {
                      // If we are at root of current project, try to go up in real filesystem
                      handleMonitorCrumbSelect('..');
                  }
              }}
            >
              <span className="workspace-folder-icon">⤴</span>
              <span className="workspace-tree-name">.. (Up)</span>
            </button>

            <div className="workspace-section-label">Folders</div>
            <button
              type="button"
              className={`workspace-tree-row workspace-root-row ${selectedFolder === '.' ? 'active' : ''}`}
              onClick={() => handleWorkspaceFolderSelect('.')}
            >
              <span className="workspace-chevron">{selectedFolder === '.' ? '⌄' : '›'}</span>
              <span className="workspace-folder-icon">▸</span>
              <span className="workspace-tree-name">{monitorFolder.split('/').filter(Boolean).pop() || monitorFolder}</span>
            </button>

            {visibleFolders.filter(folder => folder !== '.' && !folder.startsWith('..')).map(folder => (
              <button
                type="button"
                key={folder}
                className={`workspace-tree-row ${selectedFolder === folder ? 'active' : ''}`}
                onClick={() => handleWorkspaceFolderSelect(folder)}
              >
                <span className="workspace-chevron">{selectedFolder === folder ? '⌄' : '›'}</span>
                <span className="workspace-folder-icon">▸</span>
                <span className="workspace-tree-name">{folder.split('/').filter(Boolean).pop() || folder}</span>
              </button>
            ))}
          </div>

          {visibleFiles.length > 0 && (
            <div className={`workspace-file-tree ${selectedHistory ? 'is-history-files' : ''}`}>
              <div className="workspace-section-label">
                {selectedHistory ? `Changed Files · ${selectedHistory.date}` : 'Files'}
              </div>
              {(() => {
                const renderedDirs = new Set<string>()
                return [...visibleFiles]
                  .sort((a, b) => (a.path || a.name).localeCompare(b.path || b.name))
                  .flatMap((file) => {
                    const relativePath = file.path || file.name
                    const parts = relativePath.split('/').filter(Boolean)
                    const fileName = parts.pop() || file.name
                    const rows: ReactElement[] = []

                    parts.forEach((part, index) => {
                      const dirPath = parts.slice(0, index + 1).join('/')
                      if (renderedDirs.has(dirPath)) return
                      renderedDirs.add(dirPath)
                      rows.push(
                        <div
                          key={`dir-${dirPath}`}
                          className="workspace-tree-row workspace-tree-dir"
                          style={{ paddingLeft: `${28 + index * 14}px` }}
                        >
                          <span className="workspace-chevron">⌄</span>
                          <span className="workspace-folder-icon">▸</span>
                          <span className="workspace-tree-name">{part}</span>
                        </div>
                      )
                    })

                    rows.push(
                      <button
                        type="button"
                        key={`file-${relativePath}`}
                        className={`workspace-tree-row workspace-file-row ${previewFile?.filePath.endsWith(relativePath) ? 'active' : ''}`}
                        style={{ paddingLeft: `${42 + parts.length * 14}px` }}
                        onClick={() => handleFileClick(file)}
                      >
                        <span className="workspace-file-icon">{iconForExplorerFile(fileName)}</span>
                        <span className="workspace-tree-name">{fileName}</span>
                        {statusLabelForFile(file) && (
                          <span className={`workspace-file-status status-${file.status.toLowerCase()}`}>{statusLabelForFile(file)}</span>
                        )}
                      </button>
                    )

                    return rows
                  })
              })()}
            </div>
          )}
        </div>
      </section>

      <div className="workspace-side-panel">
        <section className="workspace-list-panel">
          <div className="workspace-panel-header">
            <div className="workspace-panel-title-group">
              <span className={`status-indicator ${monitoringActive ? 'active' : ''}`}></span>
              <span>{monitoringActive ? 'Recent Changes' : (selectedFolder && selectedFolder !== "." ? `📂 Explorer: ${selectedFolder}` : 'Recent Changes')}</span>
            </div>
            <div className="workspace-panel-meta-group">
              <span className="status-label" style={{ opacity: monitoringActive ? 1 : 0.6 }}>
                {monitoringActive ? 'LIVE MONITORING' : 'SCAN INACTIVE'}
              </span>
              <div className="workspace-panel-mode-group" aria-label="Middle panel mode">
                <button
                  type="button"
                  className={`workspace-panel-mode-toggle ${middlePanelMode === 'history' || monitoringActive ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedFolder(null)
                    setMiddlePanelMode('history')
                  }}
                  disabled={monitoringActive}
                >
                  History
                </button>
                <button
                  type="button"
                  className={`workspace-panel-mode-toggle ${showNavigationMode ? 'is-active' : ''}`}
                  onClick={() => setMiddlePanelMode('navigation')}
                  disabled={monitoringActive}
                >
                  Navigation
                </button>
                <button
                  type="button"
                  className={`workspace-panel-mode-toggle ${showHiddenMode ? 'is-active' : ''}`}
                  onClick={() => setMiddlePanelMode('hidden')}
                  disabled={monitoringActive}
                >
                  Hide Navigation
                </button>
              </div>
            </div>
          </div>

          <div className="directory-history-list">
            {showNavigationMode ? (
              /* Navigation Mode */
              <div className="workspace-navigation-view">
                <button 
                  type="button"
                  className="directory-history-item workspace-nav-item"
                  onClick={() => {
                    // Handle navigation UP
                    if (!selectedFolder || selectedFolder === '.') {
                      // Already at project root level, move the MONITOR folder itself up
                      handleMonitorCrumbSelect('..');
                    } else {
                      // Deep in subfolders, just move back one step in the current view
                      const pathParts = selectedFolder.split('/').filter(Boolean);
                      if (pathParts.length > 1) {
                          pathParts.pop();
                          handleWorkspaceFolderSelect(pathParts.join('/'));
                      } else {
                          handleWorkspaceFolderSelect('.');
                      }
                    }
                  }}
                >
                  <span className="nav-item-text">⤴ .. (Go Up)</span>
                </button>
                
                {visibleFolders.filter(f => f !== '.' && !f.startsWith('..')).length === 0 && (
                  <div className="usage-empty">No subfolders found.</div>
                )}
                
                {visibleFolders.filter(f => f !== '.' && !f.startsWith('..')).map(folder => (
                  <button
                    type="button"
                    key={folder}
                    className="directory-history-item workspace-folder-item"
                    onClick={() => handleWorkspaceFolderSelect(folder)}
                  >
                    <span className="nav-item-text">📁 {folder.split('/').pop()}</span>
                    <span className="nav-item-type">Folder</span>
                  </button>
                ))}
              </div>
            ) : showHiddenMode ? (
              <div className="workspace-navigation-hidden">
                <div className="usage-empty">Navigation hidden.</div>
                <button
                  type="button"
                  className="workspace-panel-mode-toggle"
                  onClick={() => setMiddlePanelMode('navigation')}
                >
                  Show Navigation
                </button>
              </div>
            ) : (
              /* History Mode */
              <>
                {history.map(item => (
                  <button
                    type="button"
                    key={item.date}
                    className={`directory-history-item ${selectedHistory?.date === item.date ? 'active' : ''}`}
                    onClick={() => handleWorkspaceHistorySelect(item)}
                  >
                    <span>📅 {item.date}</span>
                    <span>{filterExcludedFiles(item.files, excludeFolders).length}</span>
                  </button>
                ))}
                {history.length === 0 && (
                  <div className="usage-empty">No recent changes found.</div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="workspace-list-panel">
          <div className="workspace-panel-header">
            <span>Exclude Folders</span>
            <span>{excludeFolders.length}</span>
          </div>
          <div className="exclude-folders-ui directory-exclude-ui">
            <div className="directory-exclude-input">
              <input
                type="text"
                className="monitor-folder-select"
                placeholder="Folder name"
                value={newExcludeFolder}
                onChange={(e) => setNewExcludeFolder(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddExcludeFolder()}
              />
              <button
                type="button"
                className="monitor-folder-button directory-add-button"
                onClick={handleAddExcludeFolder}
                title="Add to exclude list"
              >
                +
              </button>
            </div>
            <div className="exclude-tags">
              {excludeFolders.map(folder => (
                <span key={folder} className="exclude-tag" title="Click to remove" onClick={() => handleRemoveExcludeFolder(folder)}>
                  {folder} ×
                </span>
              ))}
              {excludeFolders.length === 0 && (
                <span className="directory-card-meta">No excluded folders.</span>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="workspace-preview">
        {previewFile ? (
          <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
        ) : (
          <div className="workspace-preview-empty">
            <div className="workspace-preview-empty-title">파일을 선택하세요</div>
            <div>Explorer에서 파일을 클릭하면 이 영역에 미리보기가 표시됩니다.</div>
          </div>
        )}
      </section>
    </div>
  );
}
