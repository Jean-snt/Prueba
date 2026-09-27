import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Email,
  Security,
  Lock,
  Visibility,
  VisibilityOff,
  ArrowBack,
  CheckCircle,
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  
  // Estados del componente
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados de bloqueo
  const [isBlocked, setIsBlocked] = useState(false);
  const [timeUntilUnblock, setTimeUntilUnblock] = useState(0);
  const [attempts, setAttempts] = useState(0);
  
  // Datos del formulario
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const steps = [
    'Ingresa tu correo',
    'Ingresa el código',
    'Nueva contraseña'
  ];

  // Efecto para el contador de desbloqueo
  React.useEffect(() => {
    let interval;
    if (isBlocked && timeUntilUnblock > 0) {
      interval = setInterval(() => {
        setTimeUntilUnblock(prev => {
          if (prev <= 1) {
            setIsBlocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBlocked, timeUntilUnblock]);

  // Función para verificar estado de bloqueo
  const checkBlockStatus = async () => {
    if (!email) return;
    
    try {
      const response = await surveyAPI.passwordResetStatus(email);
      if (response.data.success) {
        setIsBlocked(response.data.blocked);
        setTimeUntilUnblock(response.data.time_until_unblock);
        setAttempts(response.data.attempts || 0);
      }
    } catch (err) {
      console.error('Error checking block status:', err);
    }
  };

  // Paso 1: Solicitar código de recuperación
  const handleRequestCode = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await surveyAPI.passwordResetRequest(email);

      if (response.data.success) {
        setSuccess(response.data.message);
        setActiveStep(1);
        // Verificar estado de bloqueo después de enviar código
        setTimeout(checkBlockStatus, 1000);
      } else {
        setError(response.data.error);
      }

    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar código de recuperación');
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Verificar código y cambiar contraseña
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!resetCode.trim()) {
      setError('Por favor ingresa el código de recuperación');
      return;
    }

    if (!newPassword) {
      setError('Por favor ingresa la nueva contraseña');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await surveyAPI.passwordResetConfirm({
        email: email,
        code: resetCode,
        new_password: newPassword
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        setActiveStep(2);
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(response.data.error);
        
        // Manejar bloqueo
        if (response.data.blocked) {
          setIsBlocked(true);
          setTimeUntilUnblock(response.data.time_until_unblock);
        }
      }

    } catch (err) {
      const errorData = err.response?.data;
      setError(errorData?.error || 'Error al cambiar la contraseña');
      
      // Manejar bloqueo en caso de error
      if (errorData?.blocked) {
        setIsBlocked(true);
        setTimeUntilUnblock(errorData.time_until_unblock);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleResendCode = () => {
    setActiveStep(0);
    setResetCode('');
    setError('');
    setSuccess('');
    setIsBlocked(false);
    setTimeUntilUnblock(0);
    setAttempts(0);
  };

  // Formatear tiempo restante
  const formatTimeRemaining = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#7113B8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            padding: 4,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Security sx={{ fontSize: 60, color: '#8C4EFF', mb: 2 }} />
            <Typography variant="h4" fontWeight="bold" color="#333" mb={1}>
              Recuperar Contraseña
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Te ayudamos a recuperar el acceso a tu cuenta
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Mensajes */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {/* Alerta de bloqueo */}
          {isBlocked && timeUntilUnblock > 0 && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 3,
                background: 'linear-gradient(45deg, #ff9800, #ffb74d)',
                color: 'white',
                '& .MuiAlert-icon': { color: 'white' }
              }}
            >
              <Typography variant="h6" fontWeight="bold">
                🔒 Código Bloqueado
              </Typography>
              <Typography>
                Demasiados intentos fallidos. Podrás intentar de nuevo en:
              </Typography>
              <Typography variant="h5" fontWeight="bold" sx={{ mt: 1 }}>
                ⏰ {formatTimeRemaining(timeUntilUnblock)}
              </Typography>
            </Alert>
          )}

          {/* Información de intentos */}
          {activeStep === 1 && attempts > 0 && !isBlocked && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography>
                ⚠️ Intentos fallidos: {attempts}/3
                {attempts === 2 && " - ¡Cuidado! El siguiente intento fallido bloqueará el código por 5 minutos."}
              </Typography>
            </Alert>
          )}

          {/* Paso 1: Ingresa tu correo */}
          {activeStep === 0 && (
            <Box component="form" onSubmit={handleRequestCode}>
              <TextField
                fullWidth
                label="Correo Electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-email@ejemplo.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="primary" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
                disabled={loading}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 2,
                  mb: 2,
                  background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Enviar Código de Recuperación'
                )}
              </Button>
            </Box>
          )}

          {/* Paso 2: Ingresa el código y nueva contraseña */}
          {activeStep === 1 && (
            <Box component="form" onSubmit={handleResetPassword}>
              <TextField
                fullWidth
                label="Código de Recuperación"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="123456"
                inputProps={{ maxLength: 6 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Security color="primary" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Nueva Contraseña"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Confirmar Nueva Contraseña"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
                disabled={loading}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || isBlocked}
                sx={{
                  py: 2,
                  mb: 2,
                  background: isBlocked 
                    ? 'linear-gradient(45deg, #9e9e9e, #757575)'
                    : 'linear-gradient(45deg, #8C4EFF, #7113B8)',
                  '&:hover': {
                    background: isBlocked
                      ? 'linear-gradient(45deg, #9e9e9e, #757575)'
                      : 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                  },
                  '&:disabled': {
                    background: 'linear-gradient(45deg, #9e9e9e, #757575)',
                    color: 'rgba(255,255,255,0.7)',
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : isBlocked ? (
                  `🔒 Bloqueado (${formatTimeRemaining(timeUntilUnblock)})`
                ) : (
                  'Cambiar Contraseña'
                )}
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={handleResendCode}
                disabled={loading}
                sx={{ mb: 1 }}
              >
                ¿No recibiste el código? Reenviar
              </Button>
            </Box>
          )}

          {/* Paso 3: Éxito */}
          {activeStep === 2 && (
            <Box textAlign="center">
              <CheckCircle sx={{ fontSize: 80, color: '#4caf50', mb: 3 }} />
              <Typography variant="h5" fontWeight="bold" color="#4caf50" mb={2}>
                ¡Contraseña Actualizada!
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={3}>
                Tu contraseña ha sido cambiada exitosamente.
                Serás redirigido al login en unos segundos...
              </Typography>
              <CircularProgress size={30} />
            </Box>
          )}

          {/* Botón volver al login */}
          {activeStep < 2 && (
            <Button
              fullWidth
              variant="text"
              startIcon={<ArrowBack />}
              onClick={handleBackToLogin}
              disabled={loading}
              sx={{
                mt: 2,
                color: '#8C4EFF',
                '&:hover': {
                  background: 'rgba(102, 126, 234, 0.1)',
                },
              }}
            >
              Volver al Login
            </Button>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default ForgotPassword;