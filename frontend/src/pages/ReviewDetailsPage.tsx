import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reviewApi } from '../services/api';
import { CodeReviewResult } from '../types/review';
import { ReviewSummary } from '../components/review/ReviewSummary';
import { IssueCard } from '../components/review/IssueCard';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export function ReviewDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [review, setReview] = useState<CodeReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReview = async () => {
      if (!id) return;
      try {
        const res = await reviewApi.getReview(parseInt(id, 10));
        setReview(res);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load review details.');
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="text-primary-600 h-10 w-10" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 max-w-4xl mx-auto mt-8">
        <div className="font-medium mb-2">{error || 'Review not found.'}</div>
        <Link to="/dashboard/history">
          <Button variant="outline" size="sm">Go back to History</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="mb-6">
        <Link to="/dashboard/history">
          <Button variant="ghost" className="gap-2 -ml-4">
            <ArrowLeft className="w-4 h-4" /> Back to History
          </Button>
        </Link>
      </div>

      <ReviewSummary result={review} />

      {review.issues && review.issues.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight mb-4">Detailed Findings ({review.issues.length})</h3>
          <div className="flex flex-col gap-4">
            {review.issues.map((issue, idx) => (
              <IssueCard key={`${issue.file}-${issue.line_number}-${idx}`} issue={issue} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
