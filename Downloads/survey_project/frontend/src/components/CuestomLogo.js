import React, { useState, useEffect } from 'react';

const CuestomLogo = ({ height = 40, animated = false }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setLoaded(true), 100);
      return () => clearTimeout(timer);
    } else {
      setLoaded(true);
    }
  }, [animated]);

  return (
    <img
      src="/cuestom-logo-static.png"
      alt="Cuestom"
      style={{
        width: `${height}px`,
        height: `${height}px`,
        imageRendering: '-webkit-optimize-contrast',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
        backgroundColor: 'transparent',
        opacity: loaded ? 1 : 0,
        transform: loaded ? 'scale(1)' : 'scale(0.9)',
        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  );
};

export default CuestomLogo;
