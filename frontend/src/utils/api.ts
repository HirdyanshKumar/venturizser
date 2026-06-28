export const getApiUrl = (path: string): string => {
  // If VITE_API_URL is configured (e.g. in production or .env), use it
  const baseUrl = import.meta.env.VITE_API_URL;
  if (baseUrl) {
    if (baseUrl.startsWith('/')) {
      return `${baseUrl}${path}`;
    }
    // Remove the '/api' prefix when calling the backend directly,
    // as backend routes are mounted without '/api' (e.g., /sessions, /admin/leads)
    const cleanPath = path.startsWith('/api') ? path.replace(/^\/api/, '') : path;
    return `${baseUrl.replace(/\/$/, '')}${cleanPath}`;
  }
  // Default fallback to relative path
  return path;
};
