import type { CorsOptions } from 'cors';

/**
 * Default localhost origins allowed in development mode
 */
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5001',
];

/**
 * Parses the ALLOWED_ORIGINS environment variable into an array of origins.
 * Supports comma-separated list of origins.
 *
 * @param originsEnv - The ALLOWED_ORIGINS environment variable value
 * @returns Array of origin strings, or empty array if not defined
 */
export function parseAllowedOrigins(originsEnv: string | undefined): string[] {
  if (!originsEnv || originsEnv.trim() === '') {
    return [];
  }

  return originsEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
}

/**
 * Determines if the application is running in development mode.
 * Development mode is when NODE_ENV is not set or is not 'production'.
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Builds CORS options based on environment configuration.
 *
 * - Uses ALLOWED_ORIGINS env var if set (comma-separated list of origins)
 * - Falls back to allowing localhost origins in development mode
 * - In production without ALLOWED_ORIGINS, no origins are allowed (strict mode)
 *
 * @returns CorsOptions object for use with the cors middleware
 */
export function buildCorsOptions(): CorsOptions {
  const configuredOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

  // If origins are explicitly configured, use them
  if (configuredOrigins.length > 0) {
    return {
      origin: configuredOrigins,
      credentials: true,
    };
  }

  // In development mode, allow localhost origins
  if (isDevelopment()) {
    return {
      origin: DEFAULT_DEV_ORIGINS,
      credentials: true,
    };
  }

  // In production without configured origins, block all cross-origin requests
  return {
    origin: false,
    credentials: true,
  };
}

/**
 * Gets the list of allowed origins based on current configuration.
 * Useful for logging and debugging.
 *
 * @returns Array of allowed origin strings, or 'none' if origins are blocked
 */
export function getAllowedOrigins(): string[] | 'none' {
  const configuredOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (isDevelopment()) {
    return DEFAULT_DEV_ORIGINS;
  }

  return 'none';
}
