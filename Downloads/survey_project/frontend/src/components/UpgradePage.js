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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Star,
  Diamond,
  EmojiEvents,
  CheckCircle,
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';

const UpgradePage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {
        navigate('/login');
        return;
      }
    } else {
      navigate('/login');
      return;
    }

    loadPlans();
  }, [navigate]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const plansResponse = await surveyAPI.getSubscriptionPlans();
      setPlans(plansResponse.data.plans || []);
    } catch (err) {
      setError('Error cargando planes VIP');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    navigate('/vip', { state: { selectedPlan: plan } });
  };

  const getPlanIcon = (planType) => {
    switch (planType) {
      case 'monthly': return <Star sx={{ fontSize: 40, color: '#ffd700' }} />;
      case 'quarterly': return <Diamond sx={{ fontSize: 40, color: '#00bcd4' }} />;
      case 'annual': return <EmojiEvents sx={{ fontSize: 40, color: '#ff9800' }} />;
      default: return <Star sx={{ fontSize: 40, color: '#ffd700' }} />;
    }
  };

  const getPlanColor = (planType) => {
    switch (planType) {
      case 'monthly': return 'linear-gradient(135deg, #ffd700, #ffed4e)';
      case 'quarterly': return 'linear-gradient(135deg, #00bcd4, #26c6da)';
      case 'annual': return 'linear-gradient(135deg, #ff9800, #ffb74d)';
      default: return 'linear-gradient(135deg, #ffd700, #ffed4e)';
    }
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
        backgroundColor: '#7113B8',
        py: 8,
      }}
    >
      <Container maxWidth="lg">
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
            Mejora tu Experiencia
          </Typography>
          <Typography variant="h5" color="white" sx={{ opacity: 0.9 }}>
            Elige el plan perfecto para ti
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={4} justifyContent="center">
          {plans.map((plan) => (
            <Grid item xs={12} md={4} key={plan.type}>
              <Card
                sx={{
                  borderRadius: 4,
                  background: '#ffffff',
                  position: 'relative',
                  overflow: 'visible',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                    backgroundColor: '#ffffff !important',
                    opacity: 1,
                    filter: 'none',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Box mb={2}>
                    {getPlanIcon(plan.type)}
                  </Box>
                  
                  <Typography variant="h5" fontWeight="bold" mb={1}>
                    {plan.name}
                  </Typography>
                  
                  <Typography variant="h3" fontWeight="800" sx={{ color: '#8C4EFF' }} mb={1}>
                    {plan.type === 'monthly' ? '$2.70' : `$${plan.price}`} USD
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    {plan.type === 'monthly' && 'Perfecto para empezar'}
                    {plan.type === 'quarterly' && '🎉 Ahorra 5%'}
                    {plan.type === 'annual' && '🎉 Ahorra 10%'}
                  </Typography>

                  <List dense>
                    <ListItem>
                      <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                      <ListItemText primary="Encuestas ilimitadas" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                      <ListItemText primary="Análisis avanzados" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                      <ListItemText primary="Cambio de apodo cada 7 días" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                      <ListItemText primary="Encuestas auto-destructivas" />
                    </ListItem>
                  </List>

                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={() => navigate('/checkout', { state: { plan } })}
                    sx={{
                      mt: 3,
                      py: 2,
                      background: getPlanColor(plan.type),
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      color: 'white',  /* ✅ FIX: Texto blanco sólido */
                      '&:hover': {
                        background: getPlanColor(plan.type),
                        color: 'white',  /* ✅ FIX: Mantener texto blanco en hover */
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
      </Container>
    </Box>
  );
};

export default UpgradePage;
