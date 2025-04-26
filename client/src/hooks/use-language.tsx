import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { enUS } from "../locales/en-US";
import { esES } from "../locales/es-ES";

type Language = "en" | "es";
type Translations = typeof enUS;

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: Translations;
}

const defaultLanguage: Language = "es"; // Default to Spanish

const translations = {
  en: enUS,
  es: esES
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    // Try to get the language from localStorage, otherwise use default
    const savedLanguage = localStorage.getItem("language") as Language;
    return savedLanguage && ["en", "es"].includes(savedLanguage) ? savedLanguage : defaultLanguage;
  });

  // Update HTML lang attribute when language changes
  useEffect(() => {
    document.documentElement.lang = currentLanguage;
    localStorage.setItem("language", currentLanguage);
  }, [currentLanguage]);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
  };

  // Function to get a translation by key, with support for nested keys (e.g. "auth.login")
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".");
    let value: any = translations[currentLanguage];
    
    // Navigate through the nested object to get to the specific translation
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // Return the key itself if translation is missing
      }
    }

    // Handle string interpolation if parameters are provided
    if (typeof value === "string" && params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() || `{{${paramKey}}}`;
      });
    }

    return typeof value === "string" ? value : key;
  };

  const contextValue: LanguageContextType = {
    currentLanguage,
    setLanguage,
    t,
    translations: translations[currentLanguage],
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};