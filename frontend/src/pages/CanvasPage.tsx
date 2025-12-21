import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import Button from '../components/ui/Button';
import { ApiRequestError } from '../api/client';
import {
  getCanvas,
  saveCanvas,
  type CanvasData,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeType,
} from '../api/canvas';

type Tool = 'select' | 'pan' | 'sticky' | 'card' | 'rect' | 'diamond' | 'connect';
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

type ViewState = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

type DragState =
  | {
      mode: 'pan';
      startX: number;
      startY: number;
      startOffsetX: number;
      startOffsetY: number;
    }
  | {
      mode: 'move';
      nodeId: string;
      startX: number;
      startY: number;
      startNodeX: number;
      startNodeY: number;
      snapshot: CanvasData;
    }
  | {
      mode: 'resize';
      nodeId: string;
      handle: ResizeHandle;
      startX: number;
      startY: number;
      startNode: CanvasNode;
      snapshot: CanvasData;
    };

const CANVAS_WIDTH = 3200;
const CANVAS_HEIGHT = 2000;
const GRID_SIZE = 16;
const HISTORY_LIMIT = 50;

const DEFAULT_BOARD: CanvasData = { version: 1, nodes: [], edges: [] };

const TOOL_LABELS: Record<Tool, string> = {
  select: 'Select',
  pan: 'Pan',
  sticky: 'Sticky',
  card: 'Card',
  rect: 'Rectangle',
  diamond: 'Diamond',
  connect: 'Connector',
};

const NODE_TYPES: CanvasNodeType[] = ['sticky', 'card', 'rect', 'diamond'];

const NODE_PRESETS: Record<
  CanvasNodeType,
  { width: number; height: number; text: string; className: string; fill: string; stroke: string }
> = {
  sticky: {
    width: 200,
    height: 140,
    text: 'Sticky note',
    className: 'bg-amber-100 border-amber-200 text-amber-900',
    fill: '#FEF3C7',
    stroke: '#FCD34D',
  },
  card: {
    width: 240,
    height: 140,
    text: 'Text card',
    className: 'bg-white border-gray-200 text-gray-800',
    fill: '#FFFFFF',
    stroke: '#E5E7EB',
  },
  rect: {
    width: 220,
    height: 130,
    text: 'Process',
    className: 'bg-sky-50 border-sky-200 text-sky-900',
    fill: '#E0F2FE',
    stroke: '#BAE6FD',
  },
  diamond: {
    width: 200,
    height: 120,
    text: 'Decision',
    className: 'bg-slate-100 border-slate-200 text-slate-800',
    fill: '#E2E8F0',
    stroke: '#CBD5F5',
  },
};

function createId(prefix = 'node') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number, size: number) {
  return Math.round(value / size) * size;
}

function cloneBoard(data: CanvasData): CanvasData {
  if (typeof structuredClone === 'function') {
    return structuredClone(data);
  }
  return JSON.parse(JSON.stringify(data)) as CanvasData;
}

function normalizeBoard(data: CanvasData | null): CanvasData {
  if (!data || typeof data !== 'object') return DEFAULT_BOARD;
  const nodes = Array.isArray(data.nodes) ? data.nodes.filter(isCanvasNode) : [];
  const edges = Array.isArray(data.edges) ? data.edges.filter(isCanvasEdge) : [];
  const version = typeof data.version === 'number' ? data.version : 1;
  return { version, nodes, edges };
}

function isCanvasNode(value: unknown): value is CanvasNode {
  if (!value || typeof value !== 'object') return false;
  const node = value as CanvasNode;
  return (
    typeof node.id === 'string' &&
    NODE_TYPES.includes(node.type) &&
    typeof node.x === 'number' &&
    typeof node.y === 'number' &&
    typeof node.width === 'number' &&
    typeof node.height === 'number' &&
    typeof node.text === 'string'
  );
}

function isCanvasEdge(value: unknown): value is CanvasEdge {
  if (!value || typeof value !== 'object') return false;
  const edge = value as CanvasEdge;
  return typeof edge.id === 'string' && typeof edge.from === 'string' && typeof edge.to === 'string';
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.payload?.error?.message ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Unexpected error';
}

function getNodeCenter(node: CanvasNode) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = '';
  let currentY = y;

  words.forEach((word, index) => {
    const testLine = line ? `${line} ${word}` : word;
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
      return;
    }
    line = testLine;
    if (index === words.length - 1) {
      ctx.fillText(line, x, currentY);
    }
  });

  if (!words.length) {
    ctx.fillText('', x, currentY);
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'textarea' || tag === 'input' || target.isContentEditable;
}

export default function CanvasPage() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const viewRef = useRef<ViewState>({ offsetX: 120, offsetY: 120, scale: 1 });
  const saveTimerRef = useRef<number | null>(null);
  const hasLoadedRef = useRef(false);

  const [board, setBoard] = useState<CanvasData>(DEFAULT_BOARD);
  const [view, setView] = useState<ViewState>({ offsetX: 120, offsetY: 120, scale: 1 });
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, setHistoryTick] = useState(0);

  const historyRef = useRef<{ past: CanvasData[]; future: CanvasData[] }>({
    past: [],
    future: [],
  });
  const editSnapshotRef = useRef<{ snapshot: CanvasData; nodeId: string; text: string } | null>(
    null
  );

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getCanvas();
        if (!active) return;
        setBoard(normalizeBoard(data));
        setSaveStatus('saved');
        historyRef.current = { past: [], future: [] };
        setHistoryTick((tick) => tick + 1);
      } catch (err) {
        if (!active) return;
        setLoadError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      return;
    }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    setSaveStatus('saving');
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        await saveCanvas(board);
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      } catch {
        setSaveStatus('error');
      }
    }, 800);
  }, [board, loading]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, CanvasNode>();
    board.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [board.nodes]);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  const statusLabel = useMemo(() => {
    if (saveStatus === 'saving') return 'Saving...';
    if (saveStatus === 'saved') return 'Saved';
    if (saveStatus === 'error') return 'Save failed';
    return 'Idle';
  }, [saveStatus]);

  const statusDotClass = useMemo(() => {
    if (saveStatus === 'saving') return 'bg-amber-400';
    if (saveStatus === 'saved') return 'bg-emerald-500';
    if (saveStatus === 'error') return 'bg-rose-500';
    return 'bg-gray-300';
  }, [saveStatus]);

  const gridBackground = useMemo(() => {
    const size = GRID_SIZE;
    return {
      backgroundImage:
        'linear-gradient(to right, rgba(148, 163, 184, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.2) 1px, transparent 1px)',
      backgroundSize: `${size}px ${size}px`,
    } as const;
  }, []);

  const viewportCursor = useMemo(() => {
    if (activeTool === 'pan') return 'cursor-grab';
    if (activeTool === 'connect') return 'cursor-crosshair';
    if (activeTool === 'sticky' || activeTool === 'card' || activeTool === 'rect' || activeTool === 'diamond') {
      return 'cursor-cell';
    }
    return 'cursor-default';
  }, [activeTool]);

  const setNoticeWithTimeout = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3000);
  }, []);

  const pushHistory = useCallback((snapshot: CanvasData) => {
    const past = [...historyRef.current.past, cloneBoard(snapshot)];
    if (past.length > HISTORY_LIMIT) past.shift();
    historyRef.current = { past, future: [] };
    setHistoryTick((tick) => tick + 1);
  }, []);

  const startEditing = useCallback(
    (node: CanvasNode, snapshot: CanvasData) => {
      editSnapshotRef.current = { snapshot: cloneBoard(snapshot), nodeId: node.id, text: node.text };
      setEditingNodeId(node.id);
    },
    []
  );

  const finishEditing = useCallback(() => {
    const edit = editSnapshotRef.current;
    if (!edit) {
      setEditingNodeId(null);
      return;
    }
    const currentNode = board.nodes.find((node) => node.id === edit.nodeId);
    if (currentNode && currentNode.text !== edit.text) {
      pushHistory(edit.snapshot);
    }
    editSnapshotRef.current = null;
    setEditingNodeId(null);
  }, [board.nodes, pushHistory]);

  const undo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!past.length) return;
    const previous = past[past.length - 1];
    historyRef.current = {
      past: past.slice(0, -1),
      future: [cloneBoard(board), ...future],
    };
    setBoard(previous);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setConnectingFrom(null);
    setHistoryTick((tick) => tick + 1);
  }, [board]);

  const redo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!future.length) return;
    const next = future[0];
    historyRef.current = {
      past: [...past, cloneBoard(board)].slice(-HISTORY_LIMIT),
      future: future.slice(1),
    };
    setBoard(next);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setConnectingFrom(null);
    setHistoryTick((tick) => tick + 1);
  }, [board]);

  const getBoardPoint = useCallback((clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const { offsetX, offsetY, scale } = viewRef.current;
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  }, []);

  const updateNode = useCallback(
    (id: string, updater: (node: CanvasNode) => CanvasNode) => {
      setBoard((current) => ({
        ...current,
        nodes: current.nodes.map((node) => (node.id === id ? updater(node) : node)),
      }));
    },
    [setBoard]
  );

  const addNode = useCallback(
    (type: CanvasNodeType, x: number, y: number) => {
      const preset = NODE_PRESETS[type];
      const width = preset.width;
      const height = preset.height;
      const newNode: CanvasNode = {
        id: createId('node'),
        type,
        width,
        height,
        x: clamp(x - width / 2, 0, CANVAS_WIDTH - width),
        y: clamp(y - height / 2, 0, CANVAS_HEIGHT - height),
        text: preset.text,
      };
      const nextBoard = { ...board, nodes: [...board.nodes, newNode] };
      pushHistory(board);
      setBoard(nextBoard);
      setSelectedNodeId(newNode.id);
      setSelectedEdgeId(null);
      startEditing(newNode, nextBoard);
    },
    [board, pushHistory, startEditing]
  );

  const deleteSelection = useCallback(() => {
    if (selectedNodeId) {
      const snapshot = cloneBoard(board);
      const nodeExists = board.nodes.some((node) => node.id === selectedNodeId);
      if (!nodeExists) return;
      pushHistory(snapshot);
      setBoard((current) => ({
        ...current,
        nodes: current.nodes.filter((node) => node.id !== selectedNodeId),
        edges: current.edges.filter(
          (edge) => edge.from !== selectedNodeId && edge.to !== selectedNodeId
        ),
      }));
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      finishEditing();
      return;
    }

    if (selectedEdgeId) {
      const snapshot = cloneBoard(board);
      const edgeExists = board.edges.some((edge) => edge.id === selectedEdgeId);
      if (!edgeExists) return;
      pushHistory(snapshot);
      setBoard((current) => ({
        ...current,
        edges: current.edges.filter((edge) => edge.id !== selectedEdgeId),
      }));
      setSelectedEdgeId(null);
    }
  }, [board, finishEditing, pushHistory, selectedEdgeId, selectedNodeId]);

  const handleNodePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, node: CanvasNode) => {
      event.stopPropagation();
      if (activeTool === 'connect') {
        if (!connectingFrom) {
          setConnectingFrom(node.id);
          setSelectedNodeId(node.id);
          setSelectedEdgeId(null);
          return;
        }
        if (connectingFrom === node.id) {
          setConnectingFrom(null);
          return;
        }
        const edge: CanvasEdge = {
          id: createId('edge'),
          from: connectingFrom,
          to: node.id,
        };
        pushHistory(board);
        setBoard((current) => ({ ...current, edges: [...current.edges, edge] }));
        setConnectingFrom(null);
        setSelectedNodeId(null);
        setSelectedEdgeId(edge.id);
        return;
      }

      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);

      if (activeTool !== 'select' || editingNodeId === node.id) return;

      const start = getBoardPoint(event.clientX, event.clientY);
      dragRef.current = {
        mode: 'move',
        nodeId: node.id,
        startX: start.x,
        startY: start.y,
        startNodeX: node.x,
        startNodeY: node.y,
        snapshot: cloneBoard(board),
      };
    },
    [activeTool, board, connectingFrom, editingNodeId, getBoardPoint, pushHistory]
  );

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, node: CanvasNode, handle: ResizeHandle) => {
      event.stopPropagation();
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
      finishEditing();
      const start = getBoardPoint(event.clientX, event.clientY);
      dragRef.current = {
        mode: 'resize',
        nodeId: node.id,
        handle,
        startX: start.x,
        startY: start.y,
        startNode: { ...node },
        snapshot: cloneBoard(board),
      };
    },
    [board, finishEditing, getBoardPoint]
  );

  const handleBoardPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activeTool === 'pan') {
        dragRef.current = {
          mode: 'pan',
          startX: event.clientX,
          startY: event.clientY,
          startOffsetX: viewRef.current.offsetX,
          startOffsetY: viewRef.current.offsetY,
        };
        return;
      }

      if (
        activeTool === 'sticky' ||
        activeTool === 'card' ||
        activeTool === 'rect' ||
        activeTool === 'diamond'
      ) {
        const point = getBoardPoint(event.clientX, event.clientY);
        const x = snapEnabled ? snap(point.x, GRID_SIZE) : point.x;
        const y = snapEnabled ? snap(point.y, GRID_SIZE) : point.y;
        addNode(activeTool, x, y);
        return;
      }

      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      finishEditing();
      setConnectingFrom(null);
    },
    [activeTool, addNode, finishEditing, getBoardPoint, snapEnabled]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.mode === 'pan') {
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        setView({
          offsetX: drag.startOffsetX + dx,
          offsetY: drag.startOffsetY + dy,
          scale: viewRef.current.scale,
        });
        return;
      }

      if (drag.mode === 'move') {
        const point = getBoardPoint(event.clientX, event.clientY);
        const dx = point.x - drag.startX;
        const dy = point.y - drag.startY;
        const rawX = drag.startNodeX + dx;
        const rawY = drag.startNodeY + dy;
        const nextX = snapEnabled ? snap(rawX, GRID_SIZE) : rawX;
        const nextY = snapEnabled ? snap(rawY, GRID_SIZE) : rawY;
        updateNode(drag.nodeId, (node) => ({
          ...node,
          x: clamp(nextX, 0, CANVAS_WIDTH - node.width),
          y: clamp(nextY, 0, CANVAS_HEIGHT - node.height),
        }));
        return;
      }

      if (drag.mode === 'resize') {
        const point = getBoardPoint(event.clientX, event.clientY);
        const dx = point.x - drag.startX;
        const dy = point.y - drag.startY;
        const minWidth = 120;
        const minHeight = 80;

        let { x, y, width, height } = drag.startNode;

        if (drag.handle.includes('e')) {
          width = Math.max(minWidth, drag.startNode.width + dx);
        }
        if (drag.handle.includes('s')) {
          height = Math.max(minHeight, drag.startNode.height + dy);
        }
        if (drag.handle.includes('w')) {
          width = Math.max(minWidth, drag.startNode.width - dx);
          x = drag.startNode.x + (drag.startNode.width - width);
        }
        if (drag.handle.includes('n')) {
          height = Math.max(minHeight, drag.startNode.height - dy);
          y = drag.startNode.y + (drag.startNode.height - height);
        }

        const snappedX = snapEnabled ? snap(x, GRID_SIZE) : x;
        const snappedY = snapEnabled ? snap(y, GRID_SIZE) : y;
        const snappedWidth = snapEnabled ? snap(width, GRID_SIZE) : width;
        const snappedHeight = snapEnabled ? snap(height, GRID_SIZE) : height;

        updateNode(drag.nodeId, (node) => ({
          ...node,
          x: clamp(snappedX, 0, CANVAS_WIDTH - snappedWidth),
          y: clamp(snappedY, 0, CANVAS_HEIGHT - snappedHeight),
          width: clamp(snappedWidth, minWidth, CANVAS_WIDTH),
          height: clamp(snappedHeight, minHeight, CANVAS_HEIGHT),
        }));
      }
    },
    [getBoardPoint, snapEnabled, updateNode]
  );

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.mode === 'move' || drag.mode === 'resize') {
      pushHistory(drag.snapshot);
    }
    dragRef.current = null;
  }, [pushHistory]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelection();
      }

      if (event.key === 'Escape') {
        setConnectingFrom(null);
        finishEditing();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteSelection, finishEditing, redo, undo]);

  const applyZoom = useCallback((nextScale: number, anchorX: number, anchorY: number) => {
    const { offsetX, offsetY, scale } = viewRef.current;
    const worldX = (anchorX - offsetX) / scale;
    const worldY = (anchorY - offsetY) / scale;
    const nextOffsetX = anchorX - worldX * nextScale;
    const nextOffsetY = anchorY - worldY * nextScale;
    setView({ offsetX: nextOffsetX, offsetY: nextOffsetY, scale: nextScale });
  }, []);

  const zoomBy = useCallback(
    (delta: number) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nextScale = clamp(viewRef.current.scale + delta, 0.5, 2.5);
      applyZoom(nextScale, rect.width / 2, rect.height / 2);
    },
    [applyZoom]
  );

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const delta = event.deltaY * -0.0012;
    const nextScale = clamp(viewRef.current.scale + delta, 0.5, 2.5);
    applyZoom(nextScale, mouseX, mouseY);
  }, [applyZoom]);

  const handleExport = useCallback(
    (type: 'png' | 'pdf') => {
      if (!board.nodes.length) {
        setNoticeWithTimeout('Add at least one item before exporting.');
        return;
      }

      const padding = 60;
      const minX = Math.min(...board.nodes.map((n) => n.x)) - padding;
      const minY = Math.min(...board.nodes.map((n) => n.y)) - padding;
      const maxX = Math.max(...board.nodes.map((n) => n.x + n.width)) + padding;
      const maxY = Math.max(...board.nodes.map((n) => n.y + n.height)) + padding;
      const width = Math.max(300, maxX - minX);
      const height = Math.max(200, maxY - minY);

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width);
      canvas.height = Math.ceil(height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#111827';

      const nodeById = new Map(board.nodes.map((node) => [node.id, node]));

      board.edges.forEach((edge) => {
        const from = nodeById.get(edge.from);
        const to = nodeById.get(edge.to);
        if (!from || !to) return;
        const start = getNodeCenter(from);
        const end = getNodeCenter(to);
        const startX = start.x - minX;
        const startY = start.y - minY;
        const endX = end.x - minX;
        const endY = end.y - minY;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const angle = Math.atan2(endY - startY, endX - startX);
        const size = 10;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - size * Math.cos(angle - Math.PI / 6), endY - size * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - size * Math.cos(angle + Math.PI / 6), endY - size * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      });

      board.nodes.forEach((node) => {
        const preset = NODE_PRESETS[node.type];
        const x = node.x - minX;
        const y = node.y - minY;
        const width = node.width;
        const height = node.height;

        ctx.fillStyle = preset.fill;
        ctx.strokeStyle = preset.stroke;
        ctx.lineWidth = 2;

        if (node.type === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(x + width / 2, y);
          ctx.lineTo(x + width, y + height / 2);
          ctx.lineTo(x + width / 2, y + height);
          ctx.lineTo(x, y + height / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          drawRoundedRect(ctx, x, y, width, height, 12);
          ctx.fill();
          ctx.stroke();
        }

        ctx.fillStyle = '#111827';
        ctx.font = '14px system-ui, sans-serif';
        ctx.textBaseline = 'top';
        drawWrappedText(ctx, node.text, x + 12, y + 14, width - 24, 18);
      });

      if (type === 'png') {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `canvas-${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }, 'image/png');
        return;
      }

      const imageUrl = canvas.toDataURL('image/png');
      const popup = window.open('', '_blank', 'width=900,height=700');
      if (!popup) {
        setNoticeWithTimeout('Pop-up blocked. Allow pop-ups to export PDF.');
        return;
      }
      popup.document.write(`
        <html>
          <head>
            <title>Canvas Export</title>
            <style>
              body { margin: 0; background: #f8fafc; display: flex; align-items: center; justify-content: center; }
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" />
          </body>
        </html>
      `);
      popup.document.close();
      popup.focus();
      popup.print();
    },
    [board, setNoticeWithTimeout]
  );

  if (loading) {
    return <div className="text-sm text-gray-500">Loading canvas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Canvas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sketch ideas, connect flows, and keep a personal board saved to your account.
          </p>
          {loadError ? <p className="mt-2 text-sm text-rose-600">{loadError}</p> : null}
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
          <span className={`h-2 w-2 rounded-full ${statusDotClass}`} />
          <span>{statusLabel}</span>
          {lastSavedAt ? <span className="text-gray-400">/ {formatTime(lastSavedAt)}</span> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(TOOL_LABELS) as Tool[]).map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => {
                setActiveTool(tool);
                setConnectingFrom(null);
              }}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                activeTool === tool
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {TOOL_LABELS[tool]}
            </button>
          ))}
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo}>
            Undo
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo}>
            Redo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSnapEnabled((prev) => !prev)}
          >
            Snap: {snapEnabled ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => zoomBy(-0.1)}>
            Zoom -
          </Button>
          <Button variant="outline" size="sm" onClick={() => zoomBy(0.1)}>
            Zoom +
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView({ offsetX: 120, offsetY: 120, scale: 1 })}
          >
            Reset view
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('png')}>
            Export PNG
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
            Export PDF
          </Button>
        </div>
      </div>

      {notice ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          {notice}
        </div>
      ) : null}

      <div className="rounded-2xl border-2 border-gray-800 bg-white p-4">
        <div
          ref={viewportRef}
          className={`relative h-[640px] w-full overflow-hidden rounded-xl border border-gray-200 ${viewportCursor}`}
          onPointerDown={handleBoardPointerDown}
          onWheel={handleWheel}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.scale})`,
            }}
          >
            <div className="absolute inset-0" style={gridBackground} />
            <svg
              className="absolute inset-0"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            >
              <defs>
                <marker
                  id="arrow-head"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 7 3.5, 0 7" fill="#111827" />
                </marker>
              </defs>
              {board.edges.map((edge) => {
                const from = nodeMap.get(edge.from);
                const to = nodeMap.get(edge.to);
                if (!from || !to) return null;
                const start = getNodeCenter(from);
                const end = getNodeCenter(to);
                const isSelected = edge.id === selectedEdgeId;
                return (
                  <line
                    key={edge.id}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={isSelected ? '#111827' : '#9CA3AF'}
                    strokeWidth={isSelected ? 2.5 : 2}
                    markerEnd="url(#arrow-head)"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      setSelectedNodeId(null);
                      finishEditing();
                    }}
                  />
                );
              })}
            </svg>

            {board.nodes.map((node) => {
              const preset = NODE_PRESETS[node.type];
              const isSelected = node.id === selectedNodeId;
              const isEditing = node.id === editingNodeId;
              const diamondClip =
                node.type === 'diamond'
                  ? { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }
                  : undefined;

              return (
                <div
                  key={node.id}
                  onPointerDown={(event) => handleNodePointerDown(event, node)}
                  onDoubleClick={() => {
                    setSelectedNodeId(node.id);
                    setSelectedEdgeId(null);
                    startEditing(node, board);
                  }}
                  className={`absolute rounded-xl border-2 px-3 py-3 text-sm shadow-sm transition-colors ${
                    preset.className
                  } ${isSelected ? 'ring-2 ring-gray-900' : ''}`}
                  style={{ left: node.x, top: node.y, width: node.width, height: node.height, ...diamondClip }}
                >
                  {isEditing ? (
                    <textarea
                      value={node.text}
                      onChange={(event) => updateNode(node.id, (curr) => ({ ...curr, text: event.target.value }))}
                      onBlur={finishEditing}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') finishEditing();
                        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                          finishEditing();
                        }
                      }}
                      className="h-full w-full resize-none bg-transparent text-sm text-gray-800 outline-none"
                    />
                  ) : (
                    <div className="h-full w-full whitespace-pre-wrap text-sm text-gray-800">
                      {node.text || 'Untitled'}
                    </div>
                  )}

                  {isSelected && activeTool === 'select' ? (
                    <>
                      {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map((handle) => {
                        const positionClass =
                          handle === 'nw'
                            ? 'left-1 top-1'
                            : handle === 'ne'
                              ? 'right-1 top-1'
                              : handle === 'sw'
                                ? 'left-1 bottom-1'
                                : 'right-1 bottom-1';
                        return (
                          <button
                            key={handle}
                            type="button"
                            onPointerDown={(event) => handleResizePointerDown(event, node, handle)}
                            className={`absolute ${positionClass} h-3 w-3 rounded-full border border-gray-600 bg-white`}
                          />
                        );
                      })}
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            Tip: double-click a node to edit text. Use Delete/Backspace to remove selections.
          </div>
          <div className="flex items-center gap-3">
            {connectingFrom ? <span>Connecting: select another node</span> : null}
            <span>Zoom {Math.round(view.scale * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
