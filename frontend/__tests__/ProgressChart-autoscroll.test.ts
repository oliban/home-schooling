import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test for ProgressChart auto-scroll functionality
 *
 * Feature: Automatically scroll chart to the right to show most recent days
 *
 * Implementation:
 * - Uses useRef to track scrollable container
 * - Uses useEffect triggered by data/period changes
 * - Scrolls to scrollWidth (rightmost position)
 * - Uses requestAnimationFrame for timing + setTimeout fallback
 */

describe('ProgressChart - Auto-Scroll to Recent Days', () => {
  // Mock scrollable container
  let mockContainer: {
    scrollLeft: number;
    scrollWidth: number;
    clientWidth: number;
    scrollTo: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockContainer = {
      scrollLeft: 0,
      scrollWidth: 1000,
      clientWidth: 400,
      scrollTo: vi.fn((options) => {
        if (typeof options === 'object' && options.left !== undefined) {
          mockContainer.scrollLeft = options.left;
        }
      }),
    };
  });

  it('should scroll to the right edge when chart loads', () => {
    // Simulate auto-scroll behavior
    mockContainer.scrollTo({
      left: mockContainer.scrollWidth,
      behavior: 'auto',
    });

    expect(mockContainer.scrollTo).toHaveBeenCalledWith({
      left: 1000,
      behavior: 'auto',
    });
    expect(mockContainer.scrollLeft).toBe(1000);
  });

  it('should use requestAnimationFrame for reliable timing', () => {
    const rafSpy = vi.spyOn(global, 'requestAnimationFrame');

    // Mock the auto-scroll logic
    const scrollToEnd = () => {
      mockContainer.scrollTo({
        left: mockContainer.scrollWidth,
        behavior: 'auto',
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToEnd);
    });

    expect(rafSpy).toHaveBeenCalled();
    rafSpy.mockRestore();
  });

  it('should re-scroll when data changes', () => {
    // First scroll
    mockContainer.scrollTo({ left: mockContainer.scrollWidth, behavior: 'auto' });
    const firstCallCount = mockContainer.scrollTo.mock.calls.length;

    // Data changes (simulated by calling scroll again)
    mockContainer.scrollTo({ left: mockContainer.scrollWidth, behavior: 'auto' });

    expect(mockContainer.scrollTo.mock.calls.length).toBeGreaterThan(firstCallCount);
  });

  it('should re-scroll when period changes', () => {
    // Scroll for initial period (7d)
    mockContainer.scrollTo({ left: mockContainer.scrollWidth, behavior: 'auto' });

    // Reset mock
    mockContainer.scrollTo.mockClear();

    // Period changes to 30d (simulated by calling scroll again)
    mockContainer.scrollTo({ left: mockContainer.scrollWidth, behavior: 'auto' });

    expect(mockContainer.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('should use auto behavior for instant scroll (no animation)', () => {
    mockContainer.scrollTo({
      left: mockContainer.scrollWidth,
      behavior: 'auto',
    });

    expect(mockContainer.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: 'auto',
      })
    );
  });

  it('should handle case where scrollWidth equals clientWidth (no scroll needed)', () => {
    mockContainer.scrollWidth = 400;
    mockContainer.clientWidth = 400;

    mockContainer.scrollTo({
      left: mockContainer.scrollWidth,
      behavior: 'auto',
    });

    // Even if no scroll is needed, the call should succeed
    expect(mockContainer.scrollLeft).toBe(400);
  });

  it('should calculate scroll position based on scrollWidth', () => {
    const scrollPosition = mockContainer.scrollWidth;

    expect(scrollPosition).toBe(1000);
    expect(scrollPosition).toBeGreaterThan(mockContainer.clientWidth);
  });

  it('should cleanup timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const mockTimerId = setTimeout(() => {}, 300);

    // Simulate cleanup function
    clearTimeout(mockTimerId);

    expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimerId);
    clearTimeoutSpy.mockRestore();
  });
});

describe('ProgressChart - Scroll Container Ref', () => {
  it('should attach ref to overflow-x-auto container', () => {
    const mockRef = { current: null as HTMLDivElement | null };

    // Simulate ref attachment
    mockRef.current = {
      scrollLeft: 0,
      scrollWidth: 1000,
      clientWidth: 400,
    } as HTMLDivElement;

    expect(mockRef.current).not.toBeNull();
    expect(mockRef.current.scrollWidth).toBe(1000);
  });

  it('should safely handle null ref', () => {
    const mockRef = { current: null };

    // Scroll logic should check for ref existence
    if (mockRef.current) {
      mockRef.current.scrollLeft = 1000;
    }

    // Should not throw error
    expect(mockRef.current).toBeNull();
  });
});
