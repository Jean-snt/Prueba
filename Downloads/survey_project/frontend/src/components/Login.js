import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Person, Lock, Login as LoginIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { surveyAPI } from '../services/api';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error específico cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'El usuario o email es requerido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await surveyAPI.login({
        username: formData.username,
        password: formData.password,
      });

      if (response.data.success) {
        if (response.data.user && !response.data.user.is_active) {
          setError('No puedes iniciar sesión, tu cuenta está suspendida por 3 días debido a múltiples reportes.');
          return;
        }
        
        setSuccess(response.data.message);
        
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        
        setTimeout(() => {
          navigate('/encuestas');
        }, 1500);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.suspended) {
        setError('No puedes iniciar sesión, tu cuenta está suspendida por 3 días debido a múltiples reportes.');
        return;
      }
      
      if (err.response?.data?.error) {
        const errorMessage = err.response.data.error;
        const statusCode = err.response.status;
        
        if (statusCode === 404 || errorMessage.includes('no encontrado') || errorMessage.includes('eliminada')) {
          setError('Cuenta inexistente o eliminada');
          return;
        }
        
        if (statusCode === 401) {
          if (err.response.data.requires_verification) {
            setError('Cuenta no verificada. Por favor, ingresa tu código de verificación.');
            
            setTimeout(() => {
              navigate('/verify-account', { 
                state: { username: err.response.data.username || formData.username }
              });
            }, 2000);
          } else {
            setError('Credenciales inválidas. Verifica tu usuario y contraseña.');
          }
        } else if (statusCode === 400) {
          setError('Datos incorrectos. Verifica la información ingresada.');
        } else {
          setError(errorMessage);
        }
      } else {
        setError('Error de conexión. Verifica tu internet e inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#7113B8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
            {/* Header con logo Cuestom */}
            <Box textAlign="center" mb={5}>
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '3rem', md: '4rem' },
                  background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2,
                }}
              >
                Cuestom
              </Typography>
              <Typography variant="h5" color="text.secondary" gutterBottom>
                Bienvenido de vuelta
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Inicia sesión para continuar
              </Typography>
            </Box>

            {/* Mensajes de error y éxito */}
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

            {/* Formulario */}
            <form onSubmit={handleSubmit}>
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="Usuario o Email"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  error={!!errors.username}
                  helperText={errors.username}
                  required
                  size="large"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: 'action.active' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 4 }}>
                <TextField
                  fullWidth
                  label="Contraseña"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password}
                  required
                  size="large"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: 'action.active' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label="toggle password visibility"
                          sx={{ mr: 0 }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                sx={{
                  py: 2,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                  },
                  borderRadius: 2,
                  mb: 4,
                }}
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

            {/* Link de recuperación de contraseña */}
            <Box textAlign="center" mb={3}>
              <Button
                component={Link}
                to="/forgot-password"
                variant="text"
                sx={{
                  color: '#8C4EFF',
                  textDecoration: 'underline',
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.04)',
                  },
                }}
              >
                ¿Olvidaste tu contraseña?
              </Button>
            </Box>

            {/* Link a registro */}
            {/* Registro */}
            <Box textAlign="center">
              <Typography variant="body1" color="text.secondary" mb={2}>
                ¿No tienes cuenta?
              </Typography>
              <Button
                component={Link}
                to="/register"
                variant="outlined"
                size="large"
                fullWidth
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderColor: '#8C4EFF',
                  color: '#8C4EFF',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: '#5a6fd8',
                    backgroundColor: 'rgba(102, 126, 234, 0.04)',
                  },
                }}
              >
                Crear cuenta en Cuestom
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;