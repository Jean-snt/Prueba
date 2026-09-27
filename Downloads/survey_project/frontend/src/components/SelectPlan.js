import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Star,
  Diamond,
  EmojiEvents,
  CheckCircle,
  ArrowBack,
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';

const SelectPlan = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ✅ Planes con precios en USD
  const plans = [
    {
      type: 'monthly',
      name: 'Plan Mensual',
      price: 9.99,
      currency: 'USD',
      icon: <Star sx={{ fontSize: 40, color: '#ffd700' }} />,
      color: 'linear-gradient(135deg, #ffd700, #ffed4e)',
      description: 'Perfecto para empezar',
      features: [
        'Encuestas ilimitadas',
        'Análisis avanzados',
        'Soporte prioritario',
        'Sin publicidad',
        'Badge VIP',
      ],
    },
    {
      type: 'annual',
      name: 'Plan Anual',
      price: 89.99,
      currency: 'USD',
      icon: <EmojiEvents sx={{ fontSize: 40, color: '#ff9800' }} />,
      color: 'linear-gradient(135deg, #ff9800, #ffb74d)',
      description: 'Máximo ahorro anual',
      discount: '25%',
      monthlyEquivalent: 7.50,
      features: [
        'Todas las características del plan mensual',
        'Ahorra 25% ($29.89 al año)',
        'Prioridad en nuevas funciones',
        'Soporte VIP exclusivo',
        'Badge VIP Premium',
      ],
      popular: true,
    },
  ];

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
    } else {
      navigate('/login');
      return;
    }

    setLoading(false);
  }, [navigate]);

  const handleSelectPlan = (plan) => {
    // ✅ FIX: Pasar solo datos serializables (no JSX ni componentes)
    navigate('/vip', { 
      state: { 
        planId: plan.type,
        planName: plan.name,
        planPrice: plan.price
      } 
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} sx={{ color: '#ffd700' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #8C4EFF 0%, #7113B8 50%, #ffd700 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Botón de regreso */}
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{
            mb: 3,
            color: 'white',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.1)',
            },
          }}
        >
          Volver
        </Button>

        {/* Header */}
        <Box textAlign="center" mb={6}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(45deg, #ffd700, #fff)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            Selecciona tu Plan VIP
          </Typography>
          
          <Typography variant="h5" color="white" mb={2} sx={{ opacity: 0.9 }}>
            Elige el plan que mejor se adapte a tus necesidades
          </Typography>
        </Box>

        {/* Mensajes */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Planes */}
        <Grid container spacing={4} justifyContent="center">
          {plans.map((plan) => (
            <Grid item xs={12} md={6} key={plan.type}>
              <Card
                sx={{
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: plan.popular ? '3px solid #ffd700' : '2px solid transparent',
                  position: 'relative',
                  overflow: 'visible',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {plan.popular && (
                  <Chip
                    label="MÁS POPULAR"
                    sx={{
                      position: 'absolute',
                      top: -10,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: '#ff4444',
                      color: 'white',
                      fontWeight: 'bold',
                      zIndex: 1,
                    }}
                  />
                )}
                
                {plan.discount && (
                  <Chip
                    label={`AHORRA ${plan.discount}`}
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: 20,
                      bgcolor: '#4caf50',
                      color: 'white',
                      fontWeight: 'bold',
                      zIndex: 1,
                    }}
                  />
                )}
                
                <CardContent sx={{ textAlign: 'center', p: 4, background: 'white', borderRadius: 4 }}>
                  <Box mb={2}>
                    {plan.icon}
                  </Box>
                  
                  <Typography variant="h5" fontWeight="bold" mb={1}>
                    {plan.name}
                  </Typography>
                  
                  <Typography variant="h3" fontWeight="800" color="primary" mb={1}>
                    ${plan.price.toFixed(2)}
                  </Typography>
                  
                  {plan.monthlyEquivalent && (
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      (${plan.monthlyEquivalent.toFixed(2)}/mes)
                    </Typography>
                  )}
                  
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    {plan.description}
                  </Typography>

                  <List dense>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index}>
                        <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>

                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={() => handleSelectPlan(plan)}
                    sx={{
                      mt: 3,
                      py: 2,
                      background: plan.color,
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      '&:hover': {
                        background: plan.color,
                        filter: 'brightness(1.1)',
                      },
                    }}
                  >
                    Seleccionar Plan
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Información adicional */}
        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="body1" color="white" sx={{ opacity: 0.9, mb: 2 }}>
            💳 Métodos de pago: Yape, BCP, PayPal
          </Typography>
          <Typography variant="body2" color="white" sx={{ opacity: 0.8 }}>
            🔒 Pago 100% seguro • ✅ Activación inmediata • 📧 Soporte 24/7
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default SelectPlan;

