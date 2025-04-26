import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define all available languages
const languages = {
  en: 'English',
  es: 'Español',
};

// Define all translation keys
const translations = {
  en: {
    navigation: {
      dashboard: 'Dashboard',
      matches: 'Matches',
      events: 'Events',
      players: 'Players',
      statistics: 'Statistics',
      settings: 'Settings',
      announcements: 'Announcements',
      admin: 'Admin',
    },
    common: {
      viewAll: 'View All',
      home: 'Home',
      away: 'Away',
      locationNotSet: 'Location not set',
      minutes: 'min',
      loading: 'Loading...',
      more: 'More',
    },
    dashboard: {
      players: 'Players',
      matches: 'Matches',
      wins: 'Wins',
      goals: 'Goals',
      nextMatch: 'Next Match',
      upcomingEvents: 'Upcoming Events',
      recentAnnouncements: 'Recent Announcements',
      season: 'Season',
      noNextMatch: 'No upcoming matches scheduled',
      scheduleMatch: 'Schedule Match',
      noUpcomingEvents: 'No upcoming events',
      addNewEvent: 'Add New Event',
      noRecentAnnouncements: 'No recent announcements',
      addAnnouncement: 'Add Announcement',
    },
    auth: {
      login: 'Login',
      register: 'Register',
      username: 'Username',
      password: 'Password',
      forgotPassword: 'Forgot Password?',
      confirmPassword: 'Confirm Password',
      fullName: 'Full Name',
      email: 'Email',
      phoneNumber: 'Phone Number',
      position: 'Position',
      jerseyNumber: 'Jersey Number',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      rememberMe: 'Remember Me',
      alreadyHaveAccount: 'Already have an account?',
      dontHaveAccount: "Don't have an account?",
      resetPassword: 'Reset Password',
      verifyEmail: 'Verify Email',
      resendVerification: 'Resend Verification',
    },
    errors: {
      invalidCredentials: 'Invalid username or password',
      usernameTaken: 'Username is already taken',
      emailTaken: 'Email is already in use',
      passwordMismatch: 'Passwords do not match',
      serverError: 'Server error. Please try again later.',
      unauthorizedAccess: 'You do not have permission to access this resource',
      invalidToken: 'Invalid or expired token',
      requiredField: 'This field is required',
    },
    matches: {
      createMatch: 'Create Match',
      editMatch: 'Edit Match',
      opponentName: 'Opponent Name',
      matchDate: 'Match Date',
      matchTime: 'Match Time',
      location: 'Location',
      isHome: 'Home Match',
      awayMatch: 'Away Match',
      matchType: 'Match Type',
      league: 'League',
      copa: 'Cup',
      friendly: 'Friendly',
      matchStatus: 'Match Status',
      scheduled: 'Scheduled',
      completed: 'Completed',
      cancelled: 'Cancelled',
      result: 'Result',
      lineup: 'Lineup',
      stats: 'Stats',
      goalsScored: 'Goals Scored',
      goalsConceded: 'Goals Conceded',
      scorers: 'Scorers',
      assisters: 'Assists',
      cards: 'Cards',
      yellowCards: 'Yellow Cards',
      redCards: 'Red Cards',
    },
    events: {
      createEvent: 'Create Event',
      editEvent: 'Edit Event',
      title: 'Title',
      description: 'Description',
      eventDate: 'Event Date',
      startTime: 'Start Time',
      endTime: 'End Time',
      eventType: 'Event Type',
      location: 'Location',
      training: 'Training',
      meeting: 'Meeting',
      match: 'Match',
      other: 'Other',
      attendance: 'Attendance',
      confirm: 'Confirm',
      decline: 'Decline',
      pending: 'Pending',
      attendees: 'Attendees',
      attendanceStatus: 'Attendance Status',
      noEventsScheduled: 'No events scheduled',
      createFirst: 'Create your first event',
    },
    players: {
      addPlayer: 'Add Player',
      editPlayer: 'Edit Player',
      profile: 'Player Profile',
      stats: 'Player Stats',
      position: 'Position',
      jerseyNumber: 'Jersey Number',
      contactInfo: 'Contact Information',
      emergencyContact: 'Emergency Contact',
      role: 'Role',
      invitePlayer: 'Invite Player',
      noPlayers: 'No players in the team',
      addFirst: 'Add your first player',
    },
    team: {
      settings: 'Team Settings',
      name: 'Team Name',
      logo: 'Team Logo',
      colors: 'Team Colors',
      primaryColor: 'Primary Color',
      secondaryColor: 'Secondary Color',
      joinCode: 'Join Code',
      visibility: 'Team Visibility',
      public: 'Public',
      private: 'Private',
      members: 'Team Members',
      invitations: 'Pending Invitations',
      inviteMembers: 'Invite Members',
      deleteTeam: 'Delete Team',
      leaveTeam: 'Leave Team',
      createTeam: 'Create Team',
      joinTeam: 'Join Team',
    },
    settings: {
      account: 'Account Settings',
      profile: 'Profile Settings',
      notifications: 'Notifications',
      language: 'Language',
      theme: 'Theme',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      systemMode: 'System Mode',
      security: 'Security',
      changePassword: 'Change Password',
      twoFactorAuth: 'Two-Factor Authentication',
      enableTwoFactor: 'Enable Two-Factor Authentication',
      disableTwoFactor: 'Disable Two-Factor Authentication',
    },
  },
  es: {
    navigation: {
      dashboard: 'Panel de Control',
      matches: 'Partidos',
      events: 'Eventos',
      players: 'Jugadores',
      statistics: 'Estadísticas',
      settings: 'Ajustes',
      announcements: 'Anuncios',
      admin: 'Administrador',
    },
    common: {
      viewAll: 'Ver Todo',
      home: 'Local',
      away: 'Visitante',
      locationNotSet: 'Ubicación no establecida',
      minutes: 'min',
      loading: 'Cargando...',
      more: 'Más',
    },
    dashboard: {
      players: 'Jugadores',
      matches: 'Partidos',
      wins: 'Victorias',
      goals: 'Goles',
      nextMatch: 'Próximo Partido',
      upcomingEvents: 'Próximos Eventos',
      recentAnnouncements: 'Anuncios Recientes',
      season: 'Temporada',
      noNextMatch: 'No hay partidos programados',
      scheduleMatch: 'Programar Partido',
      noUpcomingEvents: 'No hay eventos próximos',
      addNewEvent: 'Añadir Nuevo Evento',
      noRecentAnnouncements: 'No hay anuncios recientes',
      addAnnouncement: 'Añadir Anuncio',
    },
    auth: {
      login: 'Iniciar Sesión',
      register: 'Registro',
      username: 'Nombre de Usuario',
      password: 'Contraseña',
      forgotPassword: '¿Olvidó la Contraseña?',
      confirmPassword: 'Confirmar Contraseña',
      fullName: 'Nombre Completo',
      email: 'Correo Electrónico',
      phoneNumber: 'Número de Teléfono',
      position: 'Posición',
      jerseyNumber: 'Número de Camiseta',
      signIn: 'Iniciar Sesión',
      signUp: 'Registrarse',
      rememberMe: 'Recordarme',
      alreadyHaveAccount: '¿Ya tiene una cuenta?',
      dontHaveAccount: "¿No tiene una cuenta?",
      resetPassword: 'Restablecer Contraseña',
      verifyEmail: 'Verificar Correo',
      resendVerification: 'Reenviar Verificación',
    },
    // Other translations here...
  },
};

// Type definitions
type LanguageCode = keyof typeof languages;
type TranslationKeys = typeof translations.en;

interface LanguageContextType {
  currentLanguage: LanguageCode;
  changeLanguage: (language: LanguageCode) => void;
  t: (key: string) => string;
  availableLanguages: typeof languages;
}

// Create context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Provider component
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');

  // Function to change language
  const changeLanguage = (language: LanguageCode) => {
    if (languages[language]) {
      setCurrentLanguage(language);
      localStorage.setItem('language', language);
    }
  };

  // Translation function
  const t = (key: string): string => {
    const keys = key.split('.');
    try {
      let result: any = translations[currentLanguage];
      for (const k of keys) {
        if (result[k] === undefined) {
          console.warn(`Translation key not found: ${key}`);
          return key;
        }
        result = result[k];
      }
      return result || key;
    } catch (error) {
      console.warn(`Error getting translation for key: ${key}`, error);
      return key;
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        t,
        availableLanguages: languages,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

// Hook for using the language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}