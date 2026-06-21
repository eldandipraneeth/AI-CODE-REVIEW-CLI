import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useReviewSettings } from '../hooks/useReviewSettings';
import { userApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { User as UserIcon, Moon, Sun, Key, Cpu, Save } from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { settings, updateSettings } = useReviewSettings();
  
  const [username, setUsername] = useState(user?.username || '');
  const [githubToken, setGithubToken] = useState(settings.github_token);
  const [model, setModel] = useState(settings.model);
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (user) setUsername(user.username);
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      // 1. Save DB settings
      if (username !== user?.username) {
        await userApi.updateProfile({ username });
      }
      
      // 2. Save local storage settings
      updateSettings({
        github_token: githubToken,
        model: model,
      });

      setMessage({ type: 'success', text: 'Settings saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your profile, preferences, and API tokens.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6">
        {/* Profile Section */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <UserIcon className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold">Profile Information</h2>
          </div>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input value={user?.email || ''} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input value={username} onChange={e => setUsername(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            {isDark ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            <h2 className="text-xl font-semibold">Preferences</h2>
          </div>
          <div className="space-y-6 max-w-md">
            <div 
              className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={toggleTheme}
            >
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Toggle the application theme.</p>
              </div>
              <button
                type="button"
                className={`w-11 h-6 rounded-full transition-colors relative ${isDark ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
              >
                <span className={`block w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                Default AI Model
              </label>
              <div className="flex items-center justify-between rounded-md border border-[hsl(222_14%_18%)] bg-[hsl(222_20%_5%)] px-3 py-2.5 shadow-sm">
                <span className="text-sm font-medium text-white">Gemini 2.5 Flash</span>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground">This model will be selected by default for new reviews.</p>
            </div>
          </div>
        </div>

        {/* Tokens Section */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Key className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold">Security & Tokens</h2>
          </div>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium">GitHub Personal Access Token</label>
              <Input 
                type="password" 
                placeholder="ghp_..." 
                value={githubToken} 
                onChange={e => setGithubToken(e.target.value)} 
              />
              <p className="text-xs text-muted-foreground">
                Required for private PRs and automated commenting. Saved securely in your browser's local storage.
              </p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} isLoading={isSaving} size="lg" className="gap-2">
            {!isSaving && <Save className="w-4 h-4" />} Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
