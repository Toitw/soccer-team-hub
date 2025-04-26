import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { es } from 'date-fns/locale';

// Default translations
const translations = {
  en: {
    navigation: {
      dashboard: "Dashboard",
      matches: "Matches",
      events: "Events",
      players: "Players",
      statistics: "Statistics",
      settings: "Settings",
      announcements: "Announcements",
      admin: "Admin"
    },
    common: {
      viewAll: "View all",
      home: "Home",
      away: "Away",
      locationNotSet: "Location not set",
      minutes: "min"
    },
    dashboard: {
      teamSummary: "Team Summary",
      upcomingEvents: "Upcoming Events",
      nextMatch: "Next Match",
      recentAnnouncements: "Announcements",
      players: "Players",
      matches: "Matches",
      wins: "Wins",
      goals: "Goals",
      season: "Season",
      noUpcomingEvents: "No upcoming events",
      addNewEvent: "Add new event",
      noRecentAnnouncements: "No recent announcements",
      addAnnouncement: "Add announcement",
      noNextMatch: "No upcoming match",
      noRecentMatches: "No recent matches",
      teamOfTheWeek: "Team of the week"
    },
    auth: {
      login: "Login",
      register: "Register",
      logout: "Logout",
      forgotPassword: "Forgot password?",
      resetPassword: "Reset password",
      verifyEmail: "Verify email",
      username: "Username",
      password: "Password",
      confirmPassword: "Confirm password",
      email: "Email",
      firstName: "First name",
      lastName: "Last name",
      rememberMe: "Remember me",
      alreadyHaveAccount: "Already have an account?",
      dontHaveAccount: "Don't have an account?",
      signInWith: "Sign in with",
      or: "or"
    },
    errors: {
      somethingWentWrong: "Something went wrong",
      pageNotFound: "Page not found",
      unauthorized: "Unauthorized",
      forbidden: "Forbidden",
      serverError: "Server error"
    },
    toasts: {
      loginSuccess: "Login successful",
      loginFailed: "Login failed",
      registrationSuccess: "Registration successful",
      registrationFailed: "Registration failed",
      logoutSuccess: "Logout successful",
      welcomeBack: "Welcome back, {{name}}!",
      welcomeToTeamKick: "Welcome to TeamKick, {{name}}!",
      error: "Error"
    }
  },
  es: {
    navigation: {
      dashboard: "Inicio",
      matches: "Partidos",
      events: "Eventos",
      players: "Jugadores",
      statistics: "Estadísticas",
      settings: "Configuración",
      announcements: "Anuncios",
      admin: "Admin"
    },
    common: {
      viewAll: "Ver todos",
      home: "Local",
      away: "Visitante",
      locationNotSet: "Ubicación no establecida",
      minutes: "min"
    },
    dashboard: {
      teamSummary: "Resumen del Equipo",
      upcomingEvents: "Próximos Eventos",
      nextMatch: "Próximo Partido",
      recentAnnouncements: "Anuncios",
      players: "Jugadores",
      matches: "Partidos",
      wins: "Victorias",
      goals: "Goles",
      season: "Temporada",
      noUpcomingEvents: "No hay eventos próximos",
      addNewEvent: "Añadir nuevo evento",
      noRecentAnnouncements: "No hay anuncios recientes",
      addAnnouncement: "Añadir anuncio",
      noNextMatch: "No hay próximo partido",
      noRecentMatches: "No hay partidos recientes",
      teamOfTheWeek: "Equipo de la semana"
    },
    auth: {
      login: "Iniciar sesión",
      register: "Registrarse",
      logout: "Cerrar sesión",
      forgotPassword: "¿Olvidaste tu contraseña?",
      resetPassword: "Restablecer contraseña",
      verifyEmail: "Verificar email",
      username: "Nombre de usuario",
      password: "Contraseña",
      confirmPassword: "Confirmar contraseña",
      email: "Correo electrónico",
      firstName: "Nombre",
      lastName: "Apellido",
      rememberMe: "Recordarme",
      alreadyHaveAccount: "¿Ya tienes una cuenta?",
      dontHaveAccount: "¿No tienes una cuenta?",
      signInWith: "Iniciar sesión con",
      or: "o"
    },
    errors: {
      somethingWentWrong: "Algo salió mal",
      pageNotFound: "Página no encontrada",
      unauthorized: "No autorizado",
      forbidden: "Prohibido",
      serverError: "Error del servidor"
    },
    toasts: {
      loginSuccess: "Inicio de sesión exitoso",
      loginFailed: "Error al iniciar sesión",
      registrationSuccess: "Registro exitoso",
      registrationFailed: "Error al registrarse",
      logoutSuccess: "Cierre de sesión exitoso",
      welcomeBack: "¡Bienvenido de nuevo, {{name}}!",
      welcomeToTeamKick: "¡Bienvenido a TeamKick, {{name}}!",
      error: "Error"
    }
  }
};

// Types
type Language = 'en' | 'es';
type TranslationKey = string;
type Translations = typeof translations;
type TranslationParams = Record<string, string | number>;

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

// Create context
const LanguageContext = createContext<LanguageContextType | null>(null);

// Provider component
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');

  // Initialize language from localStorage or navigator
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && ['en', 'es'].includes(savedLanguage)) {
      setCurrentLanguage(savedLanguage);
    } else {
      // Try to get from browser
      const browserLang = navigator.language.split('-')[0] as Language;
      if (browserLang === 'es') {
        setCurrentLanguage('es');
      }
    }
  }, []);

  // Save language preference to localStorage
  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem('language', lang);
  };

  // Translation function
  const t = (key: TranslationKey, params?: TranslationParams): string => {
    // Split the key by dots to access nested objects
    const keyParts = key.split('.');
    
    // Start with the current language's translations
    let translation: any = translations[currentLanguage];
    
    // Navigate through the key parts
    for (const part of keyParts) {
      if (translation && typeof translation === 'object' && part in translation) {
        translation = translation[part];
      } else {
        // If key not found, try English as fallback
        if (currentLanguage !== 'en') {
          let engTranslation = translations['en'];
          for (const engPart of keyParts) {
            if (engTranslation && typeof engTranslation === 'object' && engPart in engTranslation) {
              engTranslation = engTranslation[engPart];
            } else {
              return key; // Return the key itself if not found in English either
            }
          }
          translation = engTranslation;
        } else {
          return key; // Return the key itself if not found
        }
      }
    }
    
    // Replace parameters if they exist
    if (params && typeof translation === 'string') {
      return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
        return str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      }, translation);
    }
    
    return translation || key;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default useLanguage;