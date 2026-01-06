'use client';

import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useTranslation } from '@/lib/LanguageContext';

type Tool = 'pen' | 'arrow' | 'select' | 'eraser' | 'text';

interface Point {
  x: number;
  y: number;
}

interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface TextElement {
  id: string;
  text: string;
  position: Point;
  color: string;
  fontSize: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface SketchPadProps {
  height?: string;
  className?: string;
  onContentChange?: (hasContent: boolean) => void;
}

export interface SketchPadHandle {
  clear: () => void;
  getImage: () => string | null;
  saveSnapshot: () => void;
  getAllSketches: () => string[];
  resetForNewQuestion: () => void;
  hasContent: () => boolean;
}

const COLORS = [
  { name: 'black', value: '#000000' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'red', value: '#ef4444' },
  { name: 'green', value: '#22c55e' },
];

const DRAWING_TOOLS: { id: Tool; icon: string; labelKey: string }[] = [
  { id: 'pen', icon: '✏️', labelKey: 'sketchPad.pen' },
];

const TEXT_TOOLS: { id: Tool; icon: string; labelKey: string }[] = [
  { id: 'text', icon: 'Aa', labelKey: 'sketchPad.text' },
  { id: 'arrow', icon: '↖️', labelKey: 'sketchPad.arrow' },
];

const ERASER_RADIUS = 15;
const STROKE_WIDTH = 2;
const FONT_SIZES = [12, 16, 20, 24, 32];

export const SketchPad = forwardRef<SketchPadHandle, SketchPadProps>(
  ({ height = '300px', className = '', onContentChange }, ref) => {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    // Offscreen buffer for actual drawing (double buffering for pan/zoom)
    const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const bufferCtxRef = useRef<CanvasRenderingContext2D | null>(null);

    // Drawing state
    const [currentTool, setCurrentTool] = useState<Tool>('pen');
    const [currentColor, setCurrentColor] = useState(COLORS[0].value);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPoint, setLastPoint] = useState<Point | null>(null);

    // Panning state
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);

    // Content bounds (for pan constraints)
    const [contentBounds, setContentBounds] = useState<ContentBounds>({
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    });

    // Multi-sketch state
    const [savedSketches, setSavedSketches] = useState<string[]>([]);

    // Text input state
    const [isTextInputVisible, setIsTextInputVisible] = useState(false);
    const [textInputPosition, setTextInputPosition] = useState<Point>({ x: 0, y: 0 });
    const [textInputValue, setTextInputValue] = useState('');
    const textInputRef = useRef<HTMLInputElement>(null);

    // Text elements state (for arrow tool dragging)
    const [textElements, setTextElements] = useState<TextElement[]>([]);
    const [draggedTextId, setDraggedTextId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

    // Eraser cursor position (for visual indicator)
    const [eraserCursorPos, setEraserCursorPos] = useState<Point | null>(null);

    // Text font size (index into FONT_SIZES)
    const [fontSizeIndex, setFontSizeIndex] = useState(1); // Default to 16px

    // Track content state for onContentChange callback
    const lastContentStateRef = useRef<boolean>(false);

    // Check if canvas has content (strokes or text)
    const checkHasContent = (): boolean => {
      const bufferCtx = bufferCtxRef.current;
      const bufferCanvas = bufferCanvasRef.current;

      // Check text elements first (quick check)
      if (textElements.length > 0) return true;

      // Check buffer canvas for any non-transparent pixels
      if (!bufferCtx || !bufferCanvas) return false;
      const imageData = bufferCtx.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);
      const hasStrokes = !imageData.data.every((val, idx) => idx % 4 !== 3 || val === 0);

      return hasStrokes;
    };

    // Notify parent when content state changes
    const notifyContentChange = () => {
      if (!onContentChange) return;
      const hasContent = checkHasContent();
      if (hasContent !== lastContentStateRef.current) {
        lastContentStateRef.current = hasContent;
        onContentChange(hasContent);
      }
    };

    // Parse height value
    const heightNum = parseInt(height.replace('px', ''), 10) || 300;

    // Initialize canvas and context
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctxRef.current = ctx;

      // Create offscreen buffer canvas for actual drawing
      const bufferCanvas = document.createElement('canvas');
      const bufferCtx = bufferCanvas.getContext('2d');
      if (!bufferCtx) return;

      bufferCanvasRef.current = bufferCanvas;
      bufferCtxRef.current = bufferCtx;

      // Set up canvas size
      const updateSize = () => {
        if (!containerRef.current || !canvas) return;

        const displayWidth = containerRef.current.offsetWidth;
        const displayHeight = heightNum;

        // Handle device pixel ratio for crisp rendering
        const dpr = window.devicePixelRatio || 1;

        // Save buffer content before resize
        const oldBuffer = bufferCtx.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);

        // Set display canvas size (with DPR for crisp rendering)
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        ctx.scale(dpr, dpr);

        // Set buffer canvas size (no DPR scaling - work in display coordinates)
        bufferCanvas.width = displayWidth;
        bufferCanvas.height = displayHeight;
        // No scaling on buffer - work in CSS pixels

        // Set display size via CSS
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        // Restore buffer content if it existed
        if (oldBuffer.width > 0 && oldBuffer.height > 0) {
          bufferCtx.putImageData(oldBuffer, 0, 0);
        }

        // Render to display
        renderFrame();
      };

      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }, [heightNum]);

    // Render frame: copy buffer to visible canvas with pan offset, then render text elements
    const renderFrame = () => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      const bufferCanvas = bufferCanvasRef.current;

      if (!canvas || !ctx || !bufferCanvas) return;

      // Clear and reset visible canvas
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply DPR scaling for crisp rendering
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);

      // Draw buffer with pan offset (buffer is in CSS pixels, pan is in CSS pixels)
      ctx.drawImage(bufferCanvas, panX, panY);

      // Render text elements on top of buffer
      for (const textEl of textElements) {
        ctx.fillStyle = textEl.color;
        ctx.font = `${textEl.fontSize}px sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(textEl.text, textEl.position.x + panX, textEl.position.y + panY);
      }

      // Draw eraser cursor indicator (dotted circle)
      if (currentTool === 'eraser' && eraserCursorPos) {
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(eraserCursorPos.x + panX, eraserCursorPos.y + panY, ERASER_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    };

    // Re-render when pan, text elements, or eraser cursor change
    useEffect(() => {
      renderFrame();
    }, [panX, panY, textElements, eraserCursorPos, currentTool]);

    // Convert screen coordinates to canvas coordinates
    const screenToCanvas = (screenX: number, screenY: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      return {
        x: screenX - rect.left - panX,
        y: screenY - rect.top - panY,
      };
    };

    // Update content bounds
    const updateContentBounds = (x: number, y: number) => {
      const margin = 50;
      setContentBounds(prev => ({
        minX: Math.min(prev.minX, x - margin),
        minY: Math.min(prev.minY, y - margin),
        maxX: Math.max(prev.maxX, x + margin),
        maxY: Math.max(prev.maxY, y + margin),
      }));
    };

    // Reset content bounds
    const resetContentBounds = () => {
      setContentBounds({
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
      });
    };

    // Compute bounding box for text element
    const computeTextBounds = (text: string, position: Point, fontSize: number): TextElement['bounds'] => {
      const ctx = bufferCtxRef.current;
      if (!ctx) {
        // Fallback estimate if no context
        return {
          minX: position.x,
          minY: position.y,
          maxX: position.x + text.length * fontSize * 0.6,
          maxY: position.y + fontSize,
        };
      }
      ctx.font = `${fontSize}px sans-serif`;
      const metrics = ctx.measureText(text);
      return {
        minX: position.x,
        minY: position.y,
        maxX: position.x + metrics.width,
        maxY: position.y + fontSize,
      };
    };

    // Find text element at a given point
    const findTextAtPoint = (point: Point): TextElement | null => {
      // Iterate in reverse to find topmost element
      for (let i = textElements.length - 1; i >= 0; i--) {
        const el = textElements[i];
        if (
          point.x >= el.bounds.minX &&
          point.x <= el.bounds.maxX &&
          point.y >= el.bounds.minY &&
          point.y <= el.bounds.maxY
        ) {
          return el;
        }
      }
      return null;
    };

    // Constrain pan to keep content visible
    const constrainPan = (value: number, axis: 'x' | 'y'): number => {
      const canvas = canvasRef.current;
      if (!canvas) return value;

      const viewport = axis === 'x'
        ? canvas.getBoundingClientRect().width
        : canvas.getBoundingClientRect().height;

      const contentSize = axis === 'x'
        ? (contentBounds.maxX - contentBounds.minX)
        : (contentBounds.maxY - contentBounds.minY);

      // If no content drawn yet, don't constrain
      if (!isFinite(contentSize)) return value;

      // Prevent panning beyond content boundaries
      const minPan = -(contentSize - viewport / 2);
      const maxPan = viewport / 2;

      return Math.max(minPan, Math.min(maxPan, value));
    };

    // Draw a line
    const drawLine = (from: Point, to: Point) => {
      const ctx = bufferCtxRef.current;
      if (!ctx) return;

      ctx.strokeStyle = currentColor;
      ctx.lineWidth = STROKE_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      renderFrame();
    };

    // Erase at point
    const eraseAt = (point: Point) => {
      const ctx = bufferCtxRef.current;
      if (!ctx) return;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(point.x, point.y, ERASER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      renderFrame();
    };

    // Handle text input submission - creates a TextElement instead of rasterizing
    const handleTextSubmit = () => {
      if (textInputValue.trim()) {
        const fontSize = FONT_SIZES[fontSizeIndex];
        const newText: TextElement = {
          id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: textInputValue.trim(),
          position: textInputPosition,
          color: currentColor,
          fontSize,
          bounds: computeTextBounds(textInputValue.trim(), textInputPosition, fontSize),
        };
        setTextElements(prev => [...prev, newText]);
        // Update content bounds for pan constraints
        updateContentBounds(newText.bounds.minX, newText.bounds.minY);
        updateContentBounds(newText.bounds.maxX, newText.bounds.maxY);
        // Notify parent of content change
        if (onContentChange) {
          lastContentStateRef.current = true;
          onContentChange(true);
        }
      }
      setIsTextInputVisible(false);
      setTextInputValue('');
    };

    // Mouse/touch event handlers
    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
      // Prevent scroll on touch devices when interacting with canvas
      if ('touches' in e) {
        e.preventDefault();
      }

      const point = getEventPoint(e);
      if (!point) return;

      const canvasPoint = screenToCanvas(point.x, point.y);

      if (currentTool === 'pen') {
        setIsDrawing(true);
        setLastPoint(canvasPoint);
        updateContentBounds(canvasPoint.x, canvasPoint.y);
      } else if (currentTool === 'arrow') {
        // Try to find a text element at the click point
        const hitText = findTextAtPoint(canvasPoint);
        if (hitText) {
          setDraggedTextId(hitText.id);
          setDragOffset({
            x: canvasPoint.x - hitText.position.x,
            y: canvasPoint.y - hitText.position.y,
          });
        }
      } else if (currentTool === 'select') {
        setIsPanning(true);
        setLastPanPoint(point);
      } else if (currentTool === 'eraser') {
        setIsDrawing(true);
        eraseAt(canvasPoint);
        setLastPoint(canvasPoint);
      } else if (currentTool === 'text') {
        // Show text input at clicked position
        setTextInputPosition(canvasPoint);
        setIsTextInputVisible(true);
        setTextInputValue('');
        // Focus the input after it appears
        setTimeout(() => textInputRef.current?.focus(), 0);
      }
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
      // Prevent scroll on touch devices when drawing/panning
      if ('touches' in e && (isDrawing || isPanning || draggedTextId)) {
        e.preventDefault();
      }

      const point = getEventPoint(e);
      if (!point) return;

      const canvasPoint = screenToCanvas(point.x, point.y);

      // Update eraser cursor position when eraser tool is selected
      if (currentTool === 'eraser') {
        setEraserCursorPos(canvasPoint);
      }

      if (isDrawing && currentTool === 'pen') {
        if (lastPoint) {
          drawLine(lastPoint, canvasPoint);
        }
        setLastPoint(canvasPoint);
        updateContentBounds(canvasPoint.x, canvasPoint.y);
      } else if (draggedTextId && currentTool === 'arrow') {
        // Drag the text element
        setTextElements(prev => prev.map(el => {
          if (el.id !== draggedTextId) return el;
          const newPos = {
            x: canvasPoint.x - dragOffset.x,
            y: canvasPoint.y - dragOffset.y,
          };
          return {
            ...el,
            position: newPos,
            bounds: computeTextBounds(el.text, newPos, el.fontSize),
          };
        }));
      } else if (isDrawing && currentTool === 'eraser') {
        eraseAt(canvasPoint);

        // Smooth eraser trail: erase intermediate points
        if (lastPoint) {
          const distance = Math.sqrt(
            Math.pow(canvasPoint.x - lastPoint.x, 2) +
            Math.pow(canvasPoint.y - lastPoint.y, 2)
          );

          const steps = Math.ceil(distance / (ERASER_RADIUS / 2));
          for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const intermediatePoint = {
              x: lastPoint.x + (canvasPoint.x - lastPoint.x) * t,
              y: lastPoint.y + (canvasPoint.y - lastPoint.y) * t,
            };
            eraseAt(intermediatePoint);
          }
        }

        setLastPoint(canvasPoint);
      } else if (isPanning && currentTool === 'select') {
        if (!lastPanPoint) return;

        const dx = point.x - lastPanPoint.x;
        const dy = point.y - lastPanPoint.y;

        const newPanX = constrainPan(panX + dx, 'x');
        const newPanY = constrainPan(panY + dy, 'y');

        setPanX(newPanX);
        setPanY(newPanY);
        setLastPanPoint(point);
      }
    };

    const handlePointerUp = () => {
      setIsDrawing(false);
      setIsPanning(false);
      setDraggedTextId(null);
      setLastPoint(null);
      setLastPanPoint(null);
      // Notify parent of potential content change (after drawing/erasing)
      notifyContentChange();
    };

    const handlePointerLeave = () => {
      handlePointerUp();
      setEraserCursorPos(null);
    };

    // Get point from mouse or touch event
    const getEventPoint = (e: React.MouseEvent | React.TouchEvent): Point | null => {
      if ('touches' in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        return touch ? { x: touch.clientX, y: touch.clientY } : null;
      } else {
        return { x: e.clientX, y: e.clientY };
      }
    };

    // Get cursor style based on current tool
    const getCursorStyle = (): string => {
      switch (currentTool) {
        case 'pen':
          return 'crosshair';
        case 'arrow':
          return draggedTextId ? 'grabbing' : 'default';
        case 'select':
          return isPanning ? 'grabbing' : 'grab';
        case 'eraser':
          return 'pointer';
        case 'text':
          return 'text';
        default:
          return 'default';
      }
    };

    // Public API methods
    useImperativeHandle(ref, () => ({
      clear: () => {
        // Save snapshot before clearing (if not empty)
        const image = getImage();
        if (image) {
          setSavedSketches(prev => [...prev, image]);
        }

        // Clear buffer canvas (no DPR - buffer is in CSS pixels)
        const bufferCanvas = bufferCanvasRef.current;
        const bufferCtx = bufferCtxRef.current;
        if (!bufferCanvas || !bufferCtx) return;

        bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);

        // Clear text elements
        setTextElements([]);

        // Reset state
        resetContentBounds();
        setPanX(0);
        setPanY(0);

        // Render to display
        renderFrame();

        // Notify parent of content change
        if (onContentChange) {
          lastContentStateRef.current = false;
          onContentChange(false);
        }
      },

      getImage: () => {
        const bufferCanvas = bufferCanvasRef.current;
        const bufferCtx = bufferCtxRef.current;
        if (!bufferCanvas || !bufferCtx) return null;

        // Check if buffer canvas is blank
        const imageData = bufferCtx.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);
        const isBufferBlank = imageData.data.every((val, idx) =>
          idx % 4 !== 3 || val === 0
        );

        // If both buffer and text elements are empty, return null
        if (isBufferBlank && textElements.length === 0) return null;

        // Render text elements to buffer for export
        for (const textEl of textElements) {
          bufferCtx.fillStyle = textEl.color;
          bufferCtx.font = `${textEl.fontSize}px sans-serif`;
          bufferCtx.textBaseline = 'top';
          bufferCtx.fillText(textEl.text, textEl.position.x, textEl.position.y);
        }

        const dataUrl = bufferCanvas.toDataURL('image/png');

        // Clear the text from buffer (text elements are rendered separately in renderFrame)
        if (textElements.length > 0) {
          bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
          bufferCtx.putImageData(imageData, 0, 0);
        }

        return dataUrl;
      },

      saveSnapshot: () => {
        const image = getImage();
        if (image) {
          setSavedSketches(prev => [...prev, image]);
        }
      },

      getAllSketches: () => {
        const current = getImage();
        return current ? [...savedSketches, current] : savedSketches;
      },

      resetForNewQuestion: () => {
        // Clear saved sketches
        setSavedSketches([]);

        // Clear buffer canvas without saving (no DPR - buffer is in CSS pixels)
        const bufferCanvas = bufferCanvasRef.current;
        const bufferCtx = bufferCtxRef.current;
        if (!bufferCanvas || !bufferCtx) return;

        bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);

        // Clear text elements
        setTextElements([]);

        // Reset state
        resetContentBounds();
        setPanX(0);
        setPanY(0);

        // Render to display
        renderFrame();

        // Notify parent of content change
        if (onContentChange) {
          lastContentStateRef.current = false;
          onContentChange(false);
        }
      },

      hasContent: () => {
        return checkHasContent();
      },
    }));

    // Helper function for getImage (used in saveSnapshot and getAllSketches)
    const getImage = (): string | null => {
      const bufferCanvas = bufferCanvasRef.current;
      const bufferCtx = bufferCtxRef.current;
      if (!bufferCanvas || !bufferCtx) return null;

      // Check if canvas is blank (buffer is in CSS pixels, no DPR)
      const imageData = bufferCtx.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);
      const isBlank = imageData.data.every((val, idx) =>
        idx % 4 !== 3 || val === 0
      );

      if (isBlank) return null;

      return bufferCanvas.toDataURL('image/png');
    };

    const handleColorSelect = (color: string) => {
      setCurrentColor(color);
      // Always switch to pen when selecting a color
      setCurrentTool('pen');
    };

    const handleClear = () => {
      // Save snapshot before clearing (if not empty)
      const image = getImage();
      if (image) {
        setSavedSketches(prev => [...prev, image]);
      }

      // Clear buffer canvas (no DPR - buffer is in CSS pixels)
      const bufferCanvas = bufferCanvasRef.current;
      const bufferCtx = bufferCtxRef.current;
      if (!bufferCanvas || !bufferCtx) return;

      bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);

      // Clear text elements
      setTextElements([]);

      // Reset state
      resetContentBounds();
      setPanX(0);
      setPanY(0);

      // Render to display
      renderFrame();
    };

    return (
      <div className={`flex flex-col ${className}`}>
        {/* Header with title and clear button */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-100 rounded-t-xl border-b border-gray-200">
          <span className="text-sm font-medium text-gray-600">
            {t('sketchPad.title')}
          </span>
          {/* Clear button */}
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all"
            aria-label={t('sketchPad.clear')}
            title={t('sketchPad.clear')}
          >
            <span className="text-sm">🗑️</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 p-2 bg-gray-50 flex-wrap">
          {/* Color palette */}
          {COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => handleColorSelect(color.value)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                currentColor === color.value && currentTool !== 'eraser'
                  ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400 scale-110'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color.value }}
              aria-label={color.name}
              title={color.name}
            />
          ))}

          {/* Drawing tools */}
          {DRAWING_TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={`p-1.5 rounded-lg transition-all ${
                currentTool === tool.id
                  ? 'bg-blue-500 text-white scale-110'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              aria-label={t(tool.labelKey)}
              title={t(tool.labelKey)}
            >
              <span className="text-sm">{tool.icon}</span>
            </button>
          ))}

          <div className="w-px h-5 bg-gray-300 mx-0.5" />

          {/* Text tools group with border */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 border border-gray-300 rounded-lg bg-white">
            {TEXT_TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setCurrentTool(tool.id)}
                className={`p-1.5 rounded transition-all ${
                  currentTool === tool.id
                    ? 'bg-blue-500 text-white scale-110'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                aria-label={t(tool.labelKey)}
                title={t(tool.labelKey)}
              >
                <span className="text-sm">{tool.icon}</span>
              </button>
            ))}
            {/* Font size controls - stacked vertically */}
            <div className="flex items-center ml-1 border-l border-gray-200 pl-1">
              <div className="flex flex-col">
                <button
                  onClick={() => {
                    setFontSizeIndex(Math.min(FONT_SIZES.length - 1, fontSizeIndex + 1));
                    setCurrentTool('text');
                  }}
                  disabled={fontSizeIndex === FONT_SIZES.length - 1}
                  className="w-4 h-3 flex items-center justify-center rounded-t text-[10px] font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Larger text"
                >
                  +
                </button>
                <button
                  onClick={() => {
                    setFontSizeIndex(Math.max(0, fontSizeIndex - 1));
                    setCurrentTool('text');
                  }}
                  disabled={fontSizeIndex === 0}
                  className="w-4 h-3 flex items-center justify-center rounded-b text-[10px] font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Smaller text"
                >
                  −
                </button>
              </div>
            </div>
          </div>

          {/* Eraser */}
          <button
            onClick={() => setCurrentTool('eraser')}
            className={`p-1.5 rounded-lg transition-all ${
              currentTool === 'eraser'
                ? 'bg-blue-500 text-white scale-110'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label={t('sketchPad.eraser')}
            title={t('sketchPad.eraser')}
          >
            <span className="text-sm">⬜</span>
          </button>

          {/* Pan/Move tool */}
          <button
            onClick={() => setCurrentTool('select')}
            className={`p-1.5 rounded-lg transition-all ${
              currentTool === 'select'
                ? 'bg-blue-500 text-white scale-110'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label={t('sketchPad.move')}
            title={t('sketchPad.move')}
          >
            <span className="text-sm">✋</span>
          </button>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="border-2 border-gray-200 rounded-b-xl overflow-hidden bg-white relative"
          style={{ height }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerLeave}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            style={{
              cursor: getCursorStyle(),
              display: 'block',
            }}
          />
          {/* Text input overlay */}
          {isTextInputVisible && (
            <input
              ref={textInputRef}
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTextSubmit();
                } else if (e.key === 'Escape') {
                  setIsTextInputVisible(false);
                  setTextInputValue('');
                }
              }}
              onBlur={handleTextSubmit}
              placeholder={t('sketchPad.typeHere')}
              className="absolute bg-white border border-blue-500 rounded px-2 py-1 outline-none shadow-lg"
              style={{
                left: textInputPosition.x + panX,
                top: textInputPosition.y + panY,
                minWidth: '120px',
                color: currentColor,
                fontSize: `${FONT_SIZES[fontSizeIndex]}px`,
              }}
            />
          )}
        </div>
      </div>
    );
  }
);

SketchPad.displayName = 'SketchPad';

export default SketchPad;
