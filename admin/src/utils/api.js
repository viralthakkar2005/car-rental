import axios from 'axios';

export const BASE_URL = 'http://localhost:5000';

// Shared axios instance for every admin API call. Automatically attaches
// the logged-in admin's JWT (if present) and redirects to /login on a 401
// so an expired/invalid token doesn't leave the UI silently broken.
// timeout: without this, a hung backend (e.g. stuck DB/Cloudinary call)
// leaves the UI spinning forever with no feedback. 30s is generous enough
// for an image upload but still surfaces a clear error instead of hanging.
const api = axios.create({ baseURL: BASE_URL, timeout: 30000, headers: { Accept: 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.code === 'ECONNABORTED') {
      err.message = 'Request timed out — the backend took too long to respond. Check that the backend server is running and can reach MongoDB/Cloudinary.';
    } else if (!err.response) {
      err.message = 'Could not reach the backend server. Is it running on ' + BASE_URL + '?';
    }
    if (err?.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;