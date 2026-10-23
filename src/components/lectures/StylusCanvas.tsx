import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  PenTool,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Save,
  Palette,
  ChevronLeft,
  ChevronRight,
  Plus,
  Layers,
} from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  tool: 'pen' | 'highlighter' | 'eraser';
  color: string;
  width: number;
  points: Point[];
}

type PageAnnotations = Record<number, Stroke[]>;

interface StylusCanvasProps {
  initialAnnotations?: string;
  onSave: (annotationsJson: string) => void;
}

export const StylusCanvas: React.FC<StylusCanvasProps> = ({ initialAnnotations, onSave }) => {
  const { t } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activePage, setActivePage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageStrokes, setPageStrokes] = useState<PageAnnotations>({ 1: [] });
  const [pageRedoStacks, setPageRedoStacks] = useState<Record<number, Stroke[]>>({ 1: [] });

  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [color, setColor] = useState<string>('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [savedStatus, setSavedStatus] = useState<boolean>(false);

  const colors = ['#1e293b', '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea'];

  // Load initial annotations (handles both page-specific map and legacy flat array)
  useEffect(() => {
    if (initialAnnotations) {
      try {
        const parsed = JSON.parse(initialAnnotations);
        if (Array.isArray(parsed)) {
          setPageStrokes({ 1: parsed });
          setTotalPages(1);
        } else if (parsed && typeof parsed === 'object') {
          setPageStrokes(parsed);
          const pageNumbers = Object.keys(parsed).map(Number).filter((n) => !isNaN(n) && n > 0);
          const maxP = Math.max(1, ...pageNumbers);
          setTotalPages(maxP);
        }
      } catch (err) {
        console.warn('Could not parse initial annotations', err);
      }
    }
  }, [initialAnnotations]);

  const currentStrokes = pageStrokes[activePage] || [];
  const currentRedo = pageRedoStacks[activePage] || [];

  // Redraw canvas whenever current page strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of currentStrokes) {
      if (stroke.points.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.width * 5;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else if (stroke.tool === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color.startsWith('#')
          ? `${stroke.color}40` // 25% opacity
          : 'rgba(250, 204, 21, 0.4)';
        ctx.lineWidth = stroke.width * 3.5;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
      }

      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  }, [currentStrokes, activePage]);

  // Adjust canvas resolution to parent size on resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== 650) {
        canvas.width = rect.width;
        canvas.height = 650;
        // Trigger redraw
        setPageStrokes((prev) => ({ ...prev }));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const pt = getCanvasPoint(e);

    const newStroke: Stroke = {
      tool,
      color: tool === 'highlighter' ? '#facc15' : color,
      width: strokeWidth,
      points: [pt],
    };

    setPageStrokes((prev) => ({
      ...prev,
      [activePage]: [...(prev[activePage] || []), newStroke],
    }));

    setPageRedoStacks((prev) => ({
      ...prev,
      [activePage]: [],
    }));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCanvasPoint(e);

    setPageStrokes((prev) => {
      const strokes = prev[activePage] || [];
      if (strokes.length === 0) return prev;
      const lastIndex = strokes.length - 1;
      const lastStroke = strokes[lastIndex];
      const updatedStroke = {
        ...lastStroke,
        points: [...lastStroke.points, pt],
      };
      const copy = [...strokes];
      copy[lastIndex] = updatedStroke;
      return {
        ...prev,
        [activePage]: copy,
      };
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      setIsDrawing(false);
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleUndo = () => {
    if (currentStrokes.length === 0) return;
    const last = currentStrokes[currentStrokes.length - 1];
    setPageRedoStacks((prev) => ({
      ...prev,
      [activePage]: [...(prev[activePage] || []), last],
    }));
    setPageStrokes((prev) => ({
      ...prev,
      [activePage]: currentStrokes.slice(0, currentStrokes.length - 1),
    }));
  };

  const handleRedo = () => {
    if (currentRedo.length === 0) return;
    const next = currentRedo[currentRedo.length - 1];
    setPageRedoStacks((prev) => ({
      ...prev,
      [activePage]: currentRedo.slice(0, currentRedo.length - 1),
    }));
    setPageStrokes((prev) => ({
      ...prev,
      [activePage]: [...currentStrokes, next],
    }));
  };

  const handleClear = () => {
    if (window.confirm(`Clear annotations on page ${activePage}?`)) {
      setPageStrokes((prev) => ({
        ...prev,
        [activePage]: [],
      }));
      setPageRedoStacks((prev) => ({
        ...prev,
        [activePage]: [],
      }));
    }
  };

  const handleSave = () => {
    const json = JSON.stringify(pageStrokes);
    onSave(json);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const handleAddPage = () => {
    const newPageNum = totalPages + 1;
    setTotalPages(newPageNum);
    setActivePage(newPageNum);
    setPageStrokes((prev) => ({ ...prev, [newPageNum]: [] }));
  };

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border-b border-slate-200 text-xs">
        {/* Page navigation */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
          <button
            disabled={activePage <= 1}
            onClick={() => setActivePage((p) => Math.max(1, p - 1))}
            className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-800 px-1">
            Page {activePage} / {totalPages}
          </span>
          <button
            disabled={activePage >= totalPages}
            onClick={() => setActivePage((p) => Math.min(totalPages, p + 1))}
            className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleAddPage}
            className="flex items-center gap-1 px-2 py-0.5 ml-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
            title="Add Whiteboard Page"
          >
            <Plus className="w-3 h-3" />
            <span>New Page</span>
          </button>
        </div>

        {/* Tool selector */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setTool('pen')}
            className={`p-1.5 rounded-md flex items-center gap-1 font-medium transition ${
              tool === 'pen' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>{t.pen}</span>
          </button>
          <button
            onClick={() => setTool('highlighter')}
            className={`p-1.5 rounded-md flex items-center gap-1 font-medium transition ${
              tool === 'highlighter' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>{t.highlighter}</span>
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-1.5 rounded-md flex items-center gap-1 font-medium transition ${
              tool === 'eraser' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>{t.eraser}</span>
          </button>
        </div>

        {/* Color palette */}
        {tool !== 'eraser' && (
          <div className="flex items-center gap-1.5">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full border transition ${
                  color === c ? 'scale-115 ring-2 ring-slate-400' : 'opacity-80 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        )}

        {/* Stroke width */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Size:</span>
          <input
            type="range"
            min="1"
            max="16"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Undo, Redo, Clear & Save */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={handleUndo}
            disabled={currentStrokes.length === 0}
            title={t.undo}
            className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={currentRedo.length === 0}
            title={t.redo}
            className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            disabled={currentStrokes.length === 0}
            title={t.clearCanvas}
            className="p-1.5 text-slate-600 hover:text-red-600 disabled:opacity-30 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savedStatus ? t.notesSaved : t.saveNotes}</span>
          </button>
        </div>
      </div>

      {/* Drawing Area with touch-action: none for Apple Pencil / Stylus */}
      <div className="relative w-full h-[650px] bg-white cursor-crosshair overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 w-full h-full"
        />
        {currentStrokes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs">
            {t.stylusTab} — Page {activePage}: Use Apple Pencil, stylus, or mouse to sketch & annotate formulas
          </div>
        )}
      </div>
    </div>
  );
};
