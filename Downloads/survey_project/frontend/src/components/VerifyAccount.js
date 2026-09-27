import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Paper,
  Grid,
  IconButton,
} from '@mui/material';
import { 
  Security, 
  Refresh, 
  CheckCircle, 
  Timer,
  ArrowBack 
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';
import './Auth.css';

const VerifyAccount = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [expirationTime, setExpirationTime] = useState(null);
  
  // Obtener username de los parámetros de navegación o query params
  const username = location.state?.username || new URLSearchParams(location.search).get('username');
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  // ✅ SOLUCIÓN DEFINITIVA: Contador en tiempo real con localStorage
  useEffect(() => {
    if (!username) {
      navigate('/register');
      return;
    }

    // Obtener o crear hora de expiración
    const storageKey = `verification_expiration_${username}`;
    let expTime = localStorage.getItem(storageKey);
    
    if (!expTime) {
      // Primera vez: crear nueva hora de expiración (15 minutos desde ahora)
      expTime = Date.now() + 15 * 60 * 1000;
      localStorage.setItem(storageKey, expTime.toString());
    } else {
      expTime = parseInt(expTime, 10);
    }
    
    setExpirationTime(expTime);

    // Timer que calcula el tiempo restante cada segundo
    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expTime - now) / 1000));
      setTimeLeft(remaining);
      
      // Si el tiempo expiró, limpiar el timer
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    // Calcular inmediatamente al montar
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expTime - now) / 1000));
    setTimeLeft(remaining);

    return () => clearInterval(timer);
  }, [username, navigate]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (index, value) => {
    // Solo permitir números
    const numericValue = value.replace(/[^0-9]/g, '');
    
    if (numericValue.length <= 1) {
      const newCode = [...code];
      newCode[index] = numericValue;
      setCode(newCode);

      // Auto-focus al siguiente campo
      if (numericValue && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit cuando se completen todos los dígitos
      if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
        handleSubmit(newCode.join(''));
      }
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspace: ir al campo anterior
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Arrow keys para navegación
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (codeString = null) => {
    const verificationCode = codeString || code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Por favor ingresa el código completo de 6 dígitos');
      return;
    }

    // ✅ VALIDACIÓN: Verificar si el código expiró
    if (timeLeft <= 0) {
      setError('El código ha expirado. Por favor solicita uno nuevo.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await surveyAPI.verifyAccount({
        username: username,
        code: verificationCode,
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        // ✅ LIMPIAR: Eliminar hora de expiración del localStorage
        localStorage.removeItem(`verification_expiration_${username}`);
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: '¡Cuenta verificada exitosamente! Ya puedes iniciar sesión.',
              username: username 
            }
          });
        }, 2000);
      } else {
        setError(response.data.error);
        // Limpiar código si hay error
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Error al verificar el código. Inténtalo de nuevo.');
      }
      // Limpiar código si hay error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await surveyAPI.resendVerificationCode({
        username: username,
      });

      if (response.data.success) {
        setSuccess('Nuevo código enviado. Revisa tu email.');
        
        // ✅ RESETEAR: Nueva hora de expiración (15 minutos desde ahora)
        const newExpTime = Date.now() + 15 * 60 * 1000;
        localStorage.setItem(`verification_expiration_${username}`, newExpTime.toString());
        setExpirationTime(newExpTime);
        setTimeLeft(900); // 15 minutos en segundos
        
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Error al reenviar el código. Inténtalo de nuevo.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  if (!username) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#7113B8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box sx={{ p: { xs: 4, md: 6 } }}>
            {/* Header */}
            <Box textAlign="center" mb={4}>
              <Typography
                variant="h2"
                component="h1"
                className="cuestom-logo"
                sx={{ mb: 2 }}
              >
                Cuestom
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Security sx={{ fontSize: 60, color: 'primary.main' }} />
              </Box>
              
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                Verificar tu cuenta
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Hemos enviado un código de 6 dígitos a tu email.
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Usuario: <strong>{username}</strong>
              </Typography>
            </Box>

            {/* Timer */}
            <Box textAlign="center" mb={3}>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <Timer color={timeLeft < 300 ? 'error' : 'primary'} />
                <Typography 
                  variant="body2" 
                  color={timeLeft < 300 ? 'error' : 'text.secondary'}
                  sx={{ fontWeight: 600 }}
                >
                  Código expira en: {formatTime(timeLeft)}
                </Typography>
              </Box>
            </Box>

            {/* Mensajes */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert 
                severity="success" 
                sx={{ mb: 3 }}
                icon={<CheckCircle />}
              >
                {success}
              </Alert>
            )}

            {/* Campos de código */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" color="text.secondary" textAlign="center" mb={2}>
                Ingresa el código de 6 dígitos
              </Typography>
              
              <Grid container spacing={1} justifyContent="center">
                {code.map((digit, index) => (
                  <Grid item key={index}>
                    <TextField
                      inputRef={el => inputRefs.current[index] = el}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      inputProps={{
                        maxLength: 1,
                        style: {
                          textAlign: 'center',
                          fontSize: '1.5rem',
                          fontWeight: 600,
                          width: '50px',
                          height: '50px',
                          padding: 0,
                        }
                      }}
                      sx={{
                        width: '60px',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&.Mui-focused': {
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              borderWidth: 2,
                            }
                          }
                        }
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Botón de verificar */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={() => handleSubmit()}
              disabled={loading || code.some(digit => digit === '') || timeLeft <= 0}
              sx={{
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                background: timeLeft <= 0 ? 'linear-gradient(45deg, #9e9e9e, #757575)' : 'linear-gradient(45deg, #8C4EFF, #7113B8)',
                '&:hover': {
                  background: timeLeft <= 0 ? 'linear-gradient(45deg, #9e9e9e, #757575)' : 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                },
                borderRadius: 2,
                mb: 3,
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : timeLeft <= 0 ? (
                'Código Expirado'
              ) : (
                'Verificar Cuenta'
              )}
            </Button>

            {/* Reenviar código */}
            <Box textAlign="center" mb={3}>
              <Typography variant="body2" color="text.secondary" mb={1}>
                {timeLeft <= 0 ? '¡El código ha expirado!' : '¿No recibiste el código?'}
              </Typography>
              <Button
                variant="text"
                startIcon={resendLoading ? <CircularProgress size={16} /> : <Refresh />}
                onClick={handleResendCode}
                disabled={resendLoading || (timeLeft > 840 && timeLeft > 0)}
                sx={{
                  color: timeLeft <= 0 ? 'error.main' : 'primary.main',
                  fontWeight: 600,
                }}
              >
                {resendLoading ? 'Enviando...' : timeLeft <= 0 ? 'Solicitar Nuevo Código' : 'Reenviar código'}
              </Button>
              {timeLeft > 840 && timeLeft > 0 && (
                <Typography variant="caption" display="block" color="text.secondary" mt={1}>
                  Podrás reenviar el código en {formatTime(timeLeft - 840)}
                </Typography>
              )}
            </Box>

            {/* Volver */}
            <Box textAlign="center">
              <Button
                component={Link}
                to="/login"
                variant="outlined"
                startIcon={<ArrowBack />}
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.dark',
                    backgroundColor: 'primary.50',
                  },
                }}
              >
                Volver al login
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default VerifyAccount;