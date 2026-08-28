// Single source of truth for the backend URL. Set VITE_API_URL in a .env
// file (see .env.example) when deploying — otherwise this falls back to
// the local dev backend.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
