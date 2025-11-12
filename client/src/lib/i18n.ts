import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from '../locales/en.json';
import kaTranslations from '../locales/ka.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  ka: {
    translation: kaTranslations,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

// Add language change listener to update document language and class
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  document.documentElement.className = document.documentElement.className.replace(/language-\w+/g, '');
  document.documentElement.classList.add(`language-${lng}`);
});

// Set initial language class
document.documentElement.lang = i18n.language;
document.documentElement.classList.add(`language-${i18n.language}`);

export default i18n;
