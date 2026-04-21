import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter',
});

const Mermaid = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const chartId = useRef(`mermaid-${Math.floor(Math.random() * 10000)}`);

  useEffect(() => {
    let isMounted = true;

    if (ref.current && chart) {
      // Clear previous content
      ref.current.innerHTML = '<div class="loading">Rendering graph...</div>';
      
      try {
        mermaid.render(chartId.current, chart).then((result) => {
          if (isMounted && ref.current) {
            ref.current.innerHTML = result.svg;
          }
        }).catch(err => {
          console.error("Mermaid error:", err);
          if (isMounted && ref.current) {
            ref.current.innerHTML = `<div class="error">Graph rendering failed: ${err.message}</div>`;
          }
        });
      } catch (err) {
        console.error("Mermaid sync error:", err);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [chart]);

  return (
    <div 
      className="mermaid-wrapper" 
      ref={ref} 
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
        border: '1px solid rgba(255,255,255,0.05)'
      }}
    />
  );
};

export default Mermaid;
