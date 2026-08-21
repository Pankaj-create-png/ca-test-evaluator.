/**
 * API Base URL Configuration
 * In production (e.g. GitHub Pages build), process/vite injects VITE_API_URL.
 * In local dev mode without VITE_API_URL set, defaults to empty string ''
 * so Vite dev server proxy handles /api requests to http://localhost:5000.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/**
 * Returns full URL for any relative API path
 * @param {string} endpoint - e.g. '/api/health'
 */
export function getApiUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}
