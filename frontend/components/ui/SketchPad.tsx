'use client';

import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import { useTranslation } from '@/lib/LanguageContext';

interface SketchPadProps {
  height?: string;
  className?: string;
}

export interface SketchPadHandle {
  clear: () => void;
}

const COLORS = [
  { name: 'black', value: '#000000' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'red', value: '#ef4444' },
  { name: 'green', value: '#22c55e' },
];

export const SketchPad = forwardRef<SketchPadHandle, SketchPadProps>(
  ({ height = '300px', className = '' }, ref) => {
    const { t } = useTranslation();
    const canvasRef = useRef<ReactSketchCanvasRef>(null);
    const [strokeColor, setStrokeColor] = useState(COLORS[0].value);
    const [isEraser, setIsEraser] = useState(false);

    useImperativeHandle(ref, () => ({
      clear: () => {
        canvasRef.current?.clearCanvas();
      },
    }));

    const handleEraserToggle = () => {
      if (isEraser) {
        canvasRef.current?.eraseMode(false);
        setIsEraser(false);
      } else {
        canvasRef.current?.eraseMode(true);
        setIsEraser(true);
      }
    };

    const handleColorSelect = (color: string) => {
      setStrokeColor(color);
      setIsEraser(false);
      canvasRef.current?.eraseMode(false);
    };

    const handleClear = () => {
      canvasRef.current?.clearCanvas();
    };

    return (
      <div className={`flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gray-100 rounded-t-xl border-b border-gray-200">
          <span className="text-sm font-medium text-gray-600">
            {t('sketchPad.title')}
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 bg-gray-50">
          {/* Color palette */}
          {COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => handleColorSelect(color.value)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                strokeColor === color.value && !isEraser
                  ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400 scale-110'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color.value }}
              aria-label={color.name}
              title={color.name}
            />
          ))}

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Eraser */}
          <button
            onClick={handleEraserToggle}
            className={`p-2 rounded-lg transition-all ${
              isEraser
                ? 'bg-blue-500 text-white scale-110'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            aria-label={t('sketchPad.eraser')}
            title={t('sketchPad.eraser')}
          >
            <span className="text-lg">🧹</span>
          </button>

          {/* Clear button */}
          <button
            onClick={handleClear}
            className="ml-auto p-2 rounded-lg bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all"
            aria-label={t('sketchPad.clear')}
            title={t('sketchPad.clear')}
          >
            <span className="text-lg">🗑️</span>
          </button>
        </div>

        {/* Canvas */}
        <div className="border-2 border-gray-200 rounded-b-xl overflow-hidden bg-white">
          <ReactSketchCanvas
            ref={canvasRef}
            width="100%"
            height={height}
            strokeWidth={4}
            strokeColor={strokeColor}
            eraserWidth={20}
            canvasColor="white"
            style={{ border: 'none' }}
          />
        </div>
      </div>
    );
  }
);

SketchPad.displayName = 'SketchPad';

export default SketchPad;
