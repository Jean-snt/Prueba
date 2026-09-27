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
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
} from '@mui/material';
import {
  Star,
  Diamond,
  EmojiEvents,
  Security,
  Upload,
  AccountBalance,
  Phone,
  QrCode,
  CreditCard,
  Lock,
  CheckCircle,
  PhotoCamera,
  PictureAsPdf,
  Close,
  Verified,
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';
import PayPalButton from './PayPalButton';
import Swal from 'sweetalert2';
import './VipPage.css';

const VipPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [userSubscription, setUserSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('online');
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentProof, setPaymentProof] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [paypalLoading, setPaypalLoading] = useState(false);

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

    loadVipData();
  }, [navigate]);

  const loadVipData = async () => {
    try {
      setLoading(true);
      
      // Cargar planes disponibles
      const plansResponse = await surveyAPI.getSubscriptionPlans();
      setPlans(plansResponse.data.plans || []);
      
      // Cargar suscripción del usuario
      try {
        const subscriptionResponse = await surveyAPI.getUserSubscription();
        setUserSubscription(subscriptionResponse.data);
      } catch (err) {
        // Usuario sin suscripción
        setUserSubscription(null);
      }
      
    } catch (err) {
      setError('Error cargando información VIP');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setConfirmDialog(true);
  };

  const handleConfirmPlan = () => {
    setConfirmDialog(false);
    if (selectedPaymentMethod === 'online') {
      // PayPal se maneja en el componente PayPalButton
      setPaypalLoading(true);
    } else {
      // Pago manual (Yape/BCP)
      setPaymentDialog(true);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    
    if (file) {
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setError('Solo se permiten archivos JPG, PNG o PDF');
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo no debe superar los 5MB');
        return;
      }
      
      setPaymentProof(file);
      setError('');
    }
  };

  const handleUploadProof = async () => {
    if (!paymentProof) {
      setError('Debes seleccionar un comprobante de pago');
      return;
    }

    try {
      setSubscribing(true);
      setError('');
      
      if (!currentUser) {
        setError('Debes iniciar sesión para continuar');
        navigate('/login');
        return;
      }
      
      const subscriptionData = {
        plan_type: selectedPlan.type,
        payment_method: selectedPaymentMethod,
        transaction_id: transactionId || null,
      };

      const subscriptionResponse = await surveyAPI.createSubscription(subscriptionData);
      
      if (subscriptionResponse.data.success) {
        const formData = new FormData();
        formData.append('payment_proof', paymentProof);
        if (transactionId) {
          formData.append('transaction_id', transactionId);
        }

        const response = await surveyAPI.uploadPaymentProof(formData);

        if (response.data.success) {
          // Mostrar alerta elegante con SweetAlert2
          await Swal.fire({
            icon: 'success',
            title: '¡Comprobante Enviado!',
            html: `
              <div style="text-align: center;">
                <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
                <p style="font-size: 18px; color: #666; margin-bottom: 15px;">
                  Estamos validando tu pago
                </p>
                <p style="font-size: 16px; color: #4caf50; font-weight: bold;">
                  ¡Serás VIP muy pronto!
                </p>
              </div>
            `,
            confirmButtonText: 'Ir al Dashboard',
            confirmButtonColor: '#667eea',
            background: '#fff',
            customClass: {
              popup: 'swal-popup-custom',
              title: 'swal-title-custom',
              confirmButton: 'swal-button-custom'
            }
          });
          
          // Limpiar formulario
          setPaymentDialog(false);
          setPaymentProof(null);
          setTransactionId('');
          
          // Redirigir al dashboard
          navigate('/dashboard');
          
        } else {
          setError(response.data.error || 'Error subiendo el comprobante');
        }
      } else {
        setError(subscriptionResponse.data.error || 'Error creando la suscripción');
      }
    } catch (err) {
      console.error('Error completo:', err);
      
      // Obtener mensaje de error específico del servidor
      let errorMessage = 'Error procesando el pago. Inténtalo de nuevo.';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      // Manejar errores específicos
      if (err.response?.status === 302) {
        errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (err.response?.status === 401) {
        errorMessage = 'No tienes permisos para realizar esta acción. Inicia sesión.';
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (err.response?.status === 403) {
        errorMessage = 'Acceso denegado. Verifica que tu cuenta esté verificada.';
      } else if (err.response?.status === 400) {
        setError(err.response.data.error || 'Error al subir el comprobante. Verifica los datos.');
      }
      
      // Mostrar error con SweetAlert2 para mejor UX
      await Swal.fire({
        icon: 'error',
        title: 'Error en el Pago',
        html: `
          <div style="text-align: center;">
            <div style="font-size: 50px; margin-bottom: 20px;">❌</div>
            <p style="font-size: 16px; color: #666; margin-bottom: 15px;">
              ${errorMessage}
            </p>
            <p style="font-size: 14px; color: #999;">
              Código de error: ${err.response?.status || 'Desconocido'}
            </p>
          </div>
        `,
        confirmButtonText: 'Intentar de Nuevo',
        confirmButtonColor: '#f44336',
        background: '#fff',
        customClass: {
          popup: 'swal-popup-custom',
          title: 'swal-title-custom',
          confirmButton: 'swal-button-custom'
        }
      });
      
      setError(errorMessage);
    } finally {
      setSubscribing(false);
    }
  };

  const handlePayPalSuccess = (details) => {
    setPaypalLoading(false);
    setSuccess(`¡Pago exitoso! Bienvenido al club VIP, ${details.payer.name.given_name}!`);
    loadVipData();
  };

  const handlePayPalError = (error) => {
    setPaypalLoading(false);
    setError('Error procesando el pago con PayPal. Inténtalo de nuevo.');
    console.error('PayPal Error:', error);
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #ffd700 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Header con seguridad */}
        <Box textAlign="center" mb={6}>
          <Box display="flex" justifyContent="center" alignItems="center" mb={2}>
            <Lock sx={{ fontSize: 40, color: '#ffd700', mr: 2 }} />
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(45deg, #ffd700, #fff)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              CUESTOM VIP
            </Typography>
            <Verified sx={{ fontSize: 40, color: '#4caf50', ml: 2 }} />
          </Box>
          
          <Typography variant="h5" color="white" mb={2} sx={{ opacity: 0.9 }}>
            Únete al club exclusivo de creadores profesionales
          </Typography>
          
          <Box display="flex" justifyContent="center" alignItems="center" gap={2}>
            <Chip 
              icon={<Security />} 
              label="Pago 100% Seguro" 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                fontWeight: 'bold'
              }} 
            />
            <Chip 
              icon={<Verified />} 
              label="Activación Inmediata" 
              sx={{ 
                bgcolor: 'rgba(76,175,80,0.2)', 
                color: 'white',
                fontWeight: 'bold'
              }} 
            />
          </Box>
        </Box>

        {/* Mensajes */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Estado VIP actual - Contenido mejorado para usuarios VIP existentes */}
        {userSubscription && userSubscription.is_vip && (
          <Card sx={{ 
            mb: 4, 
            borderRadius: 3, 
            background: 'linear-gradient(45deg, #4caf50, #66bb6a)', 
            boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #4caf50, #66bb6a)',
              opacity: 1,
              filter: 'none',
              transform: 'none'
            }
          }}>
            <CardContent sx={{ textAlign: 'center', py: 5 }}>
              <Box display="flex" justifyContent="center" alignItems="center" mb={3}>
                <EmojiEvents sx={{ fontSize: 70, color: '#ffd700', mr: 2 }} />
                <Diamond sx={{ fontSize: 50, color: '#ffd700', animation: 'pulse 2s infinite' }} />
                <EmojiEvents sx={{ fontSize: 70, color: '#ffd700', ml: 2 }} />
              </Box>
              
              <Typography variant="h3" color="white" fontWeight="bold" mb={2}>
                ¡Ya eres miembro VIP! 👑
              </Typography>
              
              <Typography variant="h5" color="white" sx={{ opacity: 0.95, mb: 3 }}>
                Gracias por tu apoyo 🎉
              </Typography>

              {/* Información de suscripción mejorada */}
              {userSubscription.end_date && (
                <Box sx={{ 
                  bgcolor: 'rgba(255,255,255,0.15)', 
                  p: 4, 
                  borderRadius: 3, 
                  mb: 4, 
                  maxWidth: 500, 
                  mx: 'auto',
                  border: '2px solid rgba(255, 215, 0, 0.3)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}>
                  <Typography variant="h6" color="#ffd700" fontWeight="bold" mb={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <Diamond /> Tu suscripción VIP <Diamond />
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="rgba(255,255,255,0.8)" fontWeight="bold">
                          PLAN ACTUAL
                        </Typography>
                        <Typography variant="h6" color="white" fontWeight="bold">
                          {userSubscription.plan_type === 'monthly' ? '📅 Mensual' : 
                           userSubscription.plan_type === 'quarterly' ? '📊 Trimestral' : 
                           '🏆 Anual'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="rgba(255,255,255,0.8)" fontWeight="bold">
                          ESTADO
                        </Typography>
                        <Chip 
                          label="✅ Activo" 
                          size="small" 
                          sx={{ 
                            bgcolor: '#ffd700', 
                            color: '#333', 
                            fontWeight: 'bold',
                            fontSize: '0.75rem'
                          }} 
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="rgba(255,255,255,0.8)" fontWeight="bold">
                          VENCIMIENTO
                        </Typography>
                        <Typography variant="body1" color="white" fontWeight="bold">
                          {new Date(userSubscription.end_date).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Días restantes con indicador visual */}
                  <Box sx={{ mt: 2 }}>
                    {(() => {
                      const now = new Date();
                      const endDate = new Date(userSubscription.end_date);
                      const diffTime = endDate - now;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      let color = '#4caf50';
                      let icon = '✅';
                      let message = `${diffDays} días restantes`;
                      
                      if (diffDays <= 0) {
                        color = '#f44336';
                        icon = '⚠️';
                        message = 'Suscripción expirada';
                      } else if (diffDays <= 7) {
                        color = '#ff9800';
                        icon = '⏰';
                        message = `Solo ${diffDays} días restantes`;
                      } else if (diffDays === 1) {
                        color = '#ff5722';
                        icon = '🚨';
                        message = 'Expira mañana';
                      }
                      
                      return (
                        <Box sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          bgcolor: `${color}20`,
                          border: `2px solid ${color}40`,
                          textAlign: 'center'
                        }}>
                          <Typography variant="body1" sx={{ color, fontWeight: 'bold' }}>
                            {icon} {message}
                          </Typography>
                        </Box>
                      );
                    })()}
                  </Box>
                </Box>
              )}

              {/* Botón de upselling mejorado */}
              <Button
                variant="contained"
                size="large"
                startIcon={<Star />}
                onClick={() => navigate('/upgrade')}
                sx={{
                  mt: 2,
                  py: 2.5,
                  px: 6,
                  background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                  color: '#333',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  boxShadow: '0 6px 25px rgba(255, 215, 0, 0.5)',
                  border: '2px solid #fff',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #ffed4e, #ffc107)',
                    boxShadow: '0 8px 30px rgba(255, 215, 0, 0.7)',
                    transform: 'translateY(-3px) scale(1.02)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                🚀 Mejorar Suscripción
              </Button>
              
              <Typography variant="body2" color="rgba(255,255,255,0.8)" sx={{ mt: 2, fontStyle: 'italic' }}>
                Ahorra más con planes anuales • Beneficios exclusivos • Sin interrupciones
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Suscripción pendiente */}
        {userSubscription && userSubscription.is_pending_review && (
          <Card sx={{ mb: 4, borderRadius: 3, background: 'linear-gradient(45deg, #ff9800, #ffb74d)' }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress sx={{ color: 'white', mb: 2 }} />
              <Typography variant="h5" color="white" fontWeight="bold" mb={1}>
                Pago en Revisión ⏳
              </Typography>
              <Typography variant="body1" color="white" sx={{ opacity: 0.9 }}>
                Tu comprobante está siendo verificado. Te notificaremos por email cuando sea aprobado.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Planes VIP */}
        {(!userSubscription || (!userSubscription.is_vip && !userSubscription.is_pending_review)) && (
          <Box id="planes-section">
            <Typography variant="h4" textAlign="center" color="white" fontWeight="bold" mb={4}>
              Elige tu Plan VIP
            </Typography>
            
            <Grid container spacing={4} justifyContent="center">
              {plans.map((plan) => (
                <Grid item xs={12} md={4} key={plan.type}>
                  <Card
                    sx={{
                      borderRadius: 4,
                      background: '#ffffff',
                      border: '2px solid transparent',
                      backgroundImage: getPlanColor(plan.type),
                      backgroundClip: 'padding-box',
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
                    {plan.type === 'quarterly' && (
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
                    
                    <CardContent sx={{ textAlign: 'center', p: 4, background: 'white', borderRadius: 4 }}>
                      <Box mb={2}>
                        {getPlanIcon(plan.type)}
                      </Box>
                      
                      <Typography variant="h5" fontWeight="bold" mb={1}>
                        {plan.name}
                      </Typography>
                      
                      <Typography variant="h3" fontWeight="800" color="primary" mb={1}>
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
                          <ListItemText primary="Soporte prioritario" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                          <ListItemText primary="Sin publicidad" />
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
          </Box>
        )}

        {/* Sección de upgrade para usuarios VIP existentes */}
        {userSubscription && userSubscription.is_vip && (
          <Box id="upgrade-plans" sx={{ mt: 6 }}>
            <Typography variant="h4" textAlign="center" color="white" fontWeight="bold" mb={2}>
              🚀 Mejora tu Experiencia VIP
            </Typography>
            <Typography variant="h6" textAlign="center" color="rgba(255,255,255,0.8)" mb={4}>
              Ahorra más con planes de mayor duración
            </Typography>
            
            <Grid container spacing={4} justifyContent="center">
              {plans
                .filter(plan => {
                  // Mostrar solo planes superiores al actual
                  const currentPlan = userSubscription.plan_type;
                  if (currentPlan === 'monthly') return plan.type === 'quarterly' || plan.type === 'annual';
                  if (currentPlan === 'quarterly') return plan.type === 'annual';
                  return false; // Si ya es anual, no mostrar upgrades
                })
                .map((plan) => {
                  // Calcular ahorro
                  const currentPrice = userSubscription.price;
                  const newPrice = plan.price;
                  const currentMonthly = currentPrice / (userSubscription.plan_type === 'monthly' ? 1 : userSubscription.plan_type === 'quarterly' ? 3 : 12);
                  const newMonthly = newPrice / (plan.type === 'monthly' ? 1 : plan.type === 'quarterly' ? 3 : 12);
                  const savings = ((currentMonthly - newMonthly) / currentMonthly * 100).toFixed(0);
                  
                  return (
                    <Grid item xs={12} md={6} key={plan.type}>
                      <Card
                        sx={{
                          borderRadius: 4,
                          background: 'rgba(255,255,255,0.95)',
                          backdropFilter: 'blur(10px)',
                          border: '3px solid #ffd700',
                          position: 'relative',
                          overflow: 'visible',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 15px 35px rgba(255, 215, 0, 0.25)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <Chip
                          label={`AHORRA ${savings}%`}
                          sx={{
                            position: 'absolute',
                            top: -12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            bgcolor: '#ff4444',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '0.8rem',
                            zIndex: 1,
                            boxShadow: '0 4px 15px rgba(255, 68, 68, 0.4)',
                          }}
                        />
                        
                        <CardContent sx={{ textAlign: 'center', p: 4, background: 'white', borderRadius: 4 }}>
                          <Box mb={2}>
                            {getPlanIcon(plan.type)}
                          </Box>
                          
                          <Typography variant="h5" fontWeight="bold" mb={1}>
                            Upgrade a {plan.name}
                          </Typography>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="h3" fontWeight="800" color="primary">
                              ${plan.price}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Solo ${(plan.price / (plan.type === 'quarterly' ? 3 : 12)).toFixed(2)} por mes
                            </Typography>
                          </Box>
                          
                          <Box sx={{ 
                            bgcolor: 'rgba(76, 175, 80, 0.1)', 
                            p: 2, 
                            borderRadius: 2, 
                            mb: 3,
                            border: '1px solid rgba(76, 175, 80, 0.3)'
                          }}>
                            <Typography variant="body1" color="success.main" fontWeight="bold">
                              💰 Ahorras ${(currentMonthly * (plan.type === 'quarterly' ? 3 : 12) - plan.price).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              vs. renovar tu plan actual
                            </Typography>
                          </Box>

                          <List dense sx={{ mb: 3 }}>
                            <ListItem>
                              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                              <ListItemText primary="Todos los beneficios VIP actuales" />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                              <ListItemText primary="Sin interrupciones en el servicio" />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                              <ListItemText primary="Precio bloqueado por toda la duración" />
                            </ListItem>
                            {plan.type === 'annual' && (
                              <ListItem>
                                <ListItemIcon><Star color="warning" /></ListItemIcon>
                                <ListItemText primary="Acceso prioritario a nuevas funciones" />
                              </ListItem>
                            )}
                          </List>

                          <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            onClick={() => handleSelectPlan(plan)}
                            sx={{
                              py: 2.5,
                              background: 'linear-gradient(45deg, #4caf50, #66bb6a)',
                              fontWeight: 'bold',
                              fontSize: '1.1rem',
                              boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
                              '&:hover': {
                                background: 'linear-gradient(45deg, #43a047, #5cb85c)',
                                boxShadow: '0 8px 25px rgba(76, 175, 80, 0.6)',
                                transform: 'translateY(-2px)',
                              },
                            }}
                          >
                            🚀 Hacer Upgrade Ahora
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
            </Grid>
            
            {/* Mensaje si ya tiene el plan más alto */}
            {userSubscription.plan_type === 'annual' && (
              <Card sx={{ 
                mt: 4, 
                borderRadius: 3, 
                background: 'linear-gradient(45deg, #9c27b0, #673ab7)',
                textAlign: 'center'
              }}>
                <CardContent sx={{ py: 4 }}>
                  <EmojiEvents sx={{ fontSize: 60, color: '#ffd700', mb: 2 }} />
                  <Typography variant="h4" color="white" fontWeight="bold" mb={2}>
                    ¡Eres un VIP Premium! 👑
                  </Typography>
                  <Typography variant="h6" color="rgba(255,255,255,0.9)" mb={2}>
                    Ya tienes el plan más completo disponible
                  </Typography>
                  <Typography variant="body1" color="rgba(255,255,255,0.8)">
                    Disfruta de todos los beneficios VIP hasta {new Date(userSubscription.end_date).toLocaleDateString('es-ES')}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        )}

        {/* Diálogo de confirmación */}
        <Dialog 
          open={confirmDialog} 
          onClose={() => setConfirmDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogContent sx={{ p: 4 }}>
            <Box textAlign="center" mb={3}>
              <Lock sx={{ fontSize: 50, color: '#ffd700', mb: 2 }} />
              <Typography variant="h5" fontWeight="bold" mb={1}>
                Confirmar Suscripción
              </Typography>
              {selectedPlan && (
                <Typography variant="h6" color="primary">
                  Plan {selectedPlan.name} - ${selectedPlan.price}
                </Typography>
              )}
            </Box>

            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 2 }}>
                Método de Pago
              </FormLabel>
              <RadioGroup
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              >
                <FormControlLabel
                  value="online"
                  control={<Radio />}
                  label={
                    <Box display="flex" alignItems="center">
                      <CreditCard sx={{ mr: 1 }} />
                      PayPal (Pago inmediato)
                    </Box>
                  }
                />
                {/* ✅ YAPE: Solo mostrar para usuarios peruanos (country === 'PE') */}
                {currentUser && currentUser.country === 'PE' && (
                  <FormControlLabel
                    value="yape"
                    control={<Radio />}
                    label={
                      <Box display="flex" alignItems="center">
                        <Phone sx={{ mr: 1, color: '#722F8B' }} />
                        Yape (Revisión manual)
                      </Box>
                    }
                  />
                )}
                <FormControlLabel
                  value="bcp"
                  control={<Radio />}
                  label={
                    <Box display="flex" alignItems="center">
                      <AccountBalance sx={{ mr: 1, color: '#FF6B00' }} />
                      BCP (Revisión manual)
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={() => setConfirmDialog(false)} size="large">
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmPlan}
              variant="contained"
              size="large"
              sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                px: 4,
              }}
            >
              Continuar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo de pago manual */}
        <Dialog 
          open={paymentDialog} 
          onClose={() => setPaymentDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, background: 'linear-gradient(45deg, #667eea, #764ba2)', color: 'white' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center">
                  <Lock sx={{ fontSize: 30, mr: 2 }} />
                  <Typography variant="h5" fontWeight="bold">
                    Pago Seguro - {selectedPaymentMethod === 'yape' ? 'Yape' : 'BCP'}
                  </Typography>
                </Box>
                <IconButton onClick={() => setPaymentDialog(false)} sx={{ color: 'white' }}>
                  <Close />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ p: 4 }}>
              {selectedPaymentMethod === 'yape' && (
                <Grid container spacing={4}>
                  {/* Información de Yape */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 3, border: '2px solid #722F8B', background: 'linear-gradient(45deg, #722F8B, #9C4DCC)' }}>
                      <CardContent sx={{ textAlign: 'center', p: 4 }}>
                        <Typography variant="h4" color="white" fontWeight="bold" mb={2}>
                          📱 YAPE
                        </Typography>
                        
                        <Box sx={{ bgcolor: 'white', p: 3, borderRadius: 2, mb: 3 }}>
                          <QrCode sx={{ fontSize: 120, color: '#722F8B' }} />
                          <Typography variant="body2" color="text.secondary" mt={1}>
                            Código QR de Yape
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="white" sx={{ mb: 2, opacity: 0.9 }}>
                          Escanea este QR para pagar con Yape. Una vez realizado, confirma tu pago aquí.
                        </Typography>

                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 2, mb: 2 }}>
                          <Typography variant="h6" color="#ffd700" fontWeight="bold">
                            Titular de cuenta:
                          </Typography>
                          <Typography variant="h5" color="white" fontWeight="bold">
                            Junior Giancarlo
                          </Typography>
                          <Typography variant="body1" color="white" sx={{ opacity: 0.9 }}>
                            (Director de Cuestom)
                          </Typography>
                        </Box>

                        <Typography variant="h4" color="#ffd700" fontWeight="bold">
                          ${selectedPlan?.price}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Formulario de comprobante */}
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" mb={3}>
                        Subir Comprobante de Pago
                      </Typography>

                      {/* Campo de archivo */}
                      <Card sx={{ mb: 3, border: '2px dashed #667eea', borderRadius: 2 }}>
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                          <input
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            id="payment-proof-upload"
                            type="file"
                            onChange={handleFileSelect}
                          />
                          <label htmlFor="payment-proof-upload">
                            <Button
                              variant="contained"
                              component="span"
                              size="large"
                              startIcon={paymentProof ? <CheckCircle /> : <Upload />}
                              sx={{
                                background: paymentProof 
                                  ? 'linear-gradient(45deg, #4caf50, #66bb6a)'
                                  : 'linear-gradient(45deg, #ff9800, #ffb74d)',
                                py: 2,
                                px: 4,
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                mb: 2,
                              }}
                            >
                              {paymentProof ? 'Archivo Seleccionado' : 'Subir Comprobante'}
                            </Button>
                          </label>
                          
                          {paymentProof ? (
                            <Typography variant="body1" color="success.main" fontWeight="bold">
                              ✅ {paymentProof.name}
                            </Typography>
                          ) : (
                            <>
                              <Box display="flex" justifyContent="center" gap={2} mb={2}>
                                <PhotoCamera sx={{ fontSize: 40, color: '#667eea' }} />
                                <PictureAsPdf sx={{ fontSize: 40, color: '#f44336' }} />
                              </Box>
                              <Typography variant="body1" color="text.secondary">
                                Foto o PDF (máx. 5MB)
                              </Typography>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      {/* ID de transacción */}
                      <TextField
                        fullWidth
                        label="ID de Transacción (Opcional)"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Ej: YAPE123456789"
                        sx={{ mb: 3 }}
                        helperText="Puedes encontrarlo en tu app de Yape"
                      />

                      {/* Botón de confirmación */}
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleUploadProof}
                        disabled={subscribing || !paymentProof}
                        sx={{
                          py: 2,
                          background: paymentProof 
                            ? 'linear-gradient(45deg, #4caf50, #66bb6a)'
                            : 'linear-gradient(45deg, #9e9e9e, #757575)',
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                        }}
                      >
                        {subscribing ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          'Ya Realicé el Pago'
                        )}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              )}

              {selectedPaymentMethod === 'bcp' && (
                <Grid container spacing={4}>
                  {/* Información de BCP */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 3, border: '2px solid #FF6B00', background: 'linear-gradient(45deg, #FF6B00, #FF8F00)' }}>
                      <CardContent sx={{ textAlign: 'center', p: 4 }}>
                        <Typography variant="h4" color="white" fontWeight="bold" mb={3}>
                          🏦 BCP
                        </Typography>
                        
                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 3, borderRadius: 2, mb: 3 }}>
                          <Typography variant="h6" color="#ffd700" fontWeight="bold" mb={2}>
                            Datos de la Cuenta:
                          </Typography>
                          <Typography variant="body1" color="white" mb={1}>
                            <strong>Banco:</strong> BCP
                          </Typography>
                          <Typography variant="body1" color="white" mb={1}>
                            <strong>Tipo:</strong> Cuenta de Ahorros
                          </Typography>
                          <Typography variant="body1" color="white" mb={1}>
                            <strong>Número:</strong> 123-456789-0-12
                          </Typography>
                        </Box>

                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.1)', p: 2, borderRadius: 2, mb: 2 }}>
                          <Typography variant="h6" color="#ffd700" fontWeight="bold">
                            Titular de cuenta:
                          </Typography>
                          <Typography variant="h5" color="white" fontWeight="bold">
                            Junior Giancarlo
                          </Typography>
                          <Typography variant="body1" color="white" sx={{ opacity: 0.9 }}>
                            (Director de Cuestom)
                          </Typography>
                        </Box>

                        <Typography variant="h4" color="#ffd700" fontWeight="bold">
                          ${selectedPlan?.price}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Formulario de comprobante */}
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" mb={3}>
                        Subir Comprobante de Pago
                      </Typography>

                      {/* Campo de archivo */}
                      <Card sx={{ mb: 3, border: '2px dashed #667eea', borderRadius: 2 }}>
                        <CardContent sx={{ textAlign: 'center', py: 4 }}>
                          <input
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            id="payment-proof-upload-bcp"
                            type="file"
                            onChange={handleFileSelect}
                          />
                          <label htmlFor="payment-proof-upload-bcp">
                            <Button
                              variant="contained"
                              component="span"
                              size="large"
                              startIcon={paymentProof ? <CheckCircle /> : <Upload />}
                              sx={{
                                background: paymentProof 
                                  ? 'linear-gradient(45deg, #4caf50, #66bb6a)'
                                  : 'linear-gradient(45deg, #ff9800, #ffb74d)',
                                py: 2,
                                px: 4,
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                mb: 2,
                              }}
                            >
                              {paymentProof ? 'Archivo Seleccionado' : 'Subir Comprobante'}
                            </Button>
                          </label>
                          
                          {paymentProof ? (
                            <Typography variant="body1" color="success.main" fontWeight="bold">
                              ✅ {paymentProof.name}
                            </Typography>
                          ) : (
                            <>
                              <Box display="flex" justifyContent="center" gap={2} mb={2}>
                                <PhotoCamera sx={{ fontSize: 40, color: '#667eea' }} />
                                <PictureAsPdf sx={{ fontSize: 40, color: '#f44336' }} />
                              </Box>
                              <Typography variant="body1" color="text.secondary">
                                Foto o PDF (máx. 5MB)
                              </Typography>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      {/* ID de transacción */}
                      <TextField
                        fullWidth
                        label="Número de Operación (Opcional)"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Ej: 123456789"
                        sx={{ mb: 3 }}
                        helperText="Número que aparece en tu voucher"
                      />

                      {/* Botón de confirmación */}
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleUploadProof}
                        disabled={subscribing || !paymentProof}
                        sx={{
                          py: 2,
                          background: paymentProof 
                            ? 'linear-gradient(45deg, #4caf50, #66bb6a)'
                            : 'linear-gradient(45deg, #9e9e9e, #757575)',
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                        }}
                      >
                        {subscribing ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          'Ya Realicé el Pago'
                        )}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </Box>
          </DialogContent>
        </Dialog>

        {/* PayPal Loading */}
        {paypalLoading && selectedPaymentMethod === 'online' && selectedPlan && (
          <Box textAlign="center" mt={4}>
            <Card sx={{ p: 4, borderRadius: 3 }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="h6" mb={2}>
                Procesando pago con PayPal...
              </Typography>
              <PayPalButton
                plan={selectedPlan}
                onSuccess={handlePayPalSuccess}
                onError={handlePayPalError}
              />
            </Card>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default VipPage;
