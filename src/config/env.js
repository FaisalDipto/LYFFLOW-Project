/**
 * Centralized Environment & API Configuration
 * 
 * Automatically detects whether the application is running in Development (meharaz733.com / port 3001)
 * or Production (lyfflow.com / port 3000).
 */

const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const port = typeof window !== 'undefined' ? window.location.port : '';

// Check if running on dev branch domain or local dev port 3001
export const IS_DEV_ENV = hostname.includes('meharaz733.com') || port === '3001';

// Base URL for API requests
export const API_BASE = IS_DEV_ENV
  ? 'https://api.meharaz733.com'
  : 'https://api.lyfflow.com';

// Base URL for Frontend site navigation / redirects
export const SITE_BASE = IS_DEV_ENV
  ? 'https://www.meharaz733.com'
  : 'https://www.lyfflow.com';
