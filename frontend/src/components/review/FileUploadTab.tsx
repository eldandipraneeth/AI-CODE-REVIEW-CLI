import React, { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { CodeReviewResult } from '../../types/review';
import { api } from '../../services/api';
import { useReviewSettings } from '../../hooks/useReviewSettings';
import { UploadCloud, File, X, Play } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FileUploadTabProps {
  onReviewResult: (result: CodeReviewResult) => void;
  onError: (error: string) => void;
}

export function FileUploadTab({ onReviewResult, onError }: FileUploadTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { settings } = useReviewSettings();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      onError('Please select a file to review.');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', settings.model);

    try {
      const response = await api.post('/review/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      onReviewResult(response.data);
    } catch (err: any) {
      onError(err.response?.data?.detail || 'Failed to analyze file. Please check your API key and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <div 
          className={cn(
            "border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer",
            isDragging 
              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" 
              : "border-muted-foreground/25 hover:bg-muted/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileSelect}
            accept=".py,.js,.ts,.jsx,.tsx,.java,.cpp,.c,.go,.rs,.php,.rb,.swift"
          />
          <UploadCloud className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Click or drag file to this area to upload</h3>
          <p className="text-sm text-muted-foreground">
            Supports source code files (.py, .js, .ts, .java, .cpp, etc.) up to 1MB.
          </p>
        </div>
      ) : (
        <div className="border rounded-xl p-6 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 rounded-lg">
                <File className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-medium">{file.name}</h4>
                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remove file">
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button onClick={handleAnalyze} isLoading={isSubmitting} size="lg" className="w-full sm:w-auto gap-2">
              {!isSubmitting && <Play className="w-4 h-4" />} Analyze Uploaded File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
