import { useEffect, useId, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter',
});

type MermaidProps = {
  chart: string;
  zoom?: number;
  onWheelZoom?: (event: WheelEvent) => void;
};

const Mermaid = ({ chart, zoom = 1, onWheelZoom }: MermaidProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const chartId = `mermaid-${useId().replace(/:/g, '')}`;
  const clampedZoom = Math.min(2, Math.max(0.5, zoom));

  useEffect(() => {
    let isMounted = true;

    if (canvasRef.current && chart) {
      // Clear previous content
      canvasRef.current.innerHTML = '<div class="loading">Rendering graph...</div>';
      
      try {
        mermaid.render(chartId, chart).then((result) => {
          if (isMounted && canvasRef.current) {
            canvasRef.current.innerHTML = result.svg;
          }
        }).catch(err => {
          console.error("Mermaid error:", err);
          if (isMounted && canvasRef.current) {
            canvasRef.current.innerHTML = `<div class="error">Graph rendering failed: ${err.message}</div>`;
          }
        });
      } catch (err) {
        console.error("Mermaid sync error:", err);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [chart, chartId]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !onWheelZoom) return;

    const handleWheel = (event: WheelEvent) => {
      onWheelZoom(event);
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      wrapper.removeEventListener('wheel', handleWheel);
    };
  }, [onWheelZoom]);

  return (
    <div 
      className="mermaid-wrapper"
      ref={wrapperRef}
      style={{ 
        width: '100%', 
        height: 'calc(100vh - 250px)', 
        overflow: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: onWheelZoom ? 'zoom-in' : 'auto',
      }}
    >
      <div
        className="mermaid-canvas"
        ref={canvasRef}
        style={{
          width: `${clampedZoom * 100}%`,
          minWidth: `${clampedZoom * 100}%`,
        }}
      />
    </div>
  );
};

export default Mermaid;
