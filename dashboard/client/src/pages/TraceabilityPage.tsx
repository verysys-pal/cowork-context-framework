import { useCallback, useState, type ReactElement } from 'react';
import Mermaid from '../components/Mermaid';

export interface TraceabilityPageProps {
  mermaidChart: string;
}

const clampZoom = (value: number) => Math.min(2, Math.max(0.5, Number(value.toFixed(2))));

export function TraceabilityPage({ mermaidChart }: TraceabilityPageProps): ReactElement {
  if (!mermaidChart) {
    return <div>Loading graph...</div>;
  }

  return <TraceabilityGraph key={mermaidChart} mermaidChart={mermaidChart} />;
}

function TraceabilityGraph({ mermaidChart }: TraceabilityPageProps): ReactElement {
  const [zoom, setZoom] = useState(1);

  const handleWheelZoom = useCallback((event: WheelEvent) => {
    event.preventDefault();

    const pixelDelta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY;
    setZoom((currentZoom) => clampZoom(currentZoom * Math.exp(-pixelDelta * 0.0015)));
  }, []);

  return (
    <div className="traceability-page">
      <div className="traceability-toolbar">
        <div className="traceability-toolbar-label">
          <span>Graph Scale</span>
          <strong>{Math.round(zoom * 100)}%</strong>
        </div>
        <div className="traceability-toolbar-actions">
          <button
            type="button"
            className="traceability-zoom-button"
            onClick={() => setZoom((current) => clampZoom(current - 0.2))}
            disabled={zoom <= 0.5}
          >
            −
          </button>
          <button
            type="button"
            className="traceability-zoom-button traceability-zoom-reset"
            onClick={() => setZoom(1)}
            disabled={zoom === 1}
          >
            Reset
          </button>
          <button
            type="button"
            className="traceability-zoom-button"
            onClick={() => setZoom((current) => clampZoom(current + 0.2))}
            disabled={zoom >= 2}
          >
            +
          </button>
        </div>
      </div>

      <Mermaid chart={mermaidChart} zoom={zoom} onWheelZoom={handleWheelZoom} />
    </div>
  );
}
