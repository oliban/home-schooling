'use client';

import { useEffect } from 'react';

export function RechartsWarningFilter() {
  useEffect(() => {
    // Store original console.warn
    const originalWarn = console.warn;

    // Override console.warn to filter out Recharts dimension warnings
    console.warn = (...args: any[]) => {
      const message = args[0];

      // Filter out Recharts width/height warnings
      if (
        typeof message === 'string' &&
        message.includes('The width') &&
        message.includes('and height') &&
        message.includes('of chart should be greater than 0')
      ) {
        return; // Suppress this warning
      }

      // Pass through all other warnings
      originalWarn(...args);
    };

    // Cleanup: restore original console.warn when component unmounts
    return () => {
      console.warn = originalWarn;
    };
  }, []);

  return null; // This component doesn't render anything
}
