import { apiJson, apiGet } from './client';

export type CanvasNodeType = 'sticky' | 'card' | 'rect' | 'diamond';

export type CanvasNode = {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color?: string;
};

export type CanvasEdge = {
  id: string;
  from: string;
  to: string;
  kind: 'line' | 'arrow';
};

export type CanvasView = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

export type CanvasData = {
  version: number;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  view?: CanvasView;
};

export async function getCanvas(): Promise<CanvasData | null> {
  const res = await apiGet<{ data: CanvasData | null }>('/canvas');
  return res.data;
}

export async function saveCanvas(data: CanvasData): Promise<CanvasData> {
  const res = await apiJson<{ data: CanvasData }>('/canvas', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  return res.data;
}
