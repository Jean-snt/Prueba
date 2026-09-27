// Configuración del frontend
export const config = {
  // URL base de la API de Django
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/encuestas/api',
  
  // URL base de Django
  DJANGO_URL: process.env.REACT_APP_DJANGO_URL || 'http://127.0.0.1:8000',
  
  // Configuración de la aplicación
  APP_NAME: 'Sistema de Encuestas',
  APP_VERSION: '1.0.0',
  
  // Configuración de temas
  THEME: {
    primary: '#9c27b0',
    secondary: '#ba68c8',
    background: '#f5f5f5',
  }
};
