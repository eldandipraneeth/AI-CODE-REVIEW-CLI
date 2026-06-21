export type Severity = 'high' | 'medium' | 'low';
export type Category = 'security' | 'performance' | 'bug' | 'error_handling' | 'style' | 'test_coverage' | 'maintainability';

export interface ReviewIssue {
  file: string;
  line_number: number;
  severity: Severity;
  category: Category;
  explanation: string;
  suggested_fix: string;
}

export interface CodeReviewResult {
  issues: ReviewIssue[];
  summary: string;
  quality_score: number;
}

// Extended interface that includes backend metadata (from DB)
export interface SavedReview extends CodeReviewResult {
  id: number;
  user_id: number;
  review_type: string;
  source_name: string;
  total_issues: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  model_used: string;
  duration_seconds: number;
  created_at: string;
}
