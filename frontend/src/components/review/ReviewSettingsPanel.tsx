import React from 'react';
import { useReviewSettings } from '../../hooks/useReviewSettings';
import { Input } from '../ui/Input';
import { Settings, Key, Cpu } from 'lucide-react';

export function ReviewSettingsPanel() {
  const { settings, updateSettings } = useReviewSettings();

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4 text-card-foreground">
        <Settings className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-semibold">Review Settings</h2>
      </div>
      
      <p className="text-sm text-muted-foreground mb-6">
        Configure your GitHub integration to analyze private Pull Requests.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            GitHub Personal Access Token (Optional)
          </label>
          <Input 
            type="password" 
            placeholder="ghp_..." 
            value={settings.github_token}
            onChange={e => updateSettings({ github_token: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Required only for fetching private Pull Requests. Never stored in the database.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            Model
          </label>
          <div className="flex items-center justify-between rounded-md border border-[hsl(222_14%_18%)] bg-[hsl(222_20%_5%)] px-3 py-2.5 shadow-sm">
            <span className="text-sm font-medium text-white">Gemini 2.5 Flash</span>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
