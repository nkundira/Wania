import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true
});

// Collection payloads are rendered with .map()/.length, so they must always be
// arrays. Guards against a missing or renamed field in an API response.
export const asArray = (value) => (Array.isArray(value) ? value : []);

api.interceptors.response.use(
  (res) => {
    // When VITE_API_URL is missing or wrong, the SPA host answers /api/* with
    // index.html (HTTP 200) instead of JSON. Left alone, that HTML string is
    // read as the payload and every consumer ends up rendering undefined data.
    // Reject instead, so callers fall back to their empty state.
    const body = res.data;
    const isHtml = typeof body === 'string' && body.trimStart().startsWith('<');
    if (isHtml) {
      const error = new Error(
        `API request to ${res.config?.url} returned HTML instead of JSON. Check that VITE_API_URL points at the backend.`
      );
      // Logged because callers swallow rejections to keep their empty state.
      console.error(error.message);
      return Promise.reject(error);
    }
    // Normalise empty payloads so callers can read fields without null checks.
    if (res.data === null || res.data === undefined) res.data = {};
    return res;
  },
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/')) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(err);
  }
);

export default api;
