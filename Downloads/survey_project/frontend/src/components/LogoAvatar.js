import React from 'react';

/**
 * Componente de Avatar con Logo de Cuestom
 * Soporta modo circular con efecto shimmer dorado para usuarios VIP
 * 
 * @param {number} size - Tamaño del avatar en píxeles (default: 40)
 * @param {boolean} isVip - Si el usuario es VIP (activa efecto shimmer)
 * @param {boolean} circular - Si debe ser circular (default: true)
 */
const LogoAvatar = ({ size = 40, isVip = false, circular = true }) => {
  const baseStyle = {
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: 'transparent',
    imageRendering: '-webkit-optimize-contrast',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  };

  const circularStyle = circular ? {
    borderRadius: '50%',
    objectFit: 'cover',
  } : {};

  const vipStyle = isVip && circular ? {
    animation: 'goldShimmer 2s ease-in-out infinite',
    border: '2px solid rgba(255, 215, 0, 0.6)',
    boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)',
  } : {};

  return (
    <img
      src="/cuestom-logo-static.png"
      alt="Cuestom"
      className={isVip && circular ? 'logo-avatar-vip' : circular ? 'logo-avatar' : ''}
      style={{
        ...baseStyle,
        ...circularStyle,
        ...vipStyle,
      }}
    />
  );
};

export default LogoAvatar;

