import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
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

type Tool = 'select' | 'sticky' | 'card' | 'rect' | 'diamond' | 'line' | 'arrow';
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
type EdgeKind = 'line' | 'arrow';

type ViewState = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

type CanvasUiState = {
  activeTool?: Tool;
  snapEnabled?: boolean;
  view?: ViewState;
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
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      startNodeX: number;
      startNodeY: number;
      snapshot: CanvasData;
      moved: boolean;
    }
  | {
      mode: 'resize';
      nodeId: string;
      handle: ResizeHandle;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      startNode: CanvasNode;
      snapshot: CanvasData;
      moved: boolean;
    };

const CANVAS_WIDTH = 12000;
const CANVAS_HEIGHT = 7500;
const GRID_SIZE = 16;
const HISTORY_LIMIT = 50;
const DRAG_THRESHOLD_PX = 3;
const MIN_SCALE = 0.1;
const MAX_SCALE = 2.5;
const CANVAS_UI_STATE_KEY = 'canvasState:v1';
const MAX_NODE_TEXT_LENGTH = 240;
const NODE_TEXT_HORIZONTAL_PADDING = 12;
const NODE_TEXT_VERTICAL_PADDING = 14;
const NODE_TEXT_LINE_HEIGHT = 18;

const DEFAULT_BOARD: CanvasData = { version: 1, nodes: [], edges: [] };
const DEFAULT_VIEW: ViewState = { offsetX: 0, offsetY: 0, scale: 1 };

type GestureEventLike = Event & { scale?: number; clientX?: number; clientY?: number };

const TOOL_LABELS: Record<Tool, string> = {
  select: 'Select',
  sticky: 'Sticky',
  card: 'Card',
  rect: 'Rectangle',
  diamond: 'Diamond',
  line: 'Line',
  arrow: 'Arrow',
};

const NODE_TYPES: CanvasNodeType[] = ['sticky', 'card', 'rect', 'diamond'];

const NODE_PRESETS: Record<
  CanvasNodeType,
  { width: number; height: number; text: string; className: string; fill: string; stroke: string }
> = {
  sticky: {
    width: 200,
    height: 140,
    text: '',
    className: 'bg-amber-100 border-amber-200 text-amber-900',
    fill: '#FEF3C7',
    stroke: '#FCD34D',
  },
  card: {
    width: 240,
    height: 140,
    text: '',
    className: 'bg-white border-gray-200 text-gray-800',
    fill: '#FFFFFF',
    stroke: '#E5E7EB',
  },
  rect: {
    width: 220,
    height: 130,
    text: '',
    className: 'bg-sky-50 border-sky-200 text-sky-900',
    fill: '#E0F2FE',
    stroke: '#BAE6FD',
  },
  diamond: {
    width: 200,
    height: 120,
    text: '',
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeBoard(data: CanvasData | null): CanvasData {
  if (!data || typeof data !== 'object') return DEFAULT_BOARD;
  const nodes = Array.isArray(data.nodes) ? data.nodes.filter(isCanvasNode) : [];
  const edges = Array.isArray(data.edges)
    ? data.edges.filter(isCanvasEdge).map((edge) => ({
        ...edge,
        kind: edge.kind ?? 'arrow',
      }))
    : [];
  const version = typeof data.version === 'number' ? data.version : 1;
  return { version, nodes, edges };
}

function normalizeView(value: unknown): ViewState {
  if (!value || typeof value !== 'object') return DEFAULT_VIEW;
  const view = value as Partial<ViewState>;
  return {
    offsetX: isFiniteNumber(view.offsetX) ? view.offsetX : DEFAULT_VIEW.offsetX,
    offsetY: isFiniteNumber(view.offsetY) ? view.offsetY : DEFAULT_VIEW.offsetY,
    scale: isFiniteNumber(view.scale) ? view.scale : DEFAULT_VIEW.scale,
  };
}

function loadCanvasUiState(): CanvasUiState | null {
  try {
    const stored = localStorage.getItem(CANVAS_UI_STATE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as CanvasUiState;
  } catch (error) {
    console.warn('Failed to read canvas UI state', error);
    return null;
  }
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
  return (
    typeof edge.id === 'string' &&
    typeof edge.from === 'string' &&
    typeof edge.to === 'string' &&
    (edge.kind === undefined || edge.kind === 'line' || edge.kind === 'arrow')
  );
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

function getEdgePoints(from: CanvasNode, to: CanvasNode, kind: EdgeKind) {
  const start = getNodeCenter(from);
  const end = getNodeCenter(to);
  if (kind !== 'arrow') return { start, end };

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;

  const getEdgePoint = (node: CanvasNode, dirX: number, dirY: number) => {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    const ndx = dirX || 0.0001;
    const ndy = dirY || 0.0001;
    const nLen = Math.hypot(ndx, ndy) || 1;
    const nx = ndx / nLen;
    const ny = ndy / nLen;
    const hw = node.width / 2;
    const hh = node.height / 2;
    const tx = hw / Math.abs(nx);
    const ty = hh / Math.abs(ny);
    const t = Math.min(tx, ty);
    return { x: cx + nx * t, y: cy + ny * t };
  };

  const startEdge = getEdgePoint(from, dx, dy);
  const endEdge = getEdgePoint(to, -dx, -dy);
  const edgeDistance = Math.hypot(endEdge.x - startEdge.x, endEdge.y - startEdge.y);
  const gap = edgeDistance > 28 ? 12 : Math.max(0, edgeDistance / 4);

  return {
    start: { x: startEdge.x + ux * gap, y: startEdge.y + uy * gap },
    end: { x: endEdge.x - ux * gap, y: endEdge.y - uy * gap },
  };
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxHeight?: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && line) {
      lines.push(line);
      line = word;
      return;
    }
    line = testLine;
  });

  if (line) {
    lines.push(line);
  }

  const maxLines = Number.isFinite(maxHeight)
    ? Math.max(1, Math.floor((maxHeight as number) / lineHeight))
    : lines.length || 1;

  const appendEllipsis = (value: string) => {
    const ellipsis = '...';
    let trimmed = value.trimEnd();
    while (trimmed && ctx.measureText(`${trimmed}${ellipsis}`).width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    return trimmed ? `${trimmed}${ellipsis}` : ellipsis;
  };

  const fitLine = (value: string) => {
    if (ctx.measureText(value).width <= maxWidth) return value;
    return appendEllipsis(value);
  };

  const visibleLines = lines.slice(0, maxLines).map(fitLine);
  if (lines.length > maxLines && visibleLines.length) {
    visibleLines[visibleLines.length - 1] = appendEllipsis(
      visibleLines[visibleLines.length - 1]
    );
  }

  if (!words.length) {
    ctx.fillText('', x, y);
    return;
  }

  visibleLines.forEach((lineText, index) => {
    ctx.fillText(lineText, x, y + index * lineHeight);
  });
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
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingEditRef = useRef<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const viewRef = useRef<ViewState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const gestureBaseScaleRef = useRef<number | null>(null);
  const gestureAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const hasLoadedRef = useRef(false);
  const savedCanvasState = useMemo(() => loadCanvasUiState(), []);
  const canvasStateSaveRef = useRef<number | null>(null);

  const [board, setBoard] = useState<CanvasData>(DEFAULT_BOARD);
  const [view, setView] = useState<ViewState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [activeTool, setActiveTool] = useState<Tool>(
    () => savedCanvasState?.activeTool ?? 'select'
  );
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; kind: EdgeKind } | null>(
    null
  );
  const [snapEnabled, setSnapEnabled] = useState(() => savedCanvasState?.snapEnabled ?? true);
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
    if (canvasStateSaveRef.current) {
      window.clearTimeout(canvasStateSaveRef.current);
    }
    canvasStateSaveRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(
          CANVAS_UI_STATE_KEY,
          JSON.stringify({ activeTool, snapEnabled, view })
        );
      } catch (error) {
        console.warn('Failed to persist canvas UI state', error);
      }
    }, 200);
    return () => {
      if (canvasStateSaveRef.current) {
        window.clearTimeout(canvasStateSaveRef.current);
      }
    };
  }, [activeTool, snapEnabled, view]);

  useEffect(() => {
    if (!editingNodeId) return;
    const focusEditor = () => {
      editorRef.current?.focus();
    };
    const timer = window.setTimeout(focusEditor, 0);
    return () => window.clearTimeout(timer);
  }, [editingNodeId]);

  useEffect(() => {
    const updateSize = () => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      setViewportSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getCanvas();
        if (!active) return;
        setBoard(normalizeBoard(data));
        setView(normalizeView(data?.view ?? savedCanvasState?.view));
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
  }, [savedCanvasState]);

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
        await saveCanvas({ ...board, view });
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      } catch {
        setSaveStatus('error');
      }
    }, 800);
  }, [board, loading, view]);

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
    const size = GRID_SIZE * view.scale;
    return {
      backgroundImage:
        'linear-gradient(to right, rgba(148, 163, 184, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.2) 1px, transparent 1px)',
      backgroundSize: `${size}px ${size}px`,
      backgroundPosition: `${view.offsetX}px ${view.offsetY}px`,
    } as const;
  }, [view.offsetX, view.offsetY, view.scale]);

  const viewportCursor = useMemo(() => {
    if (isPanning) return 'cursor-grabbing';
    if (activeTool === 'line' || activeTool === 'arrow') return 'cursor-crosshair';
    if (
      activeTool === 'sticky' ||
      activeTool === 'card' ||
      activeTool === 'rect' ||
      activeTool === 'diamond'
    ) {
      return 'cursor-cell';
    }
    return 'cursor-grab';
  }, [activeTool, isPanning]);

  const setNoticeWithTimeout = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3000);
  }, []);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (exportMenuRef.current && target && exportMenuRef.current.contains(target)) return;
      setExportMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExportMenuOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [exportMenuOpen]);

  const getMinScale = useCallback(() => {
    if (!viewportSize.width || !viewportSize.height) return MIN_SCALE;
    return Math.max(
      MIN_SCALE,
      viewportSize.width / CANVAS_WIDTH,
      viewportSize.height / CANVAS_HEIGHT
    );
  }, [viewportSize.height, viewportSize.width]);

  const clampViewState = useCallback(
    (nextView: ViewState) => {
      const minScale = getMinScale();
      const scale = clamp(nextView.scale, minScale, MAX_SCALE);
      if (!viewportSize.width || !viewportSize.height) {
        return { ...nextView, scale };
      }

      const boardWidth = CANVAS_WIDTH * scale;
      const boardHeight = CANVAS_HEIGHT * scale;
      const minOffsetX = Math.min(0, viewportSize.width - boardWidth);
      const minOffsetY = Math.min(0, viewportSize.height - boardHeight);
      const offsetX = clamp(nextView.offsetX, minOffsetX, 0);
      const offsetY = clamp(nextView.offsetY, minOffsetY, 0);

      return { offsetX, offsetY, scale };
    },
    [getMinScale, viewportSize.height, viewportSize.width]
  );

  const applyViewState = useCallback(
    (nextView: ViewState) => {
      const clamped = clampViewState(nextView);
      setView((current) => {
        if (
          current.offsetX === clamped.offsetX &&
          current.offsetY === clamped.offsetY &&
          current.scale === clamped.scale
        ) {
          return current;
        }
        return clamped;
      });
    },
    [clampViewState]
  );

  useEffect(() => {
    applyViewState(view);
  }, [applyViewState, view]);

  useEffect(() => {
    if (!viewportSize.width || !viewportSize.height) return;
    applyViewState(viewRef.current);
  }, [applyViewState, viewportSize.height, viewportSize.width]);

  const pushHistory = useCallback((snapshot: CanvasData) => {
    const past = [...historyRef.current.past, cloneBoard(snapshot)];
    if (past.length > HISTORY_LIMIT) past.shift();
    historyRef.current = { past, future: [] };
    setHistoryTick((tick) => tick + 1);
  }, []);

  const startEditing = useCallback((node: CanvasNode, snapshot: CanvasData) => {
    editSnapshotRef.current = { snapshot: cloneBoard(snapshot), nodeId: node.id, text: node.text };
    setEditingNodeId(node.id);
    window.requestAnimationFrame(() => {
      editorRef.current?.focus();
    });
  }, []);

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
      pendingEditRef.current = newNode.id;
    },
    [board, pushHistory]
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
      if (activeTool === 'line' || activeTool === 'arrow') {
        const kind: EdgeKind = activeTool === 'line' ? 'line' : 'arrow';
        if (!connectingFrom) {
          setConnectingFrom({ nodeId: node.id, kind });
          setSelectedNodeId(node.id);
          setSelectedEdgeId(null);
          return;
        }
        if (connectingFrom.nodeId === node.id) {
          setConnectingFrom(null);
          return;
        }
        const edge: CanvasEdge = {
          id: createId('edge'),
          from: connectingFrom.nodeId,
          to: node.id,
          kind: connectingFrom.kind,
        };
        pushHistory(board);
        setBoard((current) => ({ ...current, edges: [...current.edges, edge] }));
        setConnectingFrom(null);
        setSelectedNodeId(null);
        setSelectedEdgeId(edge.id);
        setActiveTool('select');
        return;
      }

      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);

      if (activeTool !== 'select' || editingNodeId === node.id) return;

      const start = getBoardPoint(event.clientX, event.clientY);
      dragRef.current = {
        mode: 'move',
        nodeId: node.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: start.x,
        startY: start.y,
        startNodeX: node.x,
        startNodeY: node.y,
        snapshot: cloneBoard(board),
        moved: false,
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
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: start.x,
        startY: start.y,
        startNode: { ...node },
        snapshot: cloneBoard(board),
        moved: false,
      };
    },
    [board, finishEditing, getBoardPoint]
  );

  const handleBoardPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activeTool === 'select') {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        finishEditing();
        setConnectingFrom(null);
        dragRef.current = {
          mode: 'pan',
          startX: event.clientX,
          startY: event.clientY,
          startOffsetX: viewRef.current.offsetX,
          startOffsetY: viewRef.current.offsetY,
        };
        setIsPanning(true);
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
        setActiveTool('select');
        setConnectingFrom(null);
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
        applyViewState({
          offsetX: drag.startOffsetX + dx,
          offsetY: drag.startOffsetY + dy,
          scale: viewRef.current.scale,
        });
        return;
      }

      if (drag.mode === 'move') {
        if (!drag.moved) {
          const deltaX = Math.abs(event.clientX - drag.startClientX);
          const deltaY = Math.abs(event.clientY - drag.startClientY);
          if (Math.max(deltaX, deltaY) < DRAG_THRESHOLD_PX) {
            return;
          }
          drag.moved = true;
        }
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
        if (!drag.moved) {
          const deltaX = Math.abs(event.clientX - drag.startClientX);
          const deltaY = Math.abs(event.clientY - drag.startClientY);
          if (Math.max(deltaX, deltaY) < DRAG_THRESHOLD_PX) {
            return;
          }
          drag.moved = true;
        }
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
    [applyViewState, getBoardPoint, snapEnabled, updateNode]
  );

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (drag) {
      if (drag.mode === 'move') {
        if (drag.moved) {
          pushHistory(drag.snapshot);
        } else if (activeTool === 'select') {
          const node = board.nodes.find((item) => item.id === drag.nodeId);
          if (node) {
            startEditing(node, board);
          }
        }
      }

      if (drag.mode === 'resize' && drag.moved) {
        pushHistory(drag.snapshot);
      }

      if (drag.mode === 'pan') {
        setIsPanning(false);
      }
      dragRef.current = null;
    }

    const pendingNodeId = pendingEditRef.current;
    if (pendingNodeId) {
      const node = board.nodes.find((item) => item.id === pendingNodeId);
      if (node) {
        startEditing(node, board);
      }
      pendingEditRef.current = null;
    }
  }, [activeTool, board, pushHistory, startEditing]);

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

  const applyZoom = useCallback(
    (nextScale: number, anchorX: number, anchorY: number) => {
      const { offsetX, offsetY, scale } = viewRef.current;
      const worldX = (anchorX - offsetX) / scale;
      const worldY = (anchorY - offsetY) / scale;
      const nextOffsetX = anchorX - worldX * nextScale;
      const nextOffsetY = anchorY - worldY * nextScale;
      applyViewState({ offsetX: nextOffsetX, offsetY: nextOffsetY, scale: nextScale });
    },
    [applyViewState]
  );

  const zoomBy = useCallback(
    (delta: number) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      const minScale = getMinScale();
      const nextScale = clamp(viewRef.current.scale + delta, minScale, MAX_SCALE);
      applyZoom(nextScale, rect.width / 2, rect.height / 2);
    },
    [applyZoom, getMinScale]
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (event.cancelable) event.preventDefault();
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;

      const panMultiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const zoomMultiplier = event.deltaMode === 1 ? 12 : event.deltaMode === 2 ? 120 : 1;

      if (event.ctrlKey || event.metaKey) {
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const minScale = getMinScale();
        const zoomFactor = Math.exp(-(event.deltaY * zoomMultiplier) * 0.04);
        const nextScale = clamp(viewRef.current.scale * zoomFactor, minScale, MAX_SCALE);
        applyZoom(nextScale, mouseX, mouseY);
        return;
      }

      const nextOffsetX = viewRef.current.offsetX - event.deltaX * panMultiplier;
      const nextOffsetY = viewRef.current.offsetY - event.deltaY * panMultiplier;
      applyViewState({
        offsetX: nextOffsetX,
        offsetY: nextOffsetY,
        scale: viewRef.current.scale,
      });
    },
    [applyViewState, applyZoom, getMinScale]
  );

  useEffect(() => {
    const wheelListener = (event: WheelEvent) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const target = event.target as Node | null;
      const rect = viewport.getBoundingClientRect();
      const withinBounds =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (target && !viewport.contains(target) && !withinBounds) return;
      handleWheel(event);
    };
    window.addEventListener('wheel', wheelListener, { passive: false });
    return () => {
      window.removeEventListener('wheel', wheelListener);
    };
  }, [handleWheel]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleGestureStart = (event: GestureEventLike) => {
      if (event.cancelable) event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      gestureBaseScaleRef.current = viewRef.current.scale;
      const clientX =
        typeof event.clientX === 'number' ? event.clientX : rect.left + rect.width / 2;
      const clientY =
        typeof event.clientY === 'number' ? event.clientY : rect.top + rect.height / 2;
      gestureAnchorRef.current = { x: clientX - rect.left, y: clientY - rect.top };
    };

    const handleGestureChange = (event: GestureEventLike) => {
      if (event.cancelable) event.preventDefault();
      const baseScale = gestureBaseScaleRef.current ?? viewRef.current.scale;
      const scaleDelta = typeof event.scale === 'number' ? event.scale : 1;
      const minScale = getMinScale();
      const nextScale = clamp(baseScale * scaleDelta, minScale, MAX_SCALE);
      const rect = viewport.getBoundingClientRect();
      const anchor = gestureAnchorRef.current ?? { x: rect.width / 2, y: rect.height / 2 };
      applyZoom(nextScale, anchor.x, anchor.y);
    };

    const handleGestureEnd = (event: GestureEventLike) => {
      if (event.cancelable) event.preventDefault();
      gestureBaseScaleRef.current = null;
      gestureAnchorRef.current = null;
    };

    // Safari trackpad pinch zoom emits gesture events.
    viewport.addEventListener('gesturestart', handleGestureStart as EventListener, {
      passive: false,
    });
    viewport.addEventListener('gesturechange', handleGestureChange as EventListener, {
      passive: false,
    });
    viewport.addEventListener('gestureend', handleGestureEnd as EventListener, {
      passive: false,
    });
    return () => {
      viewport.removeEventListener('gesturestart', handleGestureStart as EventListener);
      viewport.removeEventListener('gesturechange', handleGestureChange as EventListener);
      viewport.removeEventListener('gestureend', handleGestureEnd as EventListener);
    };
  }, [applyZoom, getMinScale]);

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
        const points = getEdgePoints(from, to, edge.kind);
        const startX = points.start.x - minX;
        const startY = points.start.y - minY;
        const endX = points.end.x - minX;
        const endY = points.end.y - minY;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        if (edge.kind === 'arrow') {
          const angle = Math.atan2(endY - startY, endX - startX);
          const size = 10;
          ctx.save();
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - size * Math.cos(angle - Math.PI / 6),
            endY - size * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            endX - size * Math.cos(angle + Math.PI / 6),
            endY - size * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
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
        drawWrappedText(
          ctx,
          node.text,
          x + NODE_TEXT_HORIZONTAL_PADDING,
          y + NODE_TEXT_VERTICAL_PADDING,
          width - NODE_TEXT_HORIZONTAL_PADDING * 2,
          NODE_TEXT_LINE_HEIGHT,
          height - NODE_TEXT_VERTICAL_PADDING * 2
        );
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
    <div className="flex h-full flex-col gap-6 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Canvas</h1>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600">
              <span className={`h-2 w-2 rounded-full ${statusDotClass}`} />
              <span>{statusLabel}</span>
              {lastSavedAt ? (
                <span className="text-gray-400">/ {formatTime(lastSavedAt)}</span>
              ) : null}
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Sketch ideas, connect flows, and keep a personal board saved to your account.
          </p>
          {loadError ? <p className="mt-2 text-sm text-rose-600">{loadError}</p> : null}
        </div>
        <div ref={exportMenuRef} className="relative z-30">
          <Button
            variant="primary"
            size="sm"
            className="border-blue-900 bg-blue-900 text-white hover:border-blue-800 hover:bg-blue-800 focus-visible:ring-blue-200"
            onClick={() => setExportMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={exportMenuOpen}
          >
            Export
          </Button>
          {exportMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handleExport('png');
                  setExportMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center px-3 py-2 text-gray-700 hover:bg-gray-50"
              >
                Export PNG
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handleExport('pdf');
                  setExportMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center px-3 py-2 text-gray-700 hover:bg-gray-50"
              >
                Export PDF
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
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
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors transition-opacity ${
                  activeTool === tool
                    ? 'border-gray-900 bg-gray-900 text-white opacity-100 hover:border-gray-800 hover:bg-gray-800'
                    : 'border-gray-200 bg-white text-gray-700 opacity-90 hover:border-slate-300 hover:bg-slate-100 hover:text-gray-900 hover:opacity-100'
                }`}
              >
                {TOOL_LABELS[tool]}
              </button>
            ))}
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              className="opacity-80 transition-opacity hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 hover:opacity-95"
            >
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              className="opacity-80 transition-opacity hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 hover:opacity-95"
            >
              Redo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSnapEnabled((prev) => !prev)}
              className="opacity-80 transition-opacity hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 hover:opacity-95"
            >
              Snap: {snapEnabled ? 'On' : 'Off'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => zoomBy(-0.1)}
              className="opacity-80 transition-opacity hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 hover:opacity-95"
            >
              Zoom -
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => zoomBy(0.1)}
              className="opacity-80 transition-opacity hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 hover:opacity-95"
            >
              Zoom +
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyViewState(DEFAULT_VIEW)}
              className="opacity-80 transition-opacity hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 hover:opacity-95"
            >
              Reset view
            </Button>
          </div>
        </div>

        {notice ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            {notice}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border-2 border-gray-800 bg-white p-4">
          <div
            ref={viewportRef}
            className={`relative min-h-0 flex-1 w-full overflow-hidden overscroll-contain rounded-xl border border-gray-200 bg-white ${viewportCursor}`}
            onPointerDown={handleBoardPointerDown}
            style={gridBackground}
          >
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                transform: `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.scale})`,
              }}
            >
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
                    refX="7"
                    refY="4"
                    orient="auto"
                  >
                    <path
                      d="M1 1.25 L7 4 L1 6.75 Z"
                      fill="#111827"
                      stroke="#111827"
                      strokeWidth="1"
                      strokeLinejoin="round"
                    />
                  </marker>
                </defs>
                {board.edges.map((edge) => {
                  const from = nodeMap.get(edge.from);
                  const to = nodeMap.get(edge.to);
                  if (!from || !to) return null;
                  const points = getEdgePoints(from, to, edge.kind);
                  const isSelected = edge.id === selectedEdgeId;
                  const isArrow = edge.kind === 'arrow';
                  return (
                    <line
                      key={edge.id}
                      x1={points.start.x}
                      y1={points.start.y}
                      x2={points.end.x}
                      y2={points.end.y}
                      stroke={isSelected ? '#111827' : '#9CA3AF'}
                      strokeWidth={isSelected ? 2.5 : 2}
                      markerEnd={isArrow ? 'url(#arrow-head)' : undefined}
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
                const isCentered = node.type === 'rect' || node.type === 'diamond';
                const hasText = node.text.trim().length > 0;
                const textMaxLines = Math.max(
                  1,
                  Math.floor(
                    (node.height - NODE_TEXT_VERTICAL_PADDING * 2) / NODE_TEXT_LINE_HEIGHT
                  )
                );
                const textClampStyle: CSSProperties = {
                  display: '-webkit-box',
                  WebkitLineClamp: textMaxLines,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  maxWidth: '100%',
                };
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
                    className={`absolute rounded-xl border-2 px-3 py-3 text-sm shadow-[0_4px_10px_rgba(148,163,184,0.3)] transition-colors ${
                      preset.className
                    } ${isSelected ? 'ring-2 ring-gray-900' : ''}`}
                    style={{
                      left: node.x,
                      top: node.y,
                      width: node.width,
                      height: node.height,
                      ...diamondClip,
                    }}
                  >
                    {isEditing ? (
                      <textarea
                        ref={isEditing ? editorRef : null}
                        value={node.text}
                        onChange={(event) =>
                          updateNode(node.id, (curr) => ({ ...curr, text: event.target.value }))
                        }
                        maxLength={MAX_NODE_TEXT_LENGTH}
                        onBlur={finishEditing}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') finishEditing();
                          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                            finishEditing();
                          }
                        }}
                        className={[
                          'h-full w-full resize-none bg-transparent text-sm text-gray-800 outline-none',
                          'overflow-hidden whitespace-pre-wrap break-words',
                          isCentered ? 'text-center' : 'text-left',
                        ].join(' ')}
                        autoFocus
                      />
                    ) : (
                      <div
                        className={[
                          'h-full w-full overflow-hidden whitespace-pre-wrap break-words text-sm text-gray-800',
                          isCentered ? 'flex items-center justify-center text-center' : 'text-left',
                        ].join(' ')}
                      >
                        {hasText ? (
                          <span className="block whitespace-pre-wrap break-words" style={textClampStyle}>
                            {node.text}
                          </span>
                        ) : (
                          <span className="block h-0.5 w-16 animate-pulse rounded bg-gray-300/80" />
                        )}
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
                          const cursorClass =
                            handle === 'nw' || handle === 'se'
                              ? 'cursor-nwse-resize'
                              : 'cursor-nesw-resize';
                          return (
                            <button
                              key={handle}
                              type="button"
                              onPointerDown={(event) =>
                                handleResizePointerDown(event, node, handle)
                              }
                              className={`absolute ${positionClass} ${cursorClass} h-3 w-3 rounded-full border border-gray-600 bg-white`}
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
              Tip: drag or scroll to pan, pinch or ctrl+scroll to zoom, click a node to edit text.
            </div>
            <div className="flex items-center gap-3">
              {connectingFrom ? (
                <span>
                  Connecting {connectingFrom.kind === 'arrow' ? 'arrow' : 'line'}: select another
                  node
                </span>
              ) : null}
              <span>Zoom {Math.round(view.scale * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
