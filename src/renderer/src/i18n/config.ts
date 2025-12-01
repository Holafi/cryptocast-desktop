import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import zh from './locales/zh.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';
import ko from './locales/ko.json';
import vi from './locales/vi.json';
import tr from './locales/tr.json';

const { electronAPI } = window as any;

// Custom language detector for Electron
const electronLanguageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      // Check localStorage first
      const savedLang = localStorage.getItem('i18nextLng');
      if (savedLang) {
        callback(savedLang);
        return;
      }

      // Get system language from Electron
      if (electronAPI?.app?.getLocale) {
        const systemLocale = await electronAPI.app.getLocale();
        // Convert locale to language code (e.g., 'zh-CN' -> 'zh', 'en-US' -> 'en')
        const langCode = systemLocale.split('-')[0].toLowerCase();
        const supportedLangs = ['en', 'zh', 'fr', 'de', 'ja', 'es', 'pt', 'ru', 'ar', 'ko', 'vi', 'tr'];
        const lang = supportedLangs.includes(langCode) ? langCode : 'en';
        callback(lang);
      } else {
        callback('en');
      }
    } catch (error) {
      console.error('Failed to detect language:', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: (lng: string) => {
    localStorage.setItem('i18nextLng', lng);
  },
};

// Initialize i18next
i18n
  .use(electronLanguageDetector)
  .use(LanguageDetector) // Fallback detector
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      fr: { translation: fr },
      de: { translation: de },
      ja: { translation: ja },
      es: { translation: es },
      pt: { translation: pt },
      ru: { translation: ru },
      ar: { translation: ar },
      ko: { translation: ko },
      vi: { translation: vi },
      tr: { translation: tr },
    },
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
