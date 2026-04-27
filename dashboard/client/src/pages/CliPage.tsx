import React from 'react';

export interface CliPageProps {
  cliPorts: number[];
  activeCliTab: number | null;
  setActiveCliTab: (port: number) => void;
  handleRemoveCliSession: (port: number, e: React.MouseEvent) => void;
  handleAddCliSession: () => void;
  cliFontSize: number;
  setCliFontSize: (size: number) => void;
  cliBgColor: string;
  setCliBgColor: (color: string) => void;
  cliLineHeight: number;
  setCliLineHeight: (height: number) => void;
  handleApplyCliSettings: () => void;
  cliSettingsApplied: number;
  viewMode: string;
}

export function CliPage({
  cliPorts,
  activeCliTab,
  setActiveCliTab,
  handleRemoveCliSession,
  handleAddCliSession,
  cliFontSize,
  setCliFontSize,
  cliBgColor,
  setCliBgColor,
  cliLineHeight,
  setCliLineHeight,
  handleApplyCliSettings,
  cliSettingsApplied,
  viewMode,
}: CliPageProps) {
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
              {cliPorts.length > 1 && (
                <span className="cli-tab-close" onClick={(e) => handleRemoveCliSession(port, e)}>×</span>
              )}
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
              min={10} max={30}
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
              min={1} max={2} step={0.1}
            />
            <span>{cliLineHeight}</span>
          </div>
          <button
            type="button"
            className="monitor-folder-button"
            style={{ height: '28px', fontSize: '0.75rem', padding: '0 10px' }}
            onClick={() => handleApplyCliSettings()}
          >
            적용
          </button>
        </div>
      </div>

      <div className="cli-sessions" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {cliPorts.map((port) => {
          // Use flat query parameters for maximum compatibility with ttyd 1.7.3
          const terminalUrl = `http://${window.location.hostname}:${port}/?fontSize=${cliFontSize}&lineHeight=${cliLineHeight}&background=${encodeURIComponent(cliBgColor)}&v=${cliSettingsApplied}`

          return (
            <iframe
              key={`${port}-${cliSettingsApplied}`}
              src={terminalUrl}
              className="cli-iframe"
              style={{ display: activeCliTab === port ? 'block' : 'none', flex: 1, border: 'none' }}
              title={`Terminal CLI Session ${port}`}
              sandbox="allow-scripts allow-forms allow-same-origin"
            />
          )
        })}
      </div>
    </div>
  );
}
