import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tab, TabList, TabPanel } from '../components/ui/Tabs';

describe('Tabs Components', () => {
  describe('Tab', () => {
    it('renders children correctly', () => {
      render(
        <Tab active={false} onClick={() => {}}>
          Test Tab
        </Tab>
      );
      expect(screen.getByText('Test Tab')).toBeInTheDocument();
    });

    it('applies active styles when active is true', () => {
      render(
        <Tab active={true} onClick={() => {}}>
          Active Tab
        </Tab>
      );
      const button = screen.getByText('Active Tab');
      expect(button).toHaveClass('bg-green-600');
      expect(button).toHaveClass('text-white');
    });

    it('applies inactive styles when active is false', () => {
      render(
        <Tab active={false} onClick={() => {}}>
          Inactive Tab
        </Tab>
      );
      const button = screen.getByText('Inactive Tab');
      expect(button).toHaveClass('bg-gray-100');
      expect(button).toHaveClass('text-gray-700');
    });

    it('calls onClick when clicked', () => {
      const handleClick = vi.fn();
      render(
        <Tab active={false} onClick={handleClick}>
          Clickable Tab
        </Tab>
      );
      fireEvent.click(screen.getByText('Clickable Tab'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies secondary variant styles when specified', () => {
      render(
        <Tab active={true} onClick={() => {}} variant="secondary">
          Secondary Tab
        </Tab>
      );
      const button = screen.getByText('Secondary Tab');
      expect(button).toHaveClass('bg-blue-600');
    });

    it('applies primary variant by default', () => {
      render(
        <Tab active={true} onClick={() => {}}>
          Primary Tab
        </Tab>
      );
      const button = screen.getByText('Primary Tab');
      expect(button).toHaveClass('bg-green-600');
    });
  });

  describe('TabList', () => {
    it('renders children correctly', () => {
      render(
        <TabList>
          <Tab active={false} onClick={() => {}}>Tab 1</Tab>
          <Tab active={true} onClick={() => {}}>Tab 2</Tab>
        </TabList>
      );
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
    });

    it('applies flex layout', () => {
      render(
        <TabList>
          <Tab active={false} onClick={() => {}}>Tab 1</Tab>
        </TabList>
      );
      const container = screen.getByText('Tab 1').parentElement;
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('gap-2');
    });

    it('applies custom className when provided', () => {
      render(
        <TabList className="custom-class">
          <Tab active={false} onClick={() => {}}>Tab 1</Tab>
        </TabList>
      );
      const container = screen.getByText('Tab 1').parentElement;
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('TabPanel', () => {
    it('renders children correctly', () => {
      render(
        <TabPanel>
          <div>Panel Content</div>
        </TabPanel>
      );
      expect(screen.getByText('Panel Content')).toBeInTheDocument();
    });

    it('applies margin-top by default', () => {
      render(
        <TabPanel>
          <div>Panel Content</div>
        </TabPanel>
      );
      const panel = screen.getByText('Panel Content').parentElement;
      expect(panel).toHaveClass('mt-4');
    });

    it('applies custom className when provided', () => {
      render(
        <TabPanel className="custom-panel">
          <div>Panel Content</div>
        </TabPanel>
      );
      const panel = screen.getByText('Panel Content').parentElement;
      expect(panel).toHaveClass('custom-panel');
    });
  });

  describe('Tab interaction flow', () => {
    it('supports switching between tabs', () => {
      const TestComponent = () => {
        const { useState } = require('react');
        const [activeTab, setActiveTab] = useState(0);

        return (
          <div>
            <TabList>
              <Tab active={activeTab === 0} onClick={() => setActiveTab(0)}>
                Math
              </Tab>
              <Tab active={activeTab === 1} onClick={() => setActiveTab(1)}>
                Reading
              </Tab>
            </TabList>
            <TabPanel>
              {activeTab === 0 ? 'Math Content' : 'Reading Content'}
            </TabPanel>
          </div>
        );
      };

      render(<TestComponent />);

      // Initially Math is active
      expect(screen.getByText('Math')).toHaveClass('bg-green-600');
      expect(screen.getByText('Reading')).toHaveClass('bg-gray-100');
      expect(screen.getByText('Math Content')).toBeInTheDocument();

      // Click Reading tab
      fireEvent.click(screen.getByText('Reading'));

      // Now Reading is active
      expect(screen.getByText('Reading')).toHaveClass('bg-green-600');
      expect(screen.getByText('Math')).toHaveClass('bg-gray-100');
      expect(screen.getByText('Reading Content')).toBeInTheDocument();
    });
  });
});
