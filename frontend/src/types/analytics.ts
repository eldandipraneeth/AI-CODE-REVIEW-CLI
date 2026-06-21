export interface TrendData {
  date: string;
  count: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
}

export interface SeverityDistribution {
  severity: string;
  count: number;
}

export interface AnalyticsResponse {
  total_reviews: number;
  reviews_this_week: number;
  reviews_this_month: number;
  trends: TrendData[];
  category_distribution: CategoryDistribution[];
  severity_distribution: SeverityDistribution[];
}

export interface ReviewListItem {
  id: number;
  review_type: string;
  source_name: string;
  quality_score: number;
  total_issues: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  model_used: string;
  duration_seconds: number;
  created_at: string;
}

export interface ReviewListResponse {
  reviews: ReviewListItem[];
  total: number;
  page: number;
  limit: number;
}
