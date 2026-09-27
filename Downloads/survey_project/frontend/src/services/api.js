import axios from 'axios';

import { config } from '../config';

// Configurar la base URL para la API de Django
const API_BASE_URL = config.API_BASE_URL;

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // ← Enviar cookies de sesión automáticamente
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    // Obtener token de localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Token ${token}`;
    }
    
    // Obtener CSRF token de las cookies si está disponible
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
    
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // ✅ CRÍTICO: NO cerrar sesión si es un intento de eliminación de cuenta
    const isDeleteAccountRequest = error.config?.url?.includes('/delete-account/');
    
    // Manejar diferentes tipos de errores
    if (error.response?.status === 302) {
      // Redirect - probablemente sesión expirada
      console.error('Error 302: Redirect - Sesión expirada');
      if (!isDeleteAccountRequest) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } else if (error.response?.status === 401) {
      // No autorizado
      console.error('Error 401: No autorizado');
      // ✅ CRÍTICO: NO cerrar sesión si es eliminación de cuenta con contraseña incorrecta
      if (!isDeleteAccountRequest) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      // Prohibido - usuario no tiene permisos
      console.error('Error 403: Acceso prohibido');
    }
    
    return Promise.reject(error);
  }
);

// Servicios API
export const surveyAPI = {
  // Obtener todas las encuestas con filtros opcionales y paginación
  getAllSurveys: (filters = {}) => {
    const params = new URLSearchParams();
    
    // Agregar filtros VIP si están presentes
    if (filters.country) params.append('country', filters.country);
    if (filters.ageMin) params.append('ageMin', filters.ageMin);
    if (filters.ageMax) params.append('ageMax', filters.ageMax);
    if (filters.gender) params.append('gender', filters.gender);
    if (filters.showNSFW !== undefined) params.append('show_nsfw', filters.showNSFW);
    if (filters.time_range) params.append('time_range', filters.time_range);
    
    // ✅ NUEVO: Parámetros de paginación
    if (filters.page) params.append('page', filters.page);
    if (filters.page_size) params.append('page_size', filters.page_size);
    
    // Mantener limit para compatibilidad (deprecated)
    if (filters.limit && !filters.page_size) params.append('limit', filters.limit);
    
    const queryString = params.toString();
    return api.get(`/surveys/${queryString ? `?${queryString}` : ''}`);
  },
  
  // Obtener una encuesta específica con sus preguntas
  getSurvey: (id) => api.get(`/surveys/${id}/`),
  
  // ✅ NUEVO: Eliminar encuesta (solo el creador)
  deleteSurvey: (id) => api.delete(`/surveys/${id}/delete/`),
  
  // Crear nueva encuesta
  createSurvey: (surveyData) => api.post('/surveys/create/', surveyData),
  
  // Crear nueva encuesta con imagen (FormData)
  createSurveyWithImage: (formData) => {
    return api.post('/surveys/create/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // Obtener encuestas del usuario
  getUserSurveys: (limit = 10) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    return api.get(`/surveys/user/?${params}`);
  },
  
  // Obtener perfil del usuario
  getUserProfile: () => api.get('/auth/profile/'),
  
  // ✅ NUEVO: Actualizar perfil del usuario
  updateProfile: (profileData) => api.put('/auth/profile/update/', profileData),
  
  // ✅ NUEVO: Actualizar apodo del usuario
  updateNickname: (newNickname) => api.put('/auth/update-nickname/', { new_nickname: newNickname }),
  
  // ✅ NUEVO: Karma VIP - Recompensar al creador cuando un VIP responde
  rewardVipKarma: (surveyId, feedbackData) => api.post('/auth/vip-karma/', { 
    survey_id: surveyId,
    question1: feedbackData.question1,
    question2: feedbackData.question2
  }),
  
  // ✅ NUEVO: Obtener estadísticas VIP (usuarios únicos ayudados)
  getVipKarmaStats: () => api.get('/auth/vip-karma-stats/'),
  
  // Enviar respuesta a una encuesta
  submitResponse: (surveyId, responseData) => 
    api.post(`/surveys/${surveyId}/submit/`, responseData),
  
  // Enviar respuesta usando arquitectura hexagonal (con autenticación)
  submitResponseV2: (surveyId, responseData) => 
    api.post(`/v2/surveys/${surveyId}/submit/`, responseData),
  
  // Enviar respuesta anónima usando arquitectura hexagonal
  submitResponseAnonymous: (surveyId, responseData) => 
    api.post(`/v2/surveys/${surveyId}/submit-anonymous/`, responseData),

  // Notificaciones
  getNotifications: (unreadOnly = false, limit = 20) => {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unread_only', 'true');
    if (limit) params.append('limit', limit.toString());
    
    return api.get(`/notifications/?${params}`);
  },

  markNotificationRead: (notificationId) =>
    api.post(`/notifications/${notificationId}/read/`),

  markAllNotificationsRead: () =>
    api.post('/notifications/mark-all-read/'),

  // ✅ NUEVO: Borrar notificaciones
  deleteNotification: (notificationId) =>
    api.delete(`/notifications/${notificationId}/delete/`),

  deleteAllNotifications: () =>
    api.delete('/notifications/delete-all/'),

  // Autenticación
  register: (userData) =>
    api.post('/auth/register/', userData),

  // ✅ NUEVO: Verificar disponibilidad de nickname
  checkNickname: (nickname) =>
    api.post('/auth/check-nickname/', { nickname }),

  login: (credentials) =>
    api.post('/auth/login/', credentials),

  verifyAccount: (data) =>
    api.post('/auth/verify/', data),

  resendVerificationCode: (data) =>
    api.post('/auth/resend-code/', data),

  // Comentarios
  getSurveyComments: (surveyId) =>
    api.get(`/surveys/${surveyId}/comments/`),

  createComment: (surveyId, commentData) =>
    api.post(`/surveys/${surveyId}/comments/create/`, commentData),

  updateComment: (surveyId, commentId, commentData) =>
    api.put(`/surveys/${surveyId}/comments/${commentId}/update/`, commentData),

  deleteComment: (surveyId, commentId) =>
    api.delete(`/surveys/${surveyId}/comments/${commentId}/delete/`),

  // ✅ NUEVO: Like/Dislike en comentarios
  likeComment: (surveyId, commentId, action) =>
    api.post(`/surveys/${surveyId}/comments/${commentId}/like/`, { action }),

  // ✅ NUEVO: Likes/Dislikes
  likeSurvey: (surveyId, action) =>
    api.post(`/surveys/${surveyId}/like/`, { action }),

  // ✅ NUEVO: Ranking Histórico (Top 5 de toda la historia)
  getHistoricRanking: () =>
    api.get('/surveys/historic-ranking/'),
  
  // ✅ TEMPORADAS 2026: Ranking Trimestral (Top 10 del trimestre actual)
  getQuarterlyRanking: () =>
    api.get('/surveys/quarterly-ranking/'),

  // Reportes
  reportContent: (reportData) => {
    return api.post('/reports/create/', reportData);
  },

  getUserReports: () =>
    api.get('/reports/user/'),

  // Suscripciones VIP
  getSubscriptionPlans: () =>
    api.get('/subscriptions/plans/'),

  getUserSubscription: () =>
    api.get('/subscriptions/user/'),

  createSubscription: (subscriptionData) =>
    api.post('/subscriptions/create/', subscriptionData),

  uploadPaymentProof: (formData) => {
    // Para FormData, necesitamos eliminar el Content-Type por defecto
    // para que el navegador establezca automáticamente el boundary
    return api.post('/subscriptions/upload-proof/', formData, {
      headers: {
        'Content-Type': undefined, // Esto permite que axios use multipart/form-data automáticamente
      },
    });
  },

  verifyPayPalPayment: (paymentData) =>
    api.post('/payments/paypal-verify/', paymentData),

  // ✅ NUEVO: Procesar pago con Yape (solo para usuarios peruanos)
  processYapePayment: (yapeData) =>
    api.post('/payments/yape/', yapeData),

  // Recuperación de contraseña
  passwordResetRequest: (email) =>
    api.post('/auth/password-reset-request/', { email }),

  passwordResetConfirm: (resetData) =>
    api.post('/auth/password-reset-confirm/', resetData),

  passwordResetStatus: (email) =>
    api.post('/auth/password-reset-status/', { email }),

  cancelSubscription: () =>
    api.post('/subscriptions/cancel/'),

  // Administración
  getAdminStats: () =>
    api.get('/admin/stats/'),

  getAdminPendingSubscriptions: () =>
    api.get('/admin/pending-subscriptions/'),

  adminApproveSubscription: (subscriptionId, adminNotes = '') =>
    api.post('/admin/approve-subscription/', {
      subscription_id: subscriptionId,
      admin_notes: adminNotes
    }),

  adminRejectSubscription: (subscriptionId, reason = '') =>
    api.post('/admin/reject-subscription/', {
      subscription_id: subscriptionId,
      reason: reason
    }),

  // ✅ NUEVO: Eliminar cuenta de usuario
  deleteAccount: (password) =>
    api.post('/auth/delete-account/', { password }),

  // ✅ NUEVO: Obtener estadísticas de visualizaciones del usuario
  getUserViewStats: () =>
    api.get('/auth/view-stats/'),

  // ✅ NUEVO: Obtener estadísticas de encuestas del usuario (total, activas, eliminadas)
  getUserSurveyStats: () =>
    api.get('/auth/survey-stats/'),

  // ✅ NUEVO: Procesamiento de pagos con Stripe
  createPaymentIntent: (paymentData) =>
    api.post('/payments/create-intent/', paymentData),

  confirmPayment: (paymentIntentId, paymentData) =>
    api.post('/payments/confirm/', {
      payment_intent_id: paymentIntentId,
      ...paymentData
    }),

  getPaymentHistory: (limit = 10) =>
    api.get(`/payments/history/?limit=${limit}`),

  // ✅ NUEVO: Procesamiento de pagos con tarjeta (genérico)
  processCardPayment: (paymentData) =>
    api.post('/payments/process-card/', paymentData),

  // ✅ NUEVO: Verificar estado de pago
  getPaymentStatus: (transactionId) =>
    api.get(`/payments/status/${transactionId}/`),
};

export default api;

