// Store index - Exportaciones centralizadas de todos los stores
export { default as useSurveyStore } from './survey-store';
export { default as useNotificationStore } from './notification-store';

// Configuración global de stores
export const storeConfig = {
  // Configuración de persistencia
  persist: {
    name: 'cuestom-store',
    version: 1,
  },
  
  // Configuración de desarrollo
  devtools: process.env.NODE_ENV === 'development',
  
  // Configuración de auto-refresh
  autoRefresh: {
    enabled: true,
    interval: 30000, // 30 segundos
  },
};

// Hook para inicializar todos los stores
export const useInitializeStores = () => {
  const initializeSurveyStore = useSurveyStore(state => state.fetchSurveys);
  const initializeNotificationStore = useNotificationStore(state => state.fetchNotifications);
  
  const initialize = async () => {
    try {
      await Promise.all([
        initializeSurveyStore(),
        initializeNotificationStore({ unreadOnly: false, limit: 20 }),
      ]);
    } catch (error) {
      console.error('Error inicializando stores:', error);
    }
  };
  
  return { initialize };
};

// Hook para limpiar todos los stores
export const useClearStores = () => {
  const clearSurveyStore = useSurveyStore(state => state.reset);
  const clearNotificationStore = useNotificationStore(state => state.reset);
  
  const clearAll = () => {
    clearSurveyStore();
    clearNotificationStore();
  };
  
  return { clearAll };
};