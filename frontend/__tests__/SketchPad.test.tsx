/**
 * SketchPad component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';

// Mock canvas context
let mockContext: Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  mockContext = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(4).fill(0), // Blank canvas (all transparent)
      width: 1,
      height: 1,
    })),
    putImageData: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
  };

  // Mock HTMLCanvasElement methods
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext as unknown as CanvasRenderingContext2D);
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,fakedata');
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }));
});

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

    it('should render a canvas element', () => {
      const { container } = render(<SketchPad />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Tool selection', () => {
    it('should highlight the pen tool by default', () => {
      render(<SketchPad />);
      const penButton = screen.getByTitle('Pen');
      expect(penButton).toHaveClass('bg-blue-500');
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

    it('should switch to text tool when clicked', () => {
      render(<SketchPad />);
      const textButton = screen.getByTitle('Text');
      fireEvent.click(textButton);
      expect(textButton).toHaveClass('bg-blue-500');
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
    // Note: clear() method uses getImage() helper to save snapshot before clearing
    // This ensures the method works correctly within useImperativeHandle
    it('should expose clear method via ref', () => {
      const ref = createRef<SketchPadHandle>();
      render(<SketchPad ref={ref} />);

      expect(ref.current).toBeDefined();
      expect(typeof ref.current?.clear).toBe('function');
    });

    it('should call clearRect when clear button is clicked', () => {
      render(<SketchPad />);
      const clearButton = screen.getByTitle('Clear');

      fireEvent.click(clearButton);

      // clearRect should be called to clear the canvas
      expect(mockContext.clearRect).toHaveBeenCalled();
    });
  });

  describe('Multi-sketch API', () => {
    it('should expose saveSnapshot method via ref', () => {
      const ref = createRef<SketchPadHandle>();
      render(<SketchPad ref={ref} />);

      expect(ref.current).toBeDefined();
      expect(typeof ref.current?.saveSnapshot).toBe('function');
    });

    it('should expose getAllSketches method via ref', () => {
      const ref = createRef<SketchPadHandle>();
      render(<SketchPad ref={ref} />);

      expect(ref.current).toBeDefined();
      expect(typeof ref.current?.getAllSketches).toBe('function');
    });

    it('should expose resetForNewQuestion method via ref', () => {
      const ref = createRef<SketchPadHandle>();
      render(<SketchPad ref={ref} />);

      expect(ref.current).toBeDefined();
      expect(typeof ref.current?.resetForNewQuestion).toBe('function');
    });

    it('should return empty array from getAllSketches when canvas is blank', () => {
      const ref = createRef<SketchPadHandle>();
      render(<SketchPad ref={ref} />);

      const sketches = ref.current?.getAllSketches();
      expect(sketches).toEqual([]);
    });

    it('should return null from getImage when canvas is blank', () => {
      const ref = createRef<SketchPadHandle>();
      render(<SketchPad ref={ref} />);

      const image = ref.current?.getImage();
      expect(image).toBeNull();
    });

    it('should return image data URL from getImage when canvas has content', () => {
      const ref = createRef<SketchPadHandle>();
      render(<SketchPad ref={ref} />);

      // Mock canvas with content (non-transparent pixels)
      mockContext.getImageData = vi.fn(() => ({
        data: new Uint8ClampedArray([255, 0, 0, 255]), // Red pixel with full opacity
        width: 1,
        height: 1,
      }));

      const image = ref.current?.getImage();
      expect(image).toBe('data:image/png;base64,fakedata');
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

  describe('Mobile touch handling', () => {
    it('should have touch-action: none to prevent page scrolling', () => {
      const { container } = render(<SketchPad />);
      const canvasContainer = container.querySelector('.border-2.border-gray-200.rounded-b-xl') as HTMLElement;
      expect(canvasContainer).toBeTruthy();
      expect(canvasContainer.style.touchAction).toBe('none');
    });
  });

  describe('Canvas cursor styles', () => {
    it('should have crosshair cursor for pen tool', () => {
      const { container } = render(<SketchPad />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.cursor).toBe('crosshair');
    });

    it('should have grab cursor for move tool', () => {
      const { container } = render(<SketchPad />);
      const moveButton = screen.getByTitle('Move');
      fireEvent.click(moveButton);

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.cursor).toBe('grab');
    });

    it('should have pointer cursor for eraser tool', () => {
      const { container } = render(<SketchPad />);
      const eraserButton = screen.getByTitle('Eraser');
      fireEvent.click(eraserButton);

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.cursor).toBe('pointer');
    });

    it('should have text cursor for text tool', () => {
      const { container } = render(<SketchPad />);
      const textButton = screen.getByTitle('Text');
      fireEvent.click(textButton);

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.style.cursor).toBe('text');
    });
  });

  describe('Text tool', () => {
    it('should show text input when clicking on canvas with text tool', () => {
      const { container } = render(<SketchPad />);
      const textButton = screen.getByTitle('Text');
      fireEvent.click(textButton);

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });

      const textInput = screen.getByPlaceholderText('Type here...');
      expect(textInput).toBeInTheDocument();
    });

    it('should hide text input when pressing Escape', () => {
      const { container } = render(<SketchPad />);
      const textButton = screen.getByTitle('Text');
      fireEvent.click(textButton);

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });

      const textInput = screen.getByPlaceholderText('Type here...');
      fireEvent.keyDown(textInput, { key: 'Escape' });

      expect(screen.queryByPlaceholderText('Type here...')).not.toBeInTheDocument();
    });

    it('should submit text when pressing Enter', () => {
      const { container } = render(<SketchPad />);
      const textButton = screen.getByTitle('Text');
      fireEvent.click(textButton);

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });

      const textInput = screen.getByPlaceholderText('Type here...');
      fireEvent.change(textInput, { target: { value: 'Hello' } });
      fireEvent.keyDown(textInput, { key: 'Enter' });

      // Input should be hidden after submission
      expect(screen.queryByPlaceholderText('Type here...')).not.toBeInTheDocument();
    });

    it('should submit text on blur', () => {
      const { container } = render(<SketchPad />);
      const textButton = screen.getByTitle('Text');
      fireEvent.click(textButton);

      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });

      const textInput = screen.getByPlaceholderText('Type here...');
      fireEvent.change(textInput, { target: { value: 'Hello' } });
      fireEvent.blur(textInput);

      // Input should be hidden after blur
      expect(screen.queryByPlaceholderText('Type here...')).not.toBeInTheDocument();
    });
  });
});
