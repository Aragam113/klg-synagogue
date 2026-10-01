// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Cache TTL (seconds)
export const CACHE_TTL = {
  SHORT: 120, // 2 minutes
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
};

// Languages
export {
  LANGS as SUPPORTED_LANGUAGES,
  DEFAULT_LANG as DEFAULT_LANGUAGE,
} from './localization';
