import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  InputAdornment,
  IconButton,
  Dialog,
  DialogContent,
} from '@mui/material';
import {
  CreditCard,
  Lock,
  CheckCircle,
  ArrowBack,
  Visibility,
  VisibilityOff,
  Diamond,
  QrCode,
  Phone,
} from '@mui/icons-material';

// Iconos de métodos de pago - LIMPIOS Y PROFESIONALES
const PaymentMethodIcons = () => (
  <Box display="flex" alignItems="center" justifyContent="center" gap={3} my={3} flexWrap="wrap">
    {/* Visa Logo - SVG Limpio y Completo */}
    <Box 
      component="img" 
      src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjMyIiB2aWV3Qm94PSIwIDAgMTAwIDMyIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjMyIiBmaWxsPSJ3aGl0ZSIgcng9IjQiLz4KPHBhdGggZD0iTTM1LjIgMjRIMzAuNEwzMy42IDhIMzguNEwzNS4yIDI0Wk01OC40IDguNEM1Ny4yIDcuOCA1NS4yIDcuMiA1Mi44IDcuMkM0OC40IDcuMiA0NS4yIDkuNiA0NS4yIDEzQzQ1LjIgMTUuNiA0Ny42IDE3IDQ5LjYgMTcuOEM1MS42IDE4LjYgNTIuNCAxOS4yIDUyLjQgMjBDNTIuNCAyMS4yIDUxIDIxLjggNDkuNiAyMS44QzQ3LjYgMjEuOCA0Ni40IDIxLjQgNDQuOCAyMC42TDQ0IDIwLjJMNDMuMiAyNC40QzQ0LjggMjUuMiA0Ny42IDI1LjggNTAuNCAyNS44QzU1LjIgMjUuOCA1OC40IDIzLjQgNTguNCAyMC40QzU4LjQgMTguNCA1Ni44IDE2LjggNTMuNiAxNS42QzUxLjYgMTQuOCA1MC40IDE0LjIgNTAuNCAxMy40QzUwLjQgMTIuNiA1MS4yIDExLjggNTMuMiAxMS44QzU1IDExLjggNTYuNCAxMi4yIDU3LjYgMTIuOEw1OC40IDguNFpNNzIgOEg2OC40QzY3LjIgOCA2Ni40IDguNCA2NS42IDkuNkw1Ni44IDI0SDYxLjZMNjIuNCAyMkg2OC44TDY5LjYgMjRINzRMNzIgOFpNNjMuNiAxOC40QzY0IDE3LjIgNjYgMTIuNCA2NiAxMi40QzY2IDEyLjQgNjYuOCAxMC40IDY3LjIgOS42TDY4IDE0LjRMNjMuNiAxOC40Wk0yNS42IDhMMjEuMiAyMC40TDIwLjggMTguNEMxOS42IDE0LjggMTYuNCAxMS4yIDEyLjggOS42TDE3LjIgMjRIMjJMMjkuNiA4SDI1LjZaIiBmaWxsPSIjMTQzNDhCIi8+CjxwYXRoIGQ9Ik0xNC40IDhINi40TDYgOC40QzExLjIgOS42IDE0LjggMTIuOCAxNi40IDE3LjJMMTQuNCA4WiIgZmlsbD0iI0Y2QjYwQiIvPgo8L3N2Zz4K" 
      alt="Visa" 
      sx={{ height: 32, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
    />
    {/* Mastercard Logo */}
    <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative', width: 48, height: 32 }}>
      <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#EB001B', position: 'absolute', left: 0 }} />
      <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#F79E1B', position: 'absolute', left: 12 }} />
    </Box>
    {/* PayPal Logo */}
    <Typography sx={{ fontSize: '20px', fontWeight: 'bold', color: '#003087', fontFamily: 'Verdana' }}>
      Pay<span style={{ color: '#009CDE' }}>Pal</span>
    </Typography>
  </Box>
);

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  
  // Plan seleccionado desde el state de navegación
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  // Datos de la tarjeta
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    zipCode: '',  /* ✅ NUEVO: Código postal */
  });
  
  const [showCVV, setShowCVV] = useState(false);
  
  // AWS Ready: Estado para client_secret o token de pago (reservado para integración futura)

  useEffect(() => {
    // ✅ PROTECCIÓN DE AUTENTICACIÓN: Redirigir a login si no está autenticado
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Obtener plan desde el state de navegación
    if (location.state?.plan) {
      setSelectedPlan(location.state.plan);
    } else {
      // Si no hay plan, redirigir a la página de planes
      navigate('/upgrade');
    }
  }, [location, navigate]);

  const handleCardInputChange = (e) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    
    // Formatear número de tarjeta (espacios cada 4 dígitos)
    if (name === 'cardNumber') {
      formattedValue = value
        .replace(/\s/g, '')
        .replace(/(\d{4})/g, '$1 ')
        .trim()
        .substring(0, 19); // 16 dígitos + 3 espacios
    }
    
    // Formatear fecha de expiración (MM/YY)
    if (name === 'expiryDate') {
      formattedValue = value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1/$2')
        .substring(0, 5);
    }
    
    // Limitar CVV a 3-4 dígitos
    if (name === 'cvv') {
      formattedValue = value.replace(/\D/g, '').substring(0, 4);
    }
    
    setCardData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const validateCardData = () => {
    if (!cardData.cardNumber || cardData.cardNumber.replace(/\s/g, '').length < 13) {
      setError('Número de tarjeta inválido');
      return false;
    }
    
    if (!cardData.cardName || cardData.cardName.trim().length < 3) {
      setError('Nombre del titular inválido');
      return false;
    }
    
    if (!cardData.expiryDate || cardData.expiryDate.length !== 5) {
      setError('Fecha de expiración inválida');
      return false;
    }
    
    if (!cardData.cvv || cardData.cvv.length < 3) {
      setError('CVV inválido');
      return false;
    }
    
    return true;
  };

  const handleSubmitPayment = async () => {
    setError('');
    setSuccess('');
    
    if (!validateCardData()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Obtener usuario actual
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
        navigate('/login');
        return;
      }
      
      const currentUser = JSON.parse(storedUser);
      
      // Generar token de pago simulado (en producción, esto vendría de Stripe/PayPal)
      const tokenPago = `tok_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Preparar datos para AWS Lambda
      const paymentData = {
        userId: currentUser.id,
        planId: selectedPlan.type,
        tokenPago: tokenPago,
        cardData: {
          lastFourDigits: cardData.cardNumber.replace(/\s/g, '').slice(-4),
          cardName: cardData.cardName,
          expiryDate: cardData.expiryDate,
        }
      };
      
      // Llamar al endpoint de AWS Lambda
      const response = await fetch('https://9kitiuoig6.execute-api.us-east-1.amazonaws.com/default/procesar-pago-cuestom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success || result.statusCode === 200) {
        setSuccess('¡Pago procesado exitosamente! Activando tu cuenta VIP...');
        setShowSuccessDialog(true);
        
        // Actualizar estado VIP en localStorage
        const updatedUser = { ...currentUser, is_vip: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Disparar evento para actualizar componentes
        window.dispatchEvent(new CustomEvent('vipStatusChanged', { 
          detail: { is_vip: true } 
        }));
        
        setTimeout(() => {
          navigate('/vip-dashboard');
        }, 3000);
      } else {
        throw new Error(result.message || 'Error procesando el pago');
      }
      
    } catch (err) {
      setError(err.message || 'Error procesando el pago. Verifica tus datos e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedPlan) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} sx={{ color: '#8C4EFF' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#7113B8',
        py: 6,
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 3 } }}>
        {/* Header */}
        <Box mb={4}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/upgrade')}
            sx={{ color: 'white', mb: 2 }}
          >
            Volver a Planes
          </Button>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: 'white',
              textAlign: 'center',
              mb: 1,
            }}
          >
            Finalizar Compra
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
            Pago 100% seguro y encriptado
          </Typography>
        </Box>

        {/* Mensajes */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
            {success}
          </Alert>
        )}

        <Grid 
          container 
          spacing={3} 
          sx={{ 
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            // ✅ FIX #6: Responsive layout for mobile (375px)
            flexDirection: { xs: 'column', md: 'row' },
            flexWrap: { xs: 'wrap', md: 'nowrap' },
            px: { xs: 2, sm: 3, md: 0 }, // Minimum 16px horizontal padding on mobile
          }}
        >
          {/* Formulario de Pago - First on mobile, left on desktop */}
          <Grid item xs={12} md={6} sx={{ order: { xs: 1, md: 1 } }}>
            <Card sx={{ 
              borderRadius: 3, 
              bgcolor: 'white',
              width: '100%', // ✅ FIX #6: Full width on all devices
              '&:hover': {
                backgroundColor: '#ffffff !important',
                opacity: '1 !important',
                filter: 'none !important',
              }
            }}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Lock sx={{ fontSize: 32, color: '#4caf50' }} />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Información de Pago
                  </Typography>
                </Box>

                {/* Iconos de métodos de pago */}
                <PaymentMethodIcons />

                <Divider sx={{ my: 3 }} />

                {/* Formulario */}
                <Box component="form" noValidate>
                  <TextField
                    fullWidth
                    label="Número de Tarjeta"
                    name="cardNumber"
                    value={cardData.cardNumber}
                    onChange={handleCardInputChange}
                    placeholder="1234 5678 9012 3456"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CreditCard />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 3 }}
                  />

                  <TextField
                    fullWidth
                    label="Nombre del Titular"
                    name="cardName"
                    value={cardData.cardName}
                    onChange={handleCardInputChange}
                    placeholder="JUAN PEREZ"
                    sx={{ mb: 3 }}
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Fecha de Expiración"
                        name="expiryDate"
                        value={cardData.expiryDate}
                        onChange={handleCardInputChange}
                        placeholder="MM/YY"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="CVV"
                        name="cvv"
                        type={showCVV ? 'text' : 'password'}
                        value={cardData.cvv}
                        onChange={handleCardInputChange}
                        placeholder="123"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowCVV(!showCVV)}
                                edge="end"
                              >
                                {showCVV ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Código Postal"
                        name="zipCode"
                        value={cardData.zipCode}
                        onChange={handleCardInputChange}
                        placeholder="12345"
                      />
                    </Grid>
                  </Grid>

                  {/* Yape para Perú */}
                  {(() => {
                    const stored = localStorage.getItem('user');
                    if (!stored) return null;
                    try {
                      const user = JSON.parse(stored);
                      if (user.country !== 'PE') return null;
                    } catch (e) { return null; }
                    return (
                      <Card sx={{ mt: 3, borderRadius: 3, border: '2px solid #722F8B', background: 'linear-gradient(45deg, #722F8B, #9C4DCC)' }}>
                        <CardContent sx={{ textAlign: 'center', p: 3 }}>
                          <Typography variant="h6" color="white" fontWeight="bold" mb={2}>
                            Paga con Yape (Solo Perú)
                          </Typography>
                          <Box sx={{ bgcolor: 'white', p: 3, borderRadius: 2, mb: 2 }}>
                            <QrCode sx={{ fontSize: 120, color: '#722F8B' }} />
                            <Typography variant="body2" color="text.secondary" mt={1}>
                              Código QR de Yape
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="white" sx={{ opacity: 0.9, mb: 2 }}>
                            Escanea este QR para pagar con Yape. Una vez realizado, confirma tu pago aquí.
                          </Typography>
                          <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            sx={{
                              background: '#ffd700',
                              color: '#333',
                              fontWeight: 'bold',
                              '&:hover': { background: '#ffed4e' },
                            }}
                          >
                            Confirmar pago realizado
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  <Alert severity="info" sx={{ mt: 3 }}>
                    <Typography variant="body2">
                      💳 Procesamiento de pago seguro y encriptado
                    </Typography>
                  </Alert>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleSubmitPayment}
                    disabled={loading}
                    sx={{
                      mt: 4,
                      py: 2,
                      background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #7113B8, #8C4EFF)',
                      },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={24} sx={{ color: 'white' }} />
                    ) : (
                      `Pagar $${selectedPlan.type === 'monthly' ? '2.70' : selectedPlan.price} USD`
                    )}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Resumen del Pedido - Second on mobile, right on desktop */}
          <Grid item xs={12} md={5} sx={{ order: { xs: 2, md: 2 } }}>
            <Card sx={{ 
              borderRadius: 3, 
              bgcolor: 'white', 
              width: '100%', // ✅ FIX #6: Full width on all devices
              position: { xs: 'relative', md: 'sticky' }, // ✅ FIX #6: Sticky only on desktop
              top: { xs: 0, md: 20 }, // ✅ FIX #6: Top offset only on desktop
              '&:hover': {
                backgroundColor: '#ffffff !important',
                opacity: '1 !important',
                filter: 'none !important',
              }
            }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                  Resumen del Pedido
                </Typography>

                <Box sx={{ bgcolor: '#f5f5f5', p: 3, borderRadius: 2, mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {selectedPlan.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {selectedPlan.type === 'monthly' && 'Plan Mensual'}
                    {selectedPlan.type === 'quarterly' && 'Plan Trimestral'}
                    {selectedPlan.type === 'annual' && 'Plan Anual'}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Subtotal:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      ${selectedPlan.type === 'monthly' ? '2.70' : selectedPlan.price} USD
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="body2">Impuestos:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      $0.00 USD
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="h6" fontWeight={700}>
                      Total:
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#8C4EFF' }}>
                      ${selectedPlan.type === 'monthly' ? '2.70' : selectedPlan.price} USD
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Beneficios Incluidos:
                </Typography>
                
                <List dense>
                  <ListItem sx={{ px: 0 }}>
                    <CheckCircle sx={{ color: '#4caf50', mr: 1, fontSize: 20 }} />
                    <ListItemText primary="Encuestas ilimitadas" />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <CheckCircle sx={{ color: '#4caf50', mr: 1, fontSize: 20 }} />
                    <ListItemText primary="Análisis avanzados" />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <CheckCircle sx={{ color: '#4caf50', mr: 1, fontSize: 20 }} />
                    <ListItemText primary="Cambio de apodo cada 7 días" />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <CheckCircle sx={{ color: '#4caf50', mr: 1, fontSize: 20 }} />
                    <ListItemText primary="Encuestas auto-destructivas" />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <CheckCircle sx={{ color: '#4caf50', mr: 1, fontSize: 20 }} />
                    <ListItemText primary="Soporte prioritario" />
                  </ListItem>
                </List>

                <Alert severity="success" sx={{ mt: 3 }}>
                  <Typography variant="body2" fontWeight={600}>
                     Activación inmediata después del pago
                  </Typography>
                </Alert>

              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Diálogo de Éxito */}
        <Dialog
          open={showSuccessDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              textAlign: 'center',
              p: 2,
            }
          }}
        >
          <DialogContent sx={{ py: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8C4EFF, #7113B8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': {
                    transform: 'scale(1)',
                    boxShadow: '0 0 0 0 rgba(102, 126, 234, 0.7)',
                  },
                  '50%': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 0 0 20px rgba(102, 126, 234, 0)',
                  },
                },
              }}
            >
              <Diamond sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#8C4EFF' }}>
              ¡Bienvenido a VIP!
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              Tu pago ha sido procesado exitosamente. Ahora tienes acceso a todas las funciones premium de Cuestom.
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
              <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
              <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
                Cuenta VIP activada
              </Typography>
            </Box>
            
            <CircularProgress size={40} sx={{ color: '#8C4EFF' }} />
            
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Redirigiendo a tu Dashboard VIP...
            </Typography>
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
};

export default CheckoutPage;


