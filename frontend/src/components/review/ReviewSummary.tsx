import React from 'react';
import { CodeReviewResult } from '../../types/review';
import { Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

interface ReviewSummaryProps {
  result: CodeReviewResult;
}

export function ReviewSummary({ result }: ReviewSummaryProps) {
  const issues = result.issues || [];
  
  const highCount = issues.filter(i => i.severity === 'high').length;
  const medCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "code_review_results.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold">Review Summary</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              result.quality_score >= 8 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
              result.quality_score >= 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
              'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
            }`}>
              Score: {result.quality_score}/10
            </span>
          </div>
          <p className="text-muted-foreground whitespace-pre-wrap">{result.summary}</p>
        </div>

        <div className="flex flex-col gap-4 min-w-[200px]">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-900/50">
              <div className="text-red-600 dark:text-red-400 font-bold text-xl">{highCount}</div>
              <div className="text-xs text-red-600/80 dark:text-red-400/80 uppercase">High</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg border border-yellow-100 dark:border-yellow-900/50">
              <div className="text-yellow-600 dark:text-yellow-400 font-bold text-xl">{medCount}</div>
              <div className="text-xs text-yellow-600/80 dark:text-yellow-400/80 uppercase">Med</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-900/50">
              <div className="text-blue-600 dark:text-blue-400 font-bold text-xl">{lowCount}</div>
              <div className="text-xs text-blue-600/80 dark:text-blue-400/80 uppercase">Low</div>
            </div>
          </div>
          
          <Button onClick={handleExport} variant="outline" className="w-full gap-2">
            <Download className="w-4 h-4" /> Export JSON
          </Button>
        </div>
      </div>
      
      {issues.length === 0 && (
        <div className="mt-6 flex items-center justify-center p-8 border-2 border-dashed rounded-lg bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/50">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-400">Perfect Code!</h3>
            <p className="text-green-600 dark:text-green-500">No issues were found during the analysis.</p>
          </div>
        </div>
      )}
    </div>
  );
}
