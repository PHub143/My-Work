export const API_URL = import.meta.env.VITE_USE_PROD_API === 'true' || import.meta.env.PROD 
  ? 'https://my-work-9b66.onrender.com' 
  : 'http://localhost:3001';

export const ALLOWED_FILE_TYPES = [
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  // Documents
  '.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // Video
  '.mp4', '.mov', '.avi', '.mkv', '.webm',
  // Audio
  '.mp3', '.wav', '.aac', '.ogg',
  // Archives
  '.zip', '.rar', '.gz',
];

// 10 GB in bytes — matches server-side busboy limit
export const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024;
