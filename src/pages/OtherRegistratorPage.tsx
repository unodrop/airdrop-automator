import { Boxes, Settings, Info } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import { Button } from '@/components/ui/button';

export function OtherRegistratorPage() {
  const t = useTranslation();
  
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Boxes className="w-7 h-7 text-primary" />
              {t('registrator.otherTitle')}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {t('registrator.otherSubtitle')}
            </p>
          </div>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'X (Twitter)', icon: '✕', status: t('registrator.planned') },
            { name: 'Discord', icon: '💬', status: t('registrator.inDevelopment') },
            { name: 'Telegram', icon: '✈️', status: t('registrator.planned') },
          ].map((platform) => (
            <div
              key={platform.name}
              className="p-5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{platform.icon}</span>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-white">
                    {platform.name}
                  </h3>
                  <p className="text-xs text-gray-500">{platform.status}</p>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                {t('registrator.batchRegister', { name: platform.name })}
              </p>
            </div>
          ))}
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Boxes className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              {t('registrator.comingSoon')}
            </h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {t('registrator.comingSoonDesc')}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                className="border-white/10 text-gray-300 hover:bg-white/5"
              >
                <Info className="w-4 h-4 mr-2" />
                {t('registrator.learnMore')}
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                {t('registrator.configNotifications')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
