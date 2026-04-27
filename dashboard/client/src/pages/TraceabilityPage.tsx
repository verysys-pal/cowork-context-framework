import type { ReactElement } from 'react';
import Mermaid from '../components/Mermaid';

export interface TraceabilityPageProps {
  mermaidChart: string;
}

export function TraceabilityPage({ mermaidChart }: TraceabilityPageProps): ReactElement {
  return mermaidChart ? <Mermaid chart={mermaidChart} /> : <div>Loading graph...</div>;
}
