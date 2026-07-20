const env = import.meta.env || {};

export const API_URL = env.VITE_USE_PROD_API === 'true' || env.PROD
  ? 'https://my-work-9b66.onrender.com' 
  : 'http://localhost:3001';

// 10 GB in bytes — matches server-side busboy limit
export const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024;
