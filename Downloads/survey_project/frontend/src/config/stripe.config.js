/**
 * Stripe Configuration
 * 
 * Configuración centralizada para la integración con Stripe
 */

// Claves públicas de Stripe (seguras para el frontend)
export const STRIPE_CONFIG = {
  // Modo desarrollo
  development: {
    publishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY_DEV || 'pk_test_...',
    apiVersion: '2023-10-16',
  },
  
  // Modo producción
  production: {
    publishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY_PROD || 'pk_live_...',
    apiVersion: '2023-10-16',
  },
};

// Obtener configuración según el entorno
export const getStripeConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return STRIPE_CONFIG[env];
};

// Opciones de Stripe Elements
export const STRIPE_ELEMENTS_OPTIONS = {
  fonts: [
    {
      cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    },
  ],
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#8C4EFF',
      colorBackground: '#ffffff',
      colorText: '#333333',
      colorDanger: '#f44336',
      fontFamily: 'Inter, Roboto, sans-serif',
      spacingUnit: '4px',
      borderRadius: '12px',
    },
    rules: {
      '.Input': {
        border: '1px solid #e0e0e0',
        boxShadow: 'none',
        padding: '12px',
      },
      '.Input:focus': {
        border: '2px solid #8C4EFF',
        boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
      },
      '.Label': {
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '8px',
      },
    },
  },
};

// Configuración de Payment Intent
export const PAYMENT_INTENT_CONFIG = {
  currency: 'usd',
  payment_method_types: ['card'],
  capture_method: 'automatic',
  setup_future_usage: 'off_session', // Para suscripciones recurrentes
};

// Mensajes de error personalizados
export const STRIPE_ERROR_MESSAGES = {
  card_declined: 'Tu tarjeta fue rechazada. Por favor, intenta con otra tarjeta.',
  expired_card: 'Tu tarjeta ha expirado. Por favor, verifica la fecha de expiración.',
  incorrect_cvc: 'El código CVV es incorrecto. Por favor, verifica el código de seguridad.',
  processing_error: 'Ocurrió un error al procesar tu pago. Por favor, intenta de nuevo.',
  insufficient_funds: 'Fondos insuficientes. Por favor, intenta con otra tarjeta.',
  invalid_number: 'El número de tarjeta es inválido. Por favor, verifica el número.',
  generic_decline: 'Tu tarjeta fue rechazada. Por favor, contacta a tu banco.',
};

// Función para obtener mensaje de error amigable
export const getStripeErrorMessage = (error) => {
  if (!error) return 'Error desconocido';
  
  const code = error.code || error.decline_code;
  return STRIPE_ERROR_MESSAGES[code] || error.message || 'Error procesando el pago';
};

// Validación de tarjeta
export const validateCardNumber = (number) => {
  // Algoritmo de Luhn
  const digits = number.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(digits)) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

// Detectar tipo de tarjeta
export const detectCardType = (number) => {
  const patterns = {
    visa: /^4/,
    mastercard: /^5[1-5]/,
    amex: /^3[47]/,
    discover: /^6(?:011|5)/,
    diners: /^3(?:0[0-5]|[68])/,
    jcb: /^35/,
  };
  
  const digits = number.replace(/\s/g, '');
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(digits)) return type;
  }
  
  return 'unknown';
};

// Formatear número de tarjeta
export const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, '');
  const groups = digits.match(/.{1,4}/g) || [];
  return groups.join(' ').substring(0, 19);
};

// Formatear fecha de expiración
export const formatExpiryDate = (value) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 2) {
    return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
  }
  return digits;
};

// Validar fecha de expiración
export const validateExpiryDate = (value) => {
  const [month, year] = value.split('/');
  if (!month || !year) return false;
  
  const monthNum = parseInt(month);
  const yearNum = parseInt(`20${year}`);
  
  if (monthNum < 1 || monthNum > 12) return false;
  
  const now = new Date();
  const expiry = new Date(yearNum, monthNum - 1);
  
  return expiry > now;
};

export default {
  getStripeConfig,
  STRIPE_ELEMENTS_OPTIONS,
  PAYMENT_INTENT_CONFIG,
  getStripeErrorMessage,
  validateCardNumber,
  detectCardType,
  formatCardNumber,
  formatExpiryDate,
  validateExpiryDate,
};
