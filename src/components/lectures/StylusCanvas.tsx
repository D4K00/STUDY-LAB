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

interface StylusCanvasProps {
  initialAnnotations?: string;
  onSave: (annotationsJson: string) => void;
}

export const StylusCanvas: React.FC<StylusCanvasProps> = ({ initialAnnotations, onSave }) => {
  const { t } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [color, setColor] = useState<string>('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [savedStatus, setSavedStatus] = useState<boolean>(false);

  const colors = ['#1e293b', '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea'];

  // Load initial annotations
  useEffect(() => {
    if (initialAnnotations) {
      try {
        const parsed = JSON.parse(initialAnnotations);
        if (Array.isArray(parsed)) {
          setStrokes(parsed);
        }
      } catch (err) {
        console.warn('Could not parse initial annotations', err);
      }
    }
  }, [initialAnnotations]);

  // Redraw canvas whenever strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
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
        ctx.lineWidth = stroke.width * 4;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else if (stroke.tool === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color.startsWith('#')
          ? `${stroke.color}40` // 25% opacity
          : 'rgba(250, 204, 21, 0.4)';
        ctx.lineWidth = stroke.width * 3;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
      }

      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  }, [strokes]);

  // Adjust canvas resolution to parent size on resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== 600) {
        canvas.width = rect.width;
        canvas.height = 600;
        // Trigger redraw
        setStrokes((prev) => [...prev]);
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
    // Enable stylus or finger drawing
    canvasRef.current?.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const pt = getCanvasPoint(e);

    const newStroke: Stroke = {
      tool,
      color: tool === 'highlighter' ? '#facc15' : color,
      width: strokeWidth,
      points: [pt],
    };

    setStrokes((prev) => [...prev, newStroke]);
    setRedoStack([]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCanvasPoint(e);

    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const lastIndex = prev.length - 1;
      const lastStroke = prev[lastIndex];
      const updatedStroke = {
        ...lastStroke,
        points: [...lastStroke.points, pt],
      };
      const copy = [...prev];
      copy[lastIndex] = updatedStroke;
      return copy;
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
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setRedoStack((prev) => [...prev, last]);
    setStrokes((prev) => prev.slice(0, prev.length - 1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setStrokes((prev) => [...prev, next]);
  };

  const handleClear = () => {
    if (window.confirm(t.confirmDelete)) {
      setStrokes([]);
      setRedoStack([]);
    }
  };

  const handleSave = () => {
    const json = JSON.stringify(strokes);
    onSave(json);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border-b border-slate-200 text-xs">
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
            max="12"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Undo, Redo, Clear & Save */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            title={t.undo}
            className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title={t.redo}
            className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            title={t.clearCanvas}
            className="p-1.5 text-slate-600 hover:text-red-600 rounded"
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
      <div className="relative w-full h-[600px] bg-white cursor-crosshair overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 w-full h-full"
        />
        {strokes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs">
            {t.stylusTab} — Use Apple Pencil, stylus, or mouse to sketch & annotate formulas
          </div>
        )}
      </div>
    </div>
  );
};
