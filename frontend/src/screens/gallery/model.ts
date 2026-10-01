import type { Album } from '@/store/api/content';
import type { ApiError } from '@/store/api/http';

/** Галерея: альбомы с обложкой и числом фото. */
export interface GalleryViewProps {
  albums: Album[];
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}
