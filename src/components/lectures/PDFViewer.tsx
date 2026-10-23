import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Lecture } from '../../types/index.ts';
import { getLecturePDF, saveLecturePDF, generateAcademicLecturePDF } from '../../lib/pdfStorage.ts';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  PenTool,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Save,
  Upload,
  FileText,
  Sparkles,
  Layers,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  FileQuestion,
  Download,
} from 'lucide-react';

// Configure pdfjs worker to local public static asset
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  tool: 'pen' | 'highlighter' | 'eraser';
  color: string;
  width: number;
  points: Point[];
}

export type PageAnnotations = Record<number, Stroke[]>;

interface PDFViewerProps {
  lecture: Lecture;
  courseName?: string;
  onSaveAnnotations: (annotationsJson: string) => Promise<void>;
  onSwitchToNotes?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  lecture,
  courseName,
  onSaveAnnotations,
  onSwitchToNotes,
}) => {
  // PDF State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.25);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(true);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [hasLocalPdf, setHasLocalPdf] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);

  // View Mode: 'browse' (scroll & view) or 'annotate' (draw on page)
  const [interactionMode, setInteractionMode] = useState<'browse' | 'annotate'>('browse');

  // Page-Specific Annotations State: Record<pageNumber, Stroke[]>
  const [pageAnnotations, setPageAnnotations] = useState<PageAnnotations>({});
  const [redoStacks, setRedoStacks] = useState<Record<number, Stroke[]>>({});
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [savingNotice, setSavingNotice] = useState<boolean>(false);

  // Annotation Tools
  const [activeTool, setActiveTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState<string>('#1e293b');
  const [highlighterColor, setHighlighterColor] = useState<string>('#facc15');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);

  // Canvas Refs
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const annotCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const penColors = ['#0f172a', '#2563eb', '#dc2626', '#16a34a', '#7c3aed', '#d97706'];
  const highlighterColors = [
    { name: 'Yellow', color: '#facc15' },
    { name: 'Green', color: '#4ade80' },
    { name: 'Sky', color: '#38bdf8' },
    { name: 'Pink', color: '#f472b6' },
  ];

  // 1. Parse initial annotations (supports page-specific map or legacy flat array)
  useEffect(() => {
    if (lecture.annotations) {
      try {
        const parsed = JSON.parse(lecture.annotations);
        if (Array.isArray(parsed)) {
          // Legacy flat array: assign to page 1
          setPageAnnotations({ 1: parsed });
        } else if (parsed && typeof parsed === 'object') {
          setPageAnnotations(parsed);
        }
      } catch (err) {
        console.warn('Could not parse saved annotations:', err);
      }
    } else {
      setPageAnnotations({});
    }
  }, [lecture.id, lecture.annotations]);

  // 2. Load PDF data from IndexedDB or generate fallback slides
  const loadPdfData = useCallback(async () => {
    setLoadingPdf(true);
    setPdfLoadError(null);

    try {
      let data = await getLecturePDF(lecture.id);

      if (!data || data.byteLength === 0) {
        setHasLocalPdf(false);
        // If it's a PDF file or text, generate a clean academic lecture PDF so it renders immediately
        const fallbackBytes = generateAcademicLecturePDF(
          lecture.title,
          courseName || 'Study Lab Course',
          lecture.extractedText || lecture.notes || ''
        );
        data = fallbackBytes.buffer as ArrayBuffer;
        // Cache generated PDF in IndexedDB for fast subsequent renders
        await saveLecturePDF(lecture.id, data);
        setHasLocalPdf(true);
      } else {
        setHasLocalPdf(true);
      }

      // Load with pdfjs
      const loadingTask = pdfjsLib.getDocument({
        data,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });

      const loadedPdf = await loadingTask.promise;
      setPdfDoc(loadedPdf);
      setTotalPages(loadedPdf.numPages);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Failed to load PDF in viewer:', err);
      setPdfLoadError(err.message || 'Failed to render PDF document');
    } finally {
      setLoadingPdf(false);
    }
  }, [lecture.id, lecture.title, lecture.extractedText, lecture.notes, courseName]);

  useEffect(() => {
    loadPdfData();
  }, [loadPdfData]);

  // 3. Render current PDF page to canvas and sync annotation canvas
  useEffect(() => {
    if (!pdfDoc) return;

    let isMounted = true;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDoc.getPage(currentPage);
        if (!isMounted) return;

        const viewport = page.getViewport({ scale: zoomScale });
        const pdfCanvas = pdfCanvasRef.current;
        const annotCanvas = annotCanvasRef.current;

        if (!pdfCanvas || !annotCanvas) return;

        const dpr = window.devicePixelRatio || 1;

        // Set display dimensions (CSS)
        pdfCanvas.style.width = `${viewport.width}px`;
        pdfCanvas.style.height = `${viewport.height}px`;
        annotCanvas.style.width = `${viewport.width}px`;
        annotCanvas.style.height = `${viewport.height}px`;

        // Set actual buffer dimensions (Hi-DPI)
        pdfCanvas.width = Math.floor(viewport.width * dpr);
        pdfCanvas.height = Math.floor(viewport.height * dpr);
        annotCanvas.width = Math.floor(viewport.width * dpr);
        annotCanvas.height = Math.floor(viewport.height * dpr);

        const pdfCtx = pdfCanvas.getContext('2d', { alpha: false });
        if (!pdfCtx) return;

        pdfCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: pdfCtx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!isMounted) return;

        // Redraw page annotations on top
        redrawCurrentPageAnnotations(viewport.width, viewport.height, dpr);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page rendering error:', err);
        }
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, currentPage, zoomScale]);

  // 4. Redraw annotations for current page
  const redrawCurrentPageAnnotations = (
    cssWidth?: number,
    cssHeight?: number,
    dpr: number = window.devicePixelRatio || 1
  ) => {
    const annotCanvas = annotCanvasRef.current;
    if (!annotCanvas) return;
    const ctx = annotCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, annotCanvas.width, annotCanvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const strokes = pageAnnotations[currentPage] || [];

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
        ctx.lineWidth = stroke.width * 5;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else if (stroke.tool === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = stroke.width * 3.5;
        ctx.strokeStyle = stroke.color.startsWith('#')
          ? `${stroke.color}50` // Semi-transparent
          : 'rgba(250, 204, 21, 0.4)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = stroke.width;
        ctx.strokeStyle = stroke.color;
      }

      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  };

  // Redraw when pageAnnotations for this page change
  useEffect(() => {
    redrawCurrentPageAnnotations();
  }, [pageAnnotations, currentPage]);

  // Pointer event helpers for stylus & mouse drawing
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = annotCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (interactionMode !== 'annotate') return;
    annotCanvasRef.current?.setPointerCapture(e.pointerId);
    setIsDrawing(true);

    const pt = getCanvasPoint(e);
    const newStroke: Stroke = {
      tool: activeTool,
      color: activeTool === 'highlighter' ? highlighterColor : penColor,
      width: strokeWidth,
      points: [pt],
    };

    setPageAnnotations((prev) => {
      const pageStrokes = prev[currentPage] || [];
      return {
        ...prev,
        [currentPage]: [...pageStrokes, newStroke],
      };
    });

    // Clear redo stack for this page
    setRedoStacks((prev) => ({
      ...prev,
      [currentPage]: [],
    }));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || interactionMode !== 'annotate') return;
    const pt = getCanvasPoint(e);

    setPageAnnotations((prev) => {
      const pageStrokes = prev[currentPage] || [];
      if (pageStrokes.length === 0) return prev;

      const lastIdx = pageStrokes.length - 1;
      const lastStroke = pageStrokes[lastIdx];
      const updatedStroke = {
        ...lastStroke,
        points: [...lastStroke.points, pt],
      };

      const copy = [...pageStrokes];
      copy[lastIdx] = updatedStroke;

      return {
        ...prev,
        [currentPage]: copy,
      };
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      setIsDrawing(false);
      try {
        annotCanvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Undo / Redo / Clear for current page
  const handleUndo = () => {
    const strokes = pageAnnotations[currentPage] || [];
    if (strokes.length === 0) return;

    const last = strokes[strokes.length - 1];
    setRedoStacks((prev) => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), last],
    }));

    setPageAnnotations((prev) => ({
      ...prev,
      [currentPage]: strokes.slice(0, strokes.length - 1),
    }));
  };

  const handleRedo = () => {
    const redoStrokes = redoStacks[currentPage] || [];
    if (redoStrokes.length === 0) return;

    const next = redoStrokes[redoStrokes.length - 1];
    setRedoStacks((prev) => ({
      ...prev,
      [currentPage]: redoStrokes.slice(0, redoStrokes.length - 1),
    }));

    setPageAnnotations((prev) => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), next],
    }));
  };

  const handleClearCurrentPage = () => {
    if (window.confirm(`Clear annotations on Page ${currentPage}?`)) {
      setPageAnnotations((prev) => ({
        ...prev,
        [currentPage]: [],
      }));
      setRedoStacks((prev) => ({
        ...prev,
        [currentPage]: [],
      }));
    }
  };

  // Save all page-specific annotations to Firestore
  const handleSaveAllAnnotations = async () => {
    try {
      const json = JSON.stringify(pageAnnotations);
      await onSaveAnnotations(json);
      setSavingNotice(true);
      setTimeout(() => setSavingNotice(false), 2000);
    } catch (err) {
      console.error('Failed to save annotations:', err);
    }
  };

  // Attach a replacement or original PDF file from local device
  const handleAttachPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      await saveLecturePDF(lecture.id, arrayBuffer);
      setHasLocalPdf(true);
      await loadPdfData();
    } catch (err) {
      console.error('Failed to attach PDF file:', err);
      alert('Could not load the selected PDF file.');
    }
  };

  const currentStrokesCount = (pageAnnotations[currentPage] || []).length;
  const annotatedPagesCount = Object.keys(pageAnnotations).filter(
    (p) => (pageAnnotations[Number(p)] || []).length > 0
  ).length;

  return (
    <div className="flex flex-col bg-slate-900/5 dark:bg-slate-950/40 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border-b border-slate-200/80 text-xs">
        {/* Left: Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            title="Toggle Page Thumbnails"
            className={`p-1.5 rounded-lg border transition ${
              showThumbnails
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showThumbnails ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 font-semibold text-slate-700">
            <span>Page</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                  setCurrentPage(val);
                }
              }}
              className="w-12 px-1.5 py-0.5 text-center text-xs font-bold border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            <span className="text-slate-400">/ {totalPages}</span>
          </div>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {pageAnnotations[currentPage]?.length > 0 && (
            <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              Annotated
            </span>
          )}
        </div>

        {/* Center: Mode Selector (Browse vs Annotate) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setInteractionMode('browse')}
            className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              interactionMode === 'browse'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Browse Slides</span>
          </button>
          <button
            onClick={() => setInteractionMode('annotate')}
            className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              interactionMode === 'annotate'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Annotate Page {currentPage}</span>
          </button>
        </div>

        {/* Right: Zoom Controls & Save Annotations */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoomScale((z) => Math.max(0.75, Number((z - 0.2).toFixed(2))))}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-semibold text-slate-500 w-11 text-center">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            onClick={() => setZoomScale((z) => Math.min(2.5, Number((z + 0.2).toFixed(2))))}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomScale(1.25)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            onClick={handleSaveAllAnnotations}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-semibold"
            title="Save Page Annotations to Study Lab Cloud"
          >
            {savingNotice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savingNotice ? 'Saved!' : 'Save Notes'}</span>
          </button>

          {/* Hidden File input to upload real original PDF */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleAttachPDF}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            title="Attach / Replace Original PDF"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-Toolbar: When in Annotate Mode */}
      {interactionMode === 'annotate' && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 text-xs animate-fadeIn">
          {/* Tool Selector */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTool('pen')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition ${
                activeTool === 'pen' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Pen</span>
            </button>
            <button
              onClick={() => setActiveTool('highlighter')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition ${
                activeTool === 'highlighter' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Highlighter</span>
            </button>
            <button
              onClick={() => setActiveTool('eraser')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition ${
                activeTool === 'eraser' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser</span>
            </button>
          </div>

          {/* Color Palettes */}
          {activeTool === 'pen' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Color:</span>
              {penColors.map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full border border-black/10 transition ${
                    penColor === c ? 'scale-120 ring-2 ring-slate-800 ring-offset-1' : 'opacity-80'
                  }`}
                />
              ))}
            </div>
          )}

          {activeTool === 'highlighter' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Highlight:</span>
              {highlighterColors.map((hc) => (
                <button
                  key={hc.color}
                  onClick={() => setHighlighterColor(hc.color)}
                  style={{ backgroundColor: hc.color }}
                  title={hc.name}
                  className={`w-5 h-5 rounded-full border border-black/10 transition ${
                    highlighterColor === hc.color
                      ? 'scale-120 ring-2 ring-slate-800 ring-offset-1'
                      : 'opacity-80'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Stroke Size Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">Size:</span>
            <input
              type="range"
              min="1"
              max="16"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 w-4">{strokeWidth}px</span>
          </div>

          {/* Page Actions: Undo, Redo, Clear Page */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={currentStrokesCount === 0}
              className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-200/50"
              title="Undo stroke"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!(redoStacks[currentPage]?.length > 0)}
              className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded hover:bg-slate-200/50"
              title="Redo stroke"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearCurrentPage}
              disabled={currentStrokesCount === 0}
              className="p-1.5 text-slate-600 hover:text-red-600 disabled:opacity-30 rounded hover:bg-slate-200/50"
              title="Clear drawings on this page"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex relative min-h-[650px] max-h-[82vh] overflow-hidden">
        {/* Thumbnails Sidebar */}
        {showThumbnails && (
          <div className="w-48 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 overflow-y-auto p-3 space-y-2 shrink-0 animate-fadeIn">
            <div className="text-[11px] font-bold uppercase text-slate-400 mb-2">
              Slides ({totalPages})
            </div>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
              const hasAnno = (pageAnnotations[pNum] || []).length > 0;
              const isSelected = pNum === currentPage;
              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-full text-left p-2 rounded-xl text-xs font-medium border transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Slide {pNum}</span>
                  {hasAnno && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-amber-300' : 'bg-blue-600'
                      }`}
                      title="Has Annotations"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* PDF Canvas Viewport Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-4 md:p-8 flex justify-center bg-slate-200/50 dark:bg-slate-950/70"
        >
          {loadingPdf ? (
            <div className="m-auto flex flex-col items-center justify-center p-8 text-slate-500">
              <div className="w-10 h-10 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold">Rendering Academic PDF...</p>
            </div>
          ) : pdfLoadError ? (
            <div className="m-auto max-w-md bg-white p-6 rounded-2xl border border-red-200 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <FileQuestion className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">PDF Render Notice</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{pdfLoadError}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                <Upload className="w-4 h-4" />
                <span>Upload PDF Document</span>
              </button>
            </div>
          ) : (
            <div className="relative shadow-xl rounded-lg bg-white overflow-hidden transition-all duration-150 ease-out border border-slate-300/80">
              {/* Underlying Layer: Rendered PDF Page */}
              <canvas ref={pdfCanvasRef} className="block select-none" />

              {/* Page-Specific Annotation Layer (Aligned directly over PDF canvas) */}
              <canvas
                ref={annotCanvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`absolute inset-0 select-none ${
                  interactionMode === 'annotate'
                    ? 'cursor-crosshair touch-none z-10'
                    : 'pointer-events-none z-0'
                }`}
              />

              {/* Annotate Mode Hint */}
              {interactionMode === 'annotate' && currentStrokesCount === 0 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-900/80 text-white px-3 py-1 rounded-full text-[11px] font-medium backdrop-blur-xs z-20 shadow-md">
                  Drawing on Page {currentPage} with {activeTool}. Click & drag with pen or mouse.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status & Info Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">
            {lecture.fileName} ({Math.round(lecture.fileSize / 1024)} KB)
          </span>
          <span>•</span>
          <span>
            {annotatedPagesCount > 0
              ? `${annotatedPagesCount} of ${totalPages} pages have annotations`
              : 'No annotations on this document yet'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400">
            Tip: Press left/right arrow keys to navigate slides, or toggle "Annotate Page" to draw formulas.
          </span>
        </div>
      </div>
    </div>
  );
};
