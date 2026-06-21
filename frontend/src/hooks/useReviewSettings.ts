import { useState, useEffect } from 'react';

export interface ReviewSettings {
  model: string;
  github_token: string;
}

const DEFAULT_SETTINGS: ReviewSettings = {
  model: 'gemini-2.5-flash',
  github_token: '',
};

export function useReviewSettings() {
  const [settings, setSettings] = useState<ReviewSettings>(() => {
    const saved = localStorage.getItem('review_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (newSettings: Partial<ReviewSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('review_settings', JSON.stringify(updated));
      return updated;
    });
  };

  return { settings, updateSettings };
}
