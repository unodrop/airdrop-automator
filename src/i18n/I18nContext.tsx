import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, detectSystemLocale, createTranslateFunction, TranslateFunction } from './config';

interface I18nContextType {
  locale: Locale;
  t: TranslateFunction;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => detectSystemLocale());
  const [t, setT] = useState<TranslateFunction>(() => createTranslateFunction(locale));

  useEffect(() => {
    // 检测系统语言
    const detectedLocale = detectSystemLocale();
    setLocale(detectedLocale);
    setT(() => createTranslateFunction(detectedLocale));
    
    console.log(`🌍 System locale detected: ${detectedLocale}`);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * 使用国际化的 Hook
 * @returns { locale, t } locale: 当前语言, t: 翻译函数
 */
export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

/**
 * 使用翻译的快捷 Hook
 * @returns t - 翻译函数
 */
export function useTranslation() {
  const { t } = useI18n();
  return t;
}
