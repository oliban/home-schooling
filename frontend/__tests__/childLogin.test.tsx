/**
 * Child Login page tests
 * Tests Enter key handlers for family code input and PIN input
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the auth API
const mockGetChildren = vi.fn();
const mockChildLogin = vi.fn();
vi.mock('@/lib/api', () => ({
  auth: {
    getChildren: (...args: unknown[]) => mockGetChildren(...args),
    childLogin: (...args: unknown[]) => mockChildLogin(...args),
  },
}));

// Mock LanguageContext
vi.mock('@/lib/LanguageContext', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'sv' as const,
  }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import ChildLogin from '@/app/login/page';

describe('ChildLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockGetChildren.mockReset();
    mockChildLogin.mockReset();
  });

  describe('Family code input Enter key handler', () => {
    it('should submit family code when Enter is pressed with valid input', async () => {
      mockGetChildren.mockResolvedValue([
        { id: 'child1', name: 'Test Child' }
      ]);

      render(<ChildLogin />);

      const familyCodeInput = screen.getByPlaceholderText('____');

      // Type a family code
      fireEvent.change(familyCodeInput, { target: { value: '1234' } });

      // Press Enter
      fireEvent.keyDown(familyCodeInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mockGetChildren).toHaveBeenCalledWith('1234');
      });
    });

    it('should not submit family code when Enter is pressed with empty input', () => {
      render(<ChildLogin />);

      const familyCodeInput = screen.getByPlaceholderText('____');

      // Press Enter without typing anything
      fireEvent.keyDown(familyCodeInput, { key: 'Enter' });

      expect(mockGetChildren).not.toHaveBeenCalled();
    });

    it('should not submit when a non-Enter key is pressed', () => {
      render(<ChildLogin />);

      const familyCodeInput = screen.getByPlaceholderText('____');

      fireEvent.change(familyCodeInput, { target: { value: '1234' } });
      fireEvent.keyDown(familyCodeInput, { key: 'Tab' });

      expect(mockGetChildren).not.toHaveBeenCalled();
    });
  });

  describe('PIN input Enter key handler', () => {
    beforeEach(async () => {
      // Setup: Navigate to PIN entry screen by providing valid family code
      mockGetChildren.mockResolvedValue([
        { id: 'child1', name: 'Test Child' }
      ]);
    });

    it('should submit login when Enter is pressed with valid 4-digit PIN', async () => {
      mockChildLogin.mockResolvedValue({
        token: 'test-token',
        child: { id: 'child1', name: 'Test Child' }
      });

      render(<ChildLogin />);

      // Enter family code
      const familyCodeInput = screen.getByPlaceholderText('____');
      fireEvent.change(familyCodeInput, { target: { value: '1234' } });
      fireEvent.keyDown(familyCodeInput, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Test Child')).toBeInTheDocument();
      });

      // Select child
      fireEvent.click(screen.getByText('Test Child'));

      // Enter PIN
      const pinInput = screen.getByPlaceholderText('____');
      fireEvent.change(pinInput, { target: { value: '5678' } });

      // Press Enter to submit
      fireEvent.keyDown(pinInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mockChildLogin).toHaveBeenCalledWith({
          childId: 'child1',
          pin: '5678'
        });
      });
    });

    it('should not submit when Enter is pressed with incomplete PIN', async () => {
      render(<ChildLogin />);

      // Enter family code
      const familyCodeInput = screen.getByPlaceholderText('____');
      fireEvent.change(familyCodeInput, { target: { value: '1234' } });
      fireEvent.keyDown(familyCodeInput, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Test Child')).toBeInTheDocument();
      });

      // Select child
      fireEvent.click(screen.getByText('Test Child'));

      // Enter incomplete PIN (only 3 digits)
      const pinInput = screen.getByPlaceholderText('____');
      fireEvent.change(pinInput, { target: { value: '567' } });

      // Press Enter
      fireEvent.keyDown(pinInput, { key: 'Enter' });

      expect(mockChildLogin).not.toHaveBeenCalled();
    });

    it('should not submit when a non-Enter key is pressed', async () => {
      render(<ChildLogin />);

      // Enter family code
      const familyCodeInput = screen.getByPlaceholderText('____');
      fireEvent.change(familyCodeInput, { target: { value: '1234' } });
      fireEvent.keyDown(familyCodeInput, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Test Child')).toBeInTheDocument();
      });

      // Select child
      fireEvent.click(screen.getByText('Test Child'));

      // Enter PIN
      const pinInput = screen.getByPlaceholderText('____');
      fireEvent.change(pinInput, { target: { value: '5678' } });

      // Press Tab instead of Enter
      fireEvent.keyDown(pinInput, { key: 'Tab' });

      expect(mockChildLogin).not.toHaveBeenCalled();
    });
  });
});
