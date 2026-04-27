import type { OpencodeUsageRow } from '../types';
import { useState, useEffect } from 'react';

function MonitorFrame({ title, port }: { title: string; port: number }) {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/port-status?port=${port}`)
      .then(r => r.json())
      .then(data => setAvailable(data.open === true))
      .catch(() => setAvailable(false));
  }, [port]);

  return (
    <div className="usage-monitor-card">
      <div className="sidebar-title">{title}</div>
      {available === null && (
        <div className="monitor-iframe" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)',
          fontSize: '0.8rem', borderRadius: '8px',
        }}>확인 중…</div>
      )}
      {available === false && (
        <div className="monitor-iframe" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '8px',
          background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)',
          fontSize: '0.8rem', borderRadius: '8px',
        }}>
          <span style={{ fontSize: '1.5rem' }}>📡</span>
          <span>서비스 꺼짐</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>:{port}</span>
        </div>
      )}
      {available === true && (
        <iframe
          src={`http://${window.location.hostname}:${port}`}
          className="monitor-iframe"
          title={title}
        />
      )}
    </div>
  );
}

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
        <MonitorFrame title="GPU Monitor (nvtop)" port={7681} />
        <MonitorFrame title="System Monitor (glances)" port={61208} />
      </div>
    </div>
  );
}
