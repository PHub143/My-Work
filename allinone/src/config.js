export const API_URL = import.meta.env.VITE_USE_PROD_API === 'true' || import.meta.env.PROD 
  ? 'https://my-work-9b66.onrender.com' 
  : 'http://localhost:3001';

export const ALLOWED_FILE_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt'];
