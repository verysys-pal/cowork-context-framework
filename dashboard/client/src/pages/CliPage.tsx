import React from 'react';

export interface CliSessionStatus {
  port: number;
  source: 'managed' | 'external';
  sessionName: string;
  running: boolean;
  windows: number;
  attached: number;
  paneCount: number;
  activePaneCommand: string;
  activePanePath: string;
  activePaneTitle: string;
  panes: Array<{
    windowIndex: number;
    paneIndex: number;
    active: boolean;
    command: string;
    path: string;
    title: string;
  }>;
}

export interface ExternalTmuxSessionStatus {
  sessionName: string;
  running: boolean;
  windows: number;
  attached: number;
  paneCount: number;
  activePaneCommand: string;
  activePanePath: string;
  activePaneTitle: string;
  panes: Array<{
    windowIndex: number;
    paneIndex: number;
    active: boolean;
    command: string;
    path: string;
    title: string;
  }>;
}

export interface CliPageProps {
  cliPorts: number[];
  activeCliTab: number | null;
  setActiveCliTab: React.Dispatch<React.SetStateAction<number | null>>;
  handleRemoveCliSession: (port: number, e: React.MouseEvent) => void;
  handleAddCliSession: () => void;
  handleOpenExternalTmuxSession: (sessionName: string) => void;
  cliFontSize: number;
  setCliFontSize: (size: number) => void;
  cliBgColor: string;
  setCliBgColor: (color: string) => void;
  cliLineHeight: number;
  setCliLineHeight: (height: number) => void;
  handleApplyCliSettings: () => void;
  cliSettingsApplied: number;
  cliSessionStatuses: CliSessionStatus[];
  externalTmuxSessions: ExternalTmuxSessionStatus[];
  handleKillCliSession: (sessionName: string) => void;
  viewMode: string;
}

const formatSessionState = (session: CliSessionStatus): string => {
  if (!session.running) return 'stopped';
  return session.attached > 0 ? 'attached' : 'detached';
};

export function CliPage({
  cliPorts,
  activeCliTab,
  setActiveCliTab,
  handleRemoveCliSession,
  handleAddCliSession,
  handleOpenExternalTmuxSession,
  cliFontSize,
  setCliFontSize,
  cliBgColor,
  setCliBgColor,
  cliLineHeight,
  setCliLineHeight,
  handleApplyCliSettings,
  cliSettingsApplied,
  cliSessionStatuses,
  externalTmuxSessions,
  handleKillCliSession,
  viewMode,
}: CliPageProps) {
  const activeSession = cliSessionStatuses.find((session) => session.port === activeCliTab) ?? null;

  return (
    <div className="cli-page" style={{ display: viewMode === 'cli' ? 'flex' : 'none' }}>
      <div className="cli-toolbar">
        <div className="cli-tabs">
          {cliPorts.map((port, idx) => (
            <div
              key={port}
              className={`cli-tab ${activeCliTab === port ? 'active' : ''}`}
              onClick={() => setActiveCliTab(port)}
            >
              Session {idx + 1}
              <div className="cli-tab-actions">
                <span className="cli-tab-close" onClick={(e) => handleRemoveCliSession(port, e)} title="Close Tab">×</span>
              </div>
            </div>
          ))}
          <div className="cli-tab cli-tab-add" onClick={() => handleAddCliSession()}>+ Add</div>
        </div>

        <div className="cli-settings">
          <div className="cli-setting-item">
            <label>Font Size</label>
            <input
              type="number"
              value={cliFontSize}
              onChange={(e) => setCliFontSize(Number(e.target.value))}
              min={10}
              max={30}
            />
          </div>
          <div className="cli-setting-item">
            <label>BG Color</label>
            <input
              type="color"
              value={cliBgColor}
              onChange={(e) => setCliBgColor(e.target.value)}
            />
          </div>
          <div className="cli-setting-item">
            <label>Line Height</label>
            <input
              type="range"
              value={cliLineHeight}
              onChange={(e) => setCliLineHeight(Number(e.target.value))}
              min={1}
              max={2}
              step={0.1}
            />
            <span>{cliLineHeight}</span>
          </div>
          <button
            type="button"
            className="monitor-folder-button cli-apply-button"
            onClick={() => handleApplyCliSettings()}
          >
            적용
          </button>
        </div>
      </div>

      <div className="cli-workspace">
        <div className="cli-terminal-column">
          <div className="cli-sessions">
            {cliPorts.length === 0 ? (
              <div className="cli-empty-state">
                <div className="cli-empty-state-title">No tmux sessions yet</div>
                <div className="cli-empty-state-body">Add a session to start a tmux-backed terminal.</div>
              </div>
            ) : (
              cliPorts.map((port) => {
                const terminalUrl = `http://${window.location.hostname}:${port}/?fontSize=${cliFontSize}&lineHeight=${cliLineHeight}&background=${encodeURIComponent(cliBgColor)}&v=${cliSettingsApplied}`;

                return (
                  <iframe
                    key={`${port}-${cliSettingsApplied}`}
                    src={terminalUrl}
                    className={`cli-iframe ${activeCliTab === port ? 'is-active' : ''}`}
                    style={{ visibility: activeCliTab === port ? 'visible' : 'hidden' }}
                    title={`Terminal CLI Session ${port}`}
                    sandbox="allow-scripts allow-forms allow-same-origin"
                  />
                );
              })
            )}
          </div>
        </div>

        <aside className="cli-status-panel">
          <div className="cli-status-panel-header">
            <div>
              <div className="sidebar-title" style={{ marginBottom: '4px' }}>tmux Status</div>
            </div>
          </div>

          <div className="cli-status-section">
            <div className="cli-status-section-title">tmux ls</div>
            {cliSessionStatuses.length > 0 ? (
              <div className="cli-status-list">
                {cliSessionStatuses.map((session) => (
                  <button
                    key={session.port}
                    type="button"
                    className={`cli-status-card ${activeCliTab === session.port ? 'is-active' : ''}`}
                    onClick={() => setActiveCliTab(session.port)}
                  >
                    <div className="cli-status-card-top">
                      <strong>{session.sessionName}</strong>
                      <span>{formatSessionState(session)}</span>
                    </div>
                    <div className="cli-status-card-meta">
                      <span>Port {session.port}</span>
                      <span>{session.windows} windows</span>
                      <span>{session.paneCount} panes</span>
                      <span>{session.attached} attached</span>
                    </div>
                    <div className="cli-status-card-command">{session.activePaneCommand}</div>
                    <div className="cli-status-card-path">{session.activePanePath}</div>
                    <div className="cli-status-card-actions">
                      <button
                        type="button"
                        className="cli-status-card-btn cli-status-card-kill"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleKillCliSession(session.sessionName)
                        }}
                      >
                        Kill
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="cli-status-empty-list">No tmux sessions reported yet.</div>
            )}
          </div>

          <div className="cli-status-section">
            <div className="cli-status-section-title">Existing tmux</div>
            {externalTmuxSessions.length > 0 ? (
              <div className="cli-status-list">
                {externalTmuxSessions.map((session) => (
                  <div
                    key={session.sessionName}
                    className="cli-status-card cli-status-card-external"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenExternalTmuxSession(session.sessionName)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleOpenExternalTmuxSession(session.sessionName)
                      }
                    }}
                  >
                    <div className="cli-status-card-top">
                      <strong>{session.sessionName}</strong>
                      <span>external</span>
                    </div>
                    <div className="cli-status-card-meta">
                      <span>{session.windows} windows</span>
                      <span>{session.paneCount} panes</span>
                      <span>{session.attached} attached</span>
                    </div>
                    <div className="cli-status-card-command">tmux attach -t {session.sessionName}</div>
                    <div className="cli-status-card-path">{session.activePanePath}</div>
                    <div className="cli-status-card-actions">
                      <button
                        type="button"
                        className="cli-status-card-btn cli-status-card-open"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleOpenExternalTmuxSession(session.sessionName)
                        }}
                      >
                        Attach
                      </button>
                      <button
                        type="button"
                        className="cli-status-card-btn cli-status-card-kill"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleKillCliSession(session.sessionName)
                        }}
                      >
                        Kill
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cli-status-empty-list">No external tmux sessions found.</div>
            )}
          </div>

          {activeSession && (
            <div className="cli-status-section">
              <div className="cli-status-section-title">Pane map</div>
              <div className="cli-pane-list">
                {activeSession.panes.map((pane) => (
                  <div key={`${pane.windowIndex}:${pane.paneIndex}`} className={`cli-pane-card ${pane.active ? 'is-active' : ''}`}>
                    <div className="cli-pane-card-head">
                      <strong>w{pane.windowIndex}:p{pane.paneIndex}</strong>
                      <span>{pane.active ? 'active' : 'idle'}</span>
                    </div>
                    <div className="cli-pane-card-command">{pane.command}</div>
                    <div className="cli-pane-card-title">{pane.title || 'untitled'}</div>
                    <code className="cli-pane-card-path">{pane.path}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
