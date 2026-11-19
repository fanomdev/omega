// Unified contract for the three aggregated backends (OmegaAPI, Cooren/MangaPill, Akari v2).
export interface NormalizedChapterSource {
  name: string;
  rank?: number | null;
  url?: string;
}

export interface NormalizedSource {
  name: string;
  url: string;
  latestChapter?: string | null;
  chapterCount?: number | null;
  color?: string | null;
}

export interface NormalizedChapter {
  id: number | string;
  name: string;
  title: string | null;
  slug: string;
  thumbnail: string;
  scanlatorId?: number | null;
  pages?: number | null;
  sources?: NormalizedChapterSource[];
  createdAt: string;
  index: string;
  url: string;
}

export interface NormalizedSeries {
  id: number | string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  cover: string;
  status: string;
  type: string;
  rating: number;
  totalViews: number;
  alternativeNames: string;
  author: string;
  studio: string;
  releaseYear: string;
  releaseSchedule: string[];
  tags: string[];
  chaptersCount: number;
  bookmarksCount: number;
  isComingSoon: boolean;
  badge: string | null;
  createdAt: string;
  updatedAt: string;
  chapters: NormalizedChapter[];
  url: string;
  // Which backend this item came from (merged catalog).
  source?: 'omega' | 'cooren' | 'allmanga' | 'mangadex';
  // Source tag per merged catalog item.
  sources?: NormalizedSource[];
}

export interface ChapterOption {
  label: string;
  value: string;
  scanlatorId: number;
}

export interface ChapterNavigation {
  number: number;
  scanlatorId: number;
}

export interface NormalizedChapterContent {
  id: number | string;
  name: string;
  title: string | null;
  slug: string;
  index: string | number;
  type?: string;
  images: string[];
  pageCount: number;
  number?: number;
  chapters?: ChapterOption[];
  mangaId?: string;
  mangaTitle?: string;
  lastChapter?: ChapterNavigation | null;
  nextChapter?: ChapterNavigation | null;
  createdAt: string;
  price?: number;
  isFree?: boolean;
  thumbnail?: string;
  series: {
    id: number | string;
    title: string;
    slug: string;
    thumbnail: string;
    status: string;
    description: string;
  };
  url: string;
}

export interface Pagination {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
  /** Set when a secondary catalogue partially failed Ã¢â‚¬â€ page can show a hint instead of silently shrinking
   * (e.g. MangaDex upstream rate-limiting while MangaPill keeps working). */
  notice?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface SeriesQuery {
  page?: number;
  perPage?: number;
  q?: string;
  sort?: 'title' | 'rating' | 'views' | 'updated';
  sortBy?: 'latest' | 'popular' | 'newest' | 'updated' | 'views' | 'rating' | 'title';
  order?: 'asc' | 'desc';
  status?: string;
  type?: string;
  genres?: string[];
  types?: string[];
  sfwOnly?: boolean;
}
