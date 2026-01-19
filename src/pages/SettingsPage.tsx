import { useState, useEffect } from 'react';
import { Settings, Power, Minimize2, Save } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AppSettings {
  close_behavior: 'exit' | 'minimize_to_tray';
  auto_start: boolean;
  minimize_to_tray: boolean;
}

export function SettingsPage() {
  const t = useTranslation();
  const [settings, setSettings] = useState<AppSettings>({
    close_behavior: 'minimize_to_tray',
    auto_start: false,
    minimize_to_tray: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const data = await invoke<AppSettings>('get_app_settings');
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_app_settings', { settings });
      toast.success(t('settings.settingsSaved'));
    } catch (error: any) {
      toast.error(t('settings.settingsSaveFailed'), {
        description: error.toString(),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a150a]">
      <div className="p-4 space-y-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              {t('settings.title')}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('settings.subtitle')}
            </p>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-3">
          {/* 窗口行为 - 合并成一行 */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <Minimize2 className="w-4 h-4 text-primary" />
              {t('settings.windowBehavior')}
            </h2>
            
            {/* 两个选项并排显示 */}
            <div className="flex gap-3">
              {/* 退出程序 */}
              <div
                onClick={() => setSettings({ ...settings, close_behavior: 'exit' })}
                className={`flex-1 flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  settings.close_behavior === 'exit'
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Power className="w-4 h-4 text-red-400" />
                  <div className="text-white text-sm font-medium">{t('settings.exitProgram')}</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    settings.close_behavior === 'exit'
                      ? 'border-primary bg-primary'
                      : 'border-gray-600'
                  }`}
                >
                  {settings.close_behavior === 'exit' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </div>

              {/* 最小化到托盘 */}
              <div
                onClick={() => setSettings({ ...settings, close_behavior: 'minimize_to_tray' })}
                className={`flex-1 flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  settings.close_behavior === 'minimize_to_tray'
                    ? 'border-primary bg-primary/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Minimize2 className="w-4 h-4 text-primary" />
                  <div className="text-white text-sm font-medium">{t('settings.minimizeToTray')}</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    settings.close_behavior === 'minimize_to_tray'
                      ? 'border-primary bg-primary'
                      : 'border-gray-600'
                  }`}
                >
                  {settings.close_behavior === 'minimize_to_tray' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? t('common.loading') : t('settings.saveSettings')}
          </Button>
        </div>
      </div>
    </div>
  );
}
