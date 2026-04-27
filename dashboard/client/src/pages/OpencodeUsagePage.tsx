import type { OpencodeUsageRow } from '../types';

export interface OpencodeUsagePageProps {
  opencodeUsageLoading: boolean;
  opencodeUsage: OpencodeUsageRow[];
  opencodeUsageRefreshing: boolean;
  opencodeUsageError: string | null;
}

export function OpencodeUsagePage({
  opencodeUsageLoading,
  opencodeUsage,
  opencodeUsageRefreshing,
  opencodeUsageError,
}: OpencodeUsagePageProps) {
  return (
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
        <div className="usage-rows-container">
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
      <div className="usage-monitor-grid">
        <div className="usage-monitor-card">
          <div className="sidebar-title">GPU Monitor (nvtop)</div>
          <iframe
            src={`http://${window.location.hostname}:7681`}
            className="monitor-iframe"
            title="nvtop"
          />
        </div>
        <div className="usage-monitor-card">
          <div className="sidebar-title">System Monitor (glances)</div>
          <iframe
            src={`http://${window.location.hostname}:61208`}
            className="monitor-iframe"
            title="glances"
          />
        </div>
      </div>
    </div>
  );
}
