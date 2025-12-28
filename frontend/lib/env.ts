/**
 * Environment detection utility for frontend
 * Determines if running in development or production
 */
export function isDevelopment(): boolean {
  if (typeof window === 'undefined') {
    return false; // SSR safety
  }

  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    process.env.NEXT_PUBLIC_API_URL?.includes('localhost') ||
    false
  );
}
