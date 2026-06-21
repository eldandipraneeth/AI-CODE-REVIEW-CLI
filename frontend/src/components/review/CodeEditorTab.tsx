import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '../ui/Button';
import { CodeReviewResult } from '../../types/review';
import { api } from '../../services/api';
import { useReviewSettings } from '../../hooks/useReviewSettings';
import { useTheme } from '../../contexts/ThemeContext';
import { Play } from 'lucide-react';

interface CodeEditorTabProps {
  onReviewResult: (result: CodeReviewResult) => void;
  onError: (error: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { id: 'python', name: 'Python' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
];

export function CodeEditorTab({ onReviewResult, onError }: CodeEditorTabProps) {
  const [code, setCode] = useState('// Paste your code here...\n');
  const [language, setLanguage] = useState('python');
  const [filename, setFilename] = useState('snippet.py');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { settings } = useReviewSettings();
  const { isDark } = useTheme();

  const handleAnalyze = async () => {
    if (!code.trim() || code.trim() === '// Paste your code here...') {
      onError('Please provide some code to review.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/review/code', {
        code,
        language,
        filename,
        model: settings.model
      });
      onReviewResult(response.data);
    } catch (err: any) {
      onError(err.response?.data?.detail || 'Failed to analyze code. Please check your API key and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between bg-muted/50 p-3 rounded-lg border">
        <div className="flex items-center gap-4 flex-1">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              // Auto-update filename extension based on basic rules
              const extMap: Record<string, string> = { python: 'py', javascript: 'js', typescript: 'ts', java: 'java', cpp: 'cpp', go: 'go', rust: 'rs' };
              const ext = extMap[e.target.value] || 'txt';
              setFilename(filename.replace(/\.[^/.]+$/, "") + "." + ext);
            }}
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>{lang.name}</option>
            ))}
          </select>

          <input
            type="text"
            className="flex h-9 w-full sm:w-64 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Filename (e.g. main.py)"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
        </div>
        
        <Button onClick={handleAnalyze} isLoading={isSubmitting} className="w-full sm:w-auto gap-2">
          {!isSubmitting && <Play className="w-4 h-4" />} Analyze Code
        </Button>
      </div>

      <div className="rounded-xl overflow-hidden border shadow-sm h-[500px]">
        <Editor
          height="100%"
          language={language}
          theme={isDark ? 'vs-dark' : 'light'}
          value={code}
          onChange={(val) => setCode(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}
