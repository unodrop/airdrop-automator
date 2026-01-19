import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

export type Locale = 'zh-CN' | 'en-US';

export const locales = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export const defaultLocale: Locale = 'en-US';

/**
 * 检测系统语言
 * 根据浏览器或系统语言自动选择最合适的语言
 */
export function detectSystemLocale(): Locale {
  // 获取系统语言列表
  const systemLanguages = navigator.languages || [navigator.language];
  
  // 遍历系统语言，找到第一个支持的语言
  for (const lang of systemLanguages) {
    // 完全匹配（如 zh-CN）
    if (lang in locales) {
      return lang as Locale;
    }
    
    // 语言前缀匹配（如 zh 匹配 zh-CN）
    const langPrefix = lang.split('-')[0].toLowerCase();
    
    if (langPrefix === 'zh') {
      return 'zh-CN';
    }
    
    if (langPrefix === 'en') {
      return 'en-US';
    }
  }
  
  // 默认返回英文
  return defaultLocale;
}

/**
 * 获取嵌套对象的值
 * 例如：get(obj, 'a.b.c') 返回 obj.a.b.c
 */
function get(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * 替换模板变量
 * 例如：interpolate('Hello {{name}}', { name: 'World' }) 返回 'Hello World'
 */
function interpolate(template: string, vars: Record<string, any> = {}): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] !== undefined ? String(vars[key]) : match;
  });
}

/**
 * 翻译函数类型
 */
export type TranslateFunction = (
  key: string,
  vars?: Record<string, any>
) => string;

/**
 * 创建翻译函数
 */
export function createTranslateFunction(locale: Locale): TranslateFunction {
  const messages = locales[locale] || locales[defaultLocale];
  
  return (key: string, vars?: Record<string, any>): string => {
    const value = get(messages, key);
    
    if (value === undefined) {
      console.warn(`Translation key "${key}" not found for locale "${locale}"`);
      return key;
    }
    
    if (typeof value !== 'string') {
      console.warn(`Translation value for key "${key}" is not a string`);
      return key;
    }
    
    return interpolate(value, vars);
  };
}
