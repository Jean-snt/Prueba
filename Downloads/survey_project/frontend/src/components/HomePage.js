import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  Grid,
  Paper,
} from '@mui/material';
import {
  Share,
  People,
  TrendingUp,
  Explore,
  ArrowForward,
  Security,
  Groups,
} from '@mui/icons-material';

const HomePage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Verificar usuario logueado
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
    }
  }, [navigate]);

  // ✅ NUEVO: 6 Tarjetas de misión (cuadrícula 2x3)
  const missionCards = [
    {
      icon: <Share sx={{ fontSize: 48, color: '#8C4EFF' }} />,
      title: 'Comparte',
      description: 'Expresa lo que sientes sin filtros. Tu voz importa.',
      gradient: 'linear-gradient(135deg, #8C4EFF 0%, #7113B8 100%)',
    },
    {
      icon: <People sx={{ fontSize: 48, color: '#f093fb' }} />,
      title: 'Conecta',
      description: 'Descubre historias reales de personas como tú.',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      icon: <TrendingUp sx={{ fontSize: 48, color: '#4facfe' }} />,
      title: 'Impacta',
      description: 'Sé parte de una comunidad que escucha y apoya.',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
    {
      icon: <Explore sx={{ fontSize: 48, color: '#43e97b' }} />,
      title: 'Descubre',
      description: 'Explora tendencias y opiniones que mueven al mundo.',
      gradient: 'linear-gradient(135deg, #38f9d7 0%, #43e97b 100%)',
    },
    {
      icon: <Security sx={{ fontSize: 48, color: '#5f7d95' }} />,
      title: 'Seguridad',
      description: 'Tus datos y opiniones están protegidos con tecnología de punta.',
      gradient: 'linear-gradient(135deg, #5f7d95 0%, #7c98b3 100%)',
    },
    {
      icon: <Groups sx={{ fontSize: 48, color: '#ff9a56' }} />,
      title: 'Comunidad',
      description: 'Únete a miles de personas y haz que tu voz resuene globalmente.',
      gradient: 'linear-gradient(135deg, #ff9a56 0%, #ffb088 100%)',
    },
  ];

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        backgroundColor: '#7113B8',
        backgroundAttachment: 'fixed',
        py: 8,
        position: 'relative',
        overflow: 'hidden',
        // Efecto de partículas de fondo
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
        }
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Logo y Título Principal */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            mb: 3
          }}>
            <img 
              src="/cuestom-logo-static.png" 
              alt="Cuestom Logo" 
              style={{ 
                width: '100px', 
                height: '100px',
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
                animation: 'float 3s ease-in-out infinite',
              }} 
            />
          </Box>
          
          {/* ✅ Título reducido 15% (de 3.5rem a ~3rem) */}
          <Typography 
            variant="h2" 
            sx={{ 
              fontSize: { xs: '2.1rem', md: '3rem' },
              fontWeight: 800,
              color: 'white',
              textShadow: '0 4px 12px rgba(0,0,0,0.3)',
              mb: 2,
              letterSpacing: '-0.02em',
            }}
          >
            Cuestom
          </Typography>
        </Box>

        {/* ✅ LIENZO ÚNICO BLANCO - Envuelve todo el contenido */}
        <Paper
          elevation={8}
          sx={{
            background: '#FFFFFF',
            borderRadius: '20px',
            p: { xs: 4, md: 6 },
            mb: 6,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Hero - Saludo y Botón */}
          <Box sx={{ maxWidth: '900px', margin: '0 auto', mb: 6 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                color: '#2D3748',  // ✅ Gris oscuro profesional
                fontWeight: 600,
                textAlign: 'center',
                mb: 2,
                fontSize: { xs: '1.3rem', md: '1.7rem' },
              }}
            >
              {currentUser 
                ? `¡Hola, ${currentUser.username}! 👋` 
                : '¡Hola! 👋'
              }
            </Typography>
            
            <Typography 
              variant="h5" 
              sx={{ 
                color: '#4A5568',  // ✅ Gris medio para subtexto
                textAlign: 'center',
                mb: 4,
                fontSize: { xs: '0.95rem', md: '1.1rem' },
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              Únete a la conversación. Un espacio libre para compartir lo que sientes y conectar con historias reales.
            </Typography>

            {/* Botón de Acción Principal */}
            <Box sx={{ textAlign: 'center' }}>
              <Button
                component={Link}
                to={currentUser ? "/encuestas" : "/login"}
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                sx={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  py: 2,
                  px: 6,
                  borderRadius: 3,
                  background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                  color: '#333',
                  boxShadow: '0 8px 30px rgba(255, 215, 0, 0.4)',
                  textTransform: 'none',
                  transition: 'all 0.3s ease',
                  border: '2px solid rgba(255, 215, 0, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #ffed4e, #ffd700)',
                    boxShadow: '0 12px 40px rgba(255, 215, 0, 0.6)',
                    transform: 'translateY(-3px) scale(1.05)',
                  },
                }}
              >
                {currentUser ? 'Comenzar ahora' : 'Iniciar Sesión'}
              </Button>
            </Box>
          </Box>

          {/* Tarjetas de Misión (6 tarjetas - cuadrícula 2x3) */}
          <Box sx={{ mb: 6, width: '100%' }}>
            <Grid container spacing={4} justifyContent="center">
              {missionCards.map((card, index) => (
                <Grid item xs={12} sm={6} md={4} key={index} sx={{ display: 'flex' }}>
                  <Card
                    sx={{
                      height: '100%',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'rgba(102, 126, 234, 0.08)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      borderRadius: 3,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
                        background: 'rgba(102, 126, 234, 0.12)',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                      },
                    }}
                  >
                    <CardContent 
                      sx={{ 
                        textAlign: 'center', 
                        p: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexGrow: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 70,
                          height: 70,
                          borderRadius: '50%',
                          background: card.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 2,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                        }}
                      >
                        {card.icon}
                      </Box>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          color: '#2D3748',
                          fontWeight: 700,
                          mb: 1,
                          fontSize: '1.3rem',
                        }}
                      >
                        {card.title}
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: '#4A5568',
                          lineHeight: 1.6,
                          fontSize: '0.85rem',
                        }}
                      >
                        {card.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Sección "Nosotros" */}
          <Box sx={{ mb: 4, maxWidth: '900px', margin: '0 auto' }}>
            <Typography 
              variant="h4" 
              sx={{ 
                color: '#2D3748',
                fontWeight: 700,
                mb: 4,
                textAlign: 'center',
                fontSize: '1.7rem',
              }}
            >
              Nosotros
            </Typography>
            
            <Grid container spacing={4} justifyContent="center">
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    background: 'rgba(102, 126, 234, 0.05)',
                    borderRadius: 2,
                    p: 3,
                    border: '1px solid rgba(102, 126, 234, 0.15)',
                    height: '100%',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    textAlign: 'center',
                  }}
                >
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: '#2D3748',
                      fontWeight: 600,
                      mb: 2,
                      fontSize: '1.1rem',
                    }}
                  >
                    ¿Quiénes somos?
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#4A5568',
                      lineHeight: 1.7,
                      fontSize: '0.95rem',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    Somos una comunidad enorme que busca la interactividad entre las personas de todo el mundo y que busca disfrutar una comunicación y conocer de otras personas, ya sea secretos, confesiones, preguntas, etc.
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    background: 'rgba(102, 126, 234, 0.05)',
                    borderRadius: 2,
                    p: 3,
                    border: '1px solid rgba(102, 126, 234, 0.15)',
                    height: '100%',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    textAlign: 'center',
                  }}
                >
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: '#2D3748',
                      fontWeight: 600,
                      mb: 2,
                      fontSize: '1.1rem',
                    }}
                  >
                    ¿Desde cuándo?
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#4A5568',
                      lineHeight: 1.7,
                      fontSize: '0.95rem',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    Hemos empezado a partir del 2025 con la idea final de conectar personas a través de preguntas reales y conversaciones auténticas.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* ✅ NUEVO: Footer Simplificado y Centrado */}
        <Box
          sx={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(20px)',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
            p: { xs: 3, md: 4 },
            textAlign: 'center',
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.9rem',
              mb: 0.5,
            }}
          >
            © Cuestom 2026. Compañía ASTRIX S.A.C.
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.75rem',
            }}
          >
            Todos los derechos reservados
          </Typography>
        </Box>
      </Container>

      {/* Animación de flotación para el logo */}
      <style>
        {`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default HomePage;