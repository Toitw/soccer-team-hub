import { useLanguage } from "./use-language";

// Simple wrapper around useLanguage to provide the t function
export function useTranslation() {
  const { t, currentLanguage } = useLanguage();
  
  return { 
    t, 
    language: currentLanguage 
  };
}