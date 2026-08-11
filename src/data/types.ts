export interface Nation {
  id: string; name: string; time: string; status: string; alignment: string;
  diplomacy: { friendly: number; hostile: number; neutral: number };
  warStats: { wars: number; wins: number; losses: number };
}
export interface Person {
  id: string; name: string; aliases: string[]; nationId: string; role: string;
  status: string; motto: string; category: string;
}
export interface HistoryEvent {
  id: string; date: string; type: string; title: string; description: string; location: string; status: string; relatedNations: string[];
}
export interface Chronicle {
  id: string; date: string; title: string; description: string;
}
export interface War { id: string; name: string; }
export interface Building { id: string; name: string; }

export type PageType = 'nation' | 'person' | 'event' | 'war' | 'building' | 'chronicle' | 'article';
export type PageStatus = 'pending' | 'approved' | 'rejected';

export interface WikiPage {
  id: string;
  slug: string;
  title: string;
  type: PageType;
  body: string;
  status: PageStatus;
  author_id: string;
  author_name: string;
  review_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  series_id?: string | null;
  tags?: string[];
  cover_url?: string;
  theme_id?: string | null;
}

export interface Series {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
  parent_id?: string | null;
  theme_id?: string | null;
}

export interface Theme {
  id: string;
  slug: string;
  name: string;
  slogan: string;
  accent: string;
  accent_soft: string;
  bg: string;
  style: string;
  created_at: string;
}

export interface PageSummary {
  slug: string;
  title: string;
  type: PageType;
  status: PageStatus;
  author_name: string;
  created_at: string;
  excerpt: string;
  cover_url?: string;
  tags?: string[];
  series_id?: string | null;
  theme_id?: string | null;
}
