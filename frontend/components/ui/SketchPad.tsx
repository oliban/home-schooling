'use client';

import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Stage, Layer, Line, Text, Group } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { useTranslation } from '@/lib/LanguageContext';

type Tool = 'pen' | 'text' | 'select' | 'eraser';

interface PathObject {
  id: string;
  type: 'path';
  segments: number[][]; // Array of point arrays - each segment is drawn separately
  color: string;
  x: number;
  y: number;
}

interface TextObject {
  id: string;
  type: 'text';
  text: string;
  color: string;
  x: number;
  y: number;
  fontSize: number;
}

type DrawingObject = PathObject | TextObject;

interface SketchPadProps {
  height?: string;
  className?: string;
}

export interface SketchPadHandle {
  clear: () => void;
  getImage: () => string | null; // Returns PNG data URL or null if empty
}

const COLORS = [
  { name: 'black', value: '#000000' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'red', value: '#ef4444' },
  { name: 'green', value: '#22c55e' },
];

const TOOLS: { id: Tool; icon: string; labelKey: string }[] = [
  { id: 'pen', icon: '✏️', labelKey: 'sketchPad.pen' },
  { id: 'text', icon: 'T', labelKey: 'sketchPad.text' },
  { id: 'select', icon: '✋', labelKey: 'sketchPad.move' },
];

// Distance threshold for connecting strokes (in pixels)
const CONNECT_THRESHOLD = 20;

export const SketchPad = forwardRef<SketchPadHandle, SketchPadProps>(
  ({ height = '300px', className = '' }, ref) => {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const [stageSize, setStageSize] = useState({ width: 400, height: 300 });

    // Drawing state
    const [objects, setObjects] = useState<DrawingObject[]>([]);
    const [currentTool, setCurrentTool] = useState<Tool>('pen');
    const [currentColor, setCurrentColor] = useState(COLORS[0].value);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<number[]>([]);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const objectsRef = useRef<DrawingObject[]>([]);

    // Helper to update objects and keep ref in sync (ref updated synchronously)
    const updateObjects = (updater: DrawingObject[] | ((prev: DrawingObject[]) => DrawingObject[])) => {
      const newObjects = typeof updater === 'function' ? updater(objectsRef.current) : updater;
      objectsRef.current = newObjects;
      setObjects(newObjects);
    };

    // Text editing state
    const [editingText, setEditingText] = useState<{
      x: number;
      y: number;
      value: string;
    } | null>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    // Parse height value
    const heightNum = parseInt(height.replace('px', ''), 10) || 300;

    // Update stage size on container resize
    useEffect(() => {
      const updateSize = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth;
          setStageSize({ width, height: heightNum });
        }
      };

      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }, [heightNum]);

    // Focus text input when editing
    useEffect(() => {
      if (editingText && textInputRef.current) {
        textInputRef.current.focus();
      }
    }, [editingText]);

    useImperativeHandle(ref, () => ({
      clear: () => {
        updateObjects([]);
        setEditingText(null);
        setCurrentPath([]);
        setIsDrawing(false);
      },
      getImage: () => {
        // Return null if no objects drawn
        if (objectsRef.current.length === 0) {
          return null;
        }
        // Export stage as PNG data URL
        if (stageRef.current) {
          return stageRef.current.toDataURL({ pixelRatio: 1 });
        }
        return null;
      },
    }));

    const generateId = () => `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const getPointerPosition = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      return pos || { x: 0, y: 0 };
    };

    // Find a path that has any point close to any point in the given points array (same color only)
    const findIntersectingPath = (points: number[], color: string): PathObject | null => {
      // Use ref to get current objects (avoids stale closure)
      for (const obj of objectsRef.current) {
        if (obj.type !== 'path' || obj.color !== color) continue;

        // Check if any point in the new path is near any point in any segment of the existing path
        for (let i = 0; i < points.length; i += 2) {
          const newX = points[i];
          const newY = points[i + 1];

          for (const segment of obj.segments) {
            for (let j = 0; j < segment.length; j += 2) {
              const existingX = segment[j] + obj.x;
              const existingY = segment[j + 1] + obj.y;
              const distance = Math.sqrt((newX - existingX) ** 2 + (newY - existingY) ** 2);
              if (distance <= CONNECT_THRESHOLD) {
                return obj;
              }
            }
          }
        }
      }
      return null;
    };

    // Pen tool handlers
    const handleMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (currentTool !== 'pen') return;

      const pos = getPointerPosition(e);
      setIsDrawing(true);
      setCurrentPath([pos.x, pos.y]);
    };

    const handleMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isDrawing || currentTool !== 'pen') return;

      const pos = getPointerPosition(e);
      setCurrentPath(prev => [...prev, pos.x, pos.y]);
    };

    const handleMouseUp = () => {
      if (!isDrawing || currentTool !== 'pen') return;

      if (currentPath.length >= 4) {
        // Check if this new path intersects with any existing path of the same color
        const intersectingPath = findIntersectingPath(currentPath, currentColor);

        if (intersectingPath) {
          // Add as new segment to existing path
          updateObjects(prev =>
            prev.map(obj => {
              if (obj.id === intersectingPath.id && obj.type === 'path') {
                // Adjust new points relative to the path's position
                const adjustedNewSegment = currentPath.map((val, i) =>
                  i % 2 === 0 ? val - obj.x : val - obj.y
                );
                return {
                  ...obj,
                  segments: [...obj.segments, adjustedNewSegment],
                };
              }
              return obj;
            })
          );
        } else {
          // Create new path with single segment
          const newPath: PathObject = {
            id: generateId(),
            type: 'path',
            segments: [currentPath],
            color: currentColor,
            x: 0,
            y: 0,
          };
          updateObjects(prev => [...prev, newPath]);
        }
      }

      setIsDrawing(false);
      setCurrentPath([]);
    };

    // Stage click handler for text tool
    const handleStageClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      // Only handle clicks on the stage itself (empty area)
      if (e.target !== e.target.getStage()) return;

      if (currentTool === 'text') {
        const pos = getPointerPosition(e);
        setEditingText({ x: pos.x, y: pos.y, value: '' });
      }
    };

    // Commit text input
    const commitText = () => {
      if (editingText && editingText.value.trim()) {
        const newText: TextObject = {
          id: generateId(),
          type: 'text',
          text: editingText.value,
          color: currentColor,
          x: editingText.x,
          y: editingText.y,
          fontSize: 20,
        };
        updateObjects(prev => [...prev, newText]);
      }
      setEditingText(null);
    };

    // Object click handler (for eraser)
    const handleObjectClick = (objectId: string) => {
      if (currentTool === 'eraser') {
        updateObjects(prev => prev.filter(obj => obj.id !== objectId));
      }
    };

    // Drag handler
    const handleDragEnd = (objectId: string, e: KonvaEventObject<DragEvent>) => {
      updateObjects(prev =>
        prev.map(obj =>
          obj.id === objectId
            ? { ...obj, x: e.target.x(), y: e.target.y() }
            : obj
        )
      );
    };

    const handleColorSelect = (color: string) => {
      setCurrentColor(color);
      if (currentTool === 'eraser') {
        setCurrentTool('pen');
      }
    };

    const handleClear = () => {
      updateObjects([]);
      setEditingText(null);
    };

    const isDraggable = currentTool === 'select';
    const isEraserHover = currentTool === 'eraser';

    return (
      <div className={`flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gray-100 rounded-t-xl border-b border-gray-200">
          <span className="text-sm font-medium text-gray-600">
            {t('sketchPad.title')}
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 bg-gray-50 flex-wrap">
          {/* Color palette */}
          {COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => handleColorSelect(color.value)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                currentColor === color.value && currentTool !== 'eraser'
                  ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400 scale-110'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color.value }}
              aria-label={color.name}
              title={color.name}
            />
          ))}

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Tools */}
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={`p-2 rounded-lg transition-all ${
                currentTool === tool.id
                  ? 'bg-blue-500 text-white scale-110'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              aria-label={t(tool.labelKey)}
              title={t(tool.labelKey)}
            >
              <span className={tool.id === 'text' ? 'text-lg font-bold' : 'text-lg'}>
                {tool.icon}
              </span>
            </button>
          ))}

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Eraser */}
          <button
            onClick={() => setCurrentTool('eraser')}
            className={`p-2 rounded-lg transition-all ${
              currentTool === 'eraser'
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
        <div
          ref={containerRef}
          className="border-2 border-gray-200 rounded-b-xl overflow-hidden bg-white relative"
          style={{ height }}
        >
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            onClick={handleStageClick}
            onTap={handleStageClick}
            style={{
              cursor: currentTool === 'pen' ? 'crosshair' :
                      currentTool === 'text' ? 'text' :
                      currentTool === 'select' ? 'grab' :
                      currentTool === 'eraser' ? 'pointer' : 'default'
            }}
          >
            <Layer>
              {/* Render all saved objects */}
              {objects.map((obj) => {
                if (obj.type === 'path') {
                  return (
                    <Group
                      key={obj.id}
                      x={obj.x}
                      y={obj.y}
                      draggable={isDraggable}
                      onDragEnd={(e) => handleDragEnd(obj.id, e)}
                      onClick={() => handleObjectClick(obj.id)}
                      onTap={() => handleObjectClick(obj.id)}
                      onMouseEnter={() => setHoveredId(obj.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      opacity={hoveredId === obj.id && isEraserHover ? 0.5 : 1}
                    >
                      {obj.segments.map((segment, idx) => (
                        <Line
                          key={idx}
                          points={segment}
                          stroke={hoveredId === obj.id && isEraserHover ? '#ff0000' : obj.color}
                          strokeWidth={4}
                          hitStrokeWidth={20}
                          lineCap="round"
                          lineJoin="round"
                        />
                      ))}
                    </Group>
                  );
                } else {
                  return (
                    <Text
                      key={obj.id}
                      text={obj.text}
                      x={obj.x}
                      y={obj.y}
                      fontSize={obj.fontSize}
                      fill={hoveredId === obj.id && isEraserHover ? '#ff0000' : obj.color}
                      padding={10}
                      draggable={isDraggable}
                      onDragEnd={(e) => handleDragEnd(obj.id, e)}
                      onClick={() => handleObjectClick(obj.id)}
                      onTap={() => handleObjectClick(obj.id)}
                      onMouseEnter={() => setHoveredId(obj.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      opacity={hoveredId === obj.id && isEraserHover ? 0.5 : 1}
                    />
                  );
                }
              })}

              {/* Current drawing path */}
              {isDrawing && currentPath.length >= 2 && (
                <Line
                  points={currentPath}
                  stroke={currentColor}
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
            </Layer>
          </Stage>

          {/* Text input overlay */}
          {editingText && (
            <input
              ref={textInputRef}
              type="text"
              value={editingText.value}
              onChange={(e) => setEditingText({ ...editingText, value: e.target.value })}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitText();
                } else if (e.key === 'Escape') {
                  setEditingText(null);
                }
              }}
              className="absolute bg-transparent outline-none"
              style={{
                left: editingText.x,
                top: editingText.y,
                fontSize: '20px',
                color: currentColor,
                border: '1px dashed #999',
                padding: '2px 4px',
                minWidth: '100px',
              }}
              placeholder={t('sketchPad.typeHere') || 'Type here...'}
            />
          )}
        </div>
      </div>
    );
  }
);

SketchPad.displayName = 'SketchPad';

export default SketchPad;
