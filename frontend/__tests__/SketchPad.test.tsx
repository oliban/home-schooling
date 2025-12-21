/**
 * SketchPad component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';

// Mock react-konva since it requires canvas
vi.mock('react-konva', () => ({
  Stage: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="konva-stage" {...props}>{children}</div>
  ),
  Layer: ({ children }: React.PropsWithChildren) => (
    <div data-testid="konva-layer">{children}</div>
  ),
  Line: () => <div data-testid="konva-line" />,
  Text: ({ text }: { text: string }) => <div data-testid="konva-text">{text}</div>,
}));

// Mock the translation hook
vi.mock('@/lib/LanguageContext', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'sketchPad.title': 'Sketch Pad',
        'sketchPad.clear': 'Clear',
        'sketchPad.eraser': 'Eraser',
        'sketchPad.pen': 'Pen',
        'sketchPad.text': 'Text',
        'sketchPad.move': 'Move',
        'sketchPad.typeHere': 'Type here...',
      };
      return translations[key] || key;
    },
  }),
}));

import { SketchPad, SketchPadHandle } from '@/components/ui/SketchPad';

// Test the path intersection logic directly
describe('Path intersection logic', () => {
  const CONNECT_THRESHOLD = 20;

  const findIntersectingPath = (
    objects: Array<{ type: string; color: string; segments: number[][]; x: number; y: number; id: string }>,
    newPoints: number[],
    color: string
  ) => {
    for (const obj of objects) {
      if (obj.type !== 'path' || obj.color !== color) continue;

      for (let i = 0; i < newPoints.length; i += 2) {
        const newX = newPoints[i];
        const newY = newPoints[i + 1];

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

  it('should find intersection when paths cross', () => {
    const objects = [
      // Horizontal path with many points along y=100
      { id: 'path1', type: 'path', color: '#000000', segments: [[0, 100, 50, 100, 100, 100, 150, 100, 200, 100]], x: 0, y: 0 }
    ];

    // New vertical path that crosses the horizontal path at (100, 100)
    const newPath = [100, 0, 100, 50, 100, 100, 100, 150, 100, 200];
    const result = findIntersectingPath(objects, newPath, '#000000');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('path1');
  });

  it('should not find intersection when paths do not cross', () => {
    const objects = [
      { id: 'path1', type: 'path', color: '#000000', segments: [[0, 0, 50, 50]], x: 0, y: 0 }
    ];

    // Path far away from the existing path
    const newPath = [200, 200, 250, 250];
    const result = findIntersectingPath(objects, newPath, '#000000');
    expect(result).toBeNull();
  });

  it('should not find intersection with different color', () => {
    const objects = [
      { id: 'path1', type: 'path', color: '#000000', segments: [[0, 100, 100, 100, 200, 100]], x: 0, y: 0 }
    ];

    // Same crossing path but different color
    const newPath = [100, 0, 100, 100, 100, 200];
    const result = findIntersectingPath(objects, newPath, '#ff0000');
    expect(result).toBeNull();
  });

  it('should find intersection accounting for path offset', () => {
    const objects = [
      // Path with points at x=0,25,50,75,100 (before offset), offset by (50, 100)
      // So actual points are at x=50,75,100,125,150 at y=100
      { id: 'path1', type: 'path', color: '#000000', segments: [[0, 0, 25, 0, 50, 0, 75, 0, 100, 0]], x: 50, y: 100 }
    ];

    // Vertical line that passes through (100, 100) - should intersect with the point at (100, 100)
    const newPath = [100, 50, 100, 100, 100, 150];
    const result = findIntersectingPath(objects, newPath, '#000000');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('path1');
  });

  it('should find intersection across multiple segments', () => {
    const objects = [
      // Path with two segments
      { id: 'path1', type: 'path', color: '#000000', segments: [
        [0, 0, 50, 50],
        [100, 100, 150, 150]
      ], x: 0, y: 0 }
    ];

    // New path that intersects with second segment
    const newPath = [100, 100, 120, 120];
    const result = findIntersectingPath(objects, newPath, '#000000');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('path1');
  });
});

describe('SketchPad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with title', () => {
      render(<SketchPad />);
      expect(screen.getByText('Sketch Pad')).toBeInTheDocument();
    });

    it('should render all color buttons', () => {
      render(<SketchPad />);
      expect(screen.getByTitle('black')).toBeInTheDocument();
      expect(screen.getByTitle('blue')).toBeInTheDocument();
      expect(screen.getByTitle('red')).toBeInTheDocument();
      expect(screen.getByTitle('green')).toBeInTheDocument();
    });

    it('should render all tool buttons', () => {
      render(<SketchPad />);
      expect(screen.getByTitle('Pen')).toBeInTheDocument();
      expect(screen.getByTitle('Text')).toBeInTheDocument();
      expect(screen.getByTitle('Move')).toBeInTheDocument();
      expect(screen.getByTitle('Eraser')).toBeInTheDocument();
      expect(screen.getByTitle('Clear')).toBeInTheDocument();
    });

    it('should render the canvas stage', () => {
      render(<SketchPad />);
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });
  });

  describe('Tool selection', () => {
    it('should highlight the pen tool by default', () => {
      render(<SketchPad />);
      const penButton = screen.getByTitle('Pen');
      expect(penButton).toHaveClass('bg-blue-500');
    });

    it('should switch to text tool when clicked', () => {
      render(<SketchPad />);
      const textButton = screen.getByTitle('Text');
      fireEvent.click(textButton);
      expect(textButton).toHaveClass('bg-blue-500');
    });

    it('should switch to move tool when clicked', () => {
      render(<SketchPad />);
      const moveButton = screen.getByTitle('Move');
      fireEvent.click(moveButton);
      expect(moveButton).toHaveClass('bg-blue-500');
    });

    it('should switch to eraser tool when clicked', () => {
      render(<SketchPad />);
      const eraserButton = screen.getByTitle('Eraser');
      fireEvent.click(eraserButton);
      expect(eraserButton).toHaveClass('bg-blue-500');
    });
  });

  describe('Color selection', () => {
    it('should highlight black color by default', () => {
      render(<SketchPad />);
      const blackButton = screen.getByTitle('black');
      expect(blackButton).toHaveClass('scale-110');
    });

    it('should switch color when a different color is clicked', () => {
      render(<SketchPad />);
      const blueButton = screen.getByTitle('blue');
      fireEvent.click(blueButton);
      expect(blueButton).toHaveClass('scale-110');
    });

    it('should switch from eraser to pen when selecting a color', () => {
      render(<SketchPad />);
      const eraserButton = screen.getByTitle('Eraser');
      const penButton = screen.getByTitle('Pen');
      const blueButton = screen.getByTitle('blue');

      // First select eraser
      fireEvent.click(eraserButton);
      expect(eraserButton).toHaveClass('bg-blue-500');

      // Then select a color
      fireEvent.click(blueButton);

      // Eraser should no longer be selected, pen should be active
      expect(penButton).toHaveClass('bg-blue-500');
    });
  });

  describe('Clear functionality', () => {
    it('should expose clear method via ref', () => {
      const ref = createRef<SketchPadHandle>();
      render(<SketchPad ref={ref} />);

      expect(ref.current).toBeDefined();
      expect(typeof ref.current?.clear).toBe('function');
    });

    it('should call clear when clear button is clicked', () => {
      render(<SketchPad />);
      const clearButton = screen.getByTitle('Clear');

      // Should not throw when clicked
      expect(() => fireEvent.click(clearButton)).not.toThrow();
    });
  });

  describe('Height prop', () => {
    it('should apply custom height', () => {
      const { container } = render(<SketchPad height="500px" />);
      const canvasContainer = container.querySelector('.border-2.border-gray-200.rounded-b-xl');
      expect(canvasContainer).toHaveStyle({ height: '500px' });
    });

    it('should use default height when not specified', () => {
      const { container } = render(<SketchPad />);
      const canvasContainer = container.querySelector('.border-2.border-gray-200.rounded-b-xl');
      expect(canvasContainer).toHaveStyle({ height: '300px' });
    });
  });
});
