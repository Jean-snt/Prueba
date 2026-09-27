import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import {
  Close,
  Login,
  PersonAdd,
  Lock,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const LoginRequiredModal = ({ open, onClose, action = 'participar' }) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    onClose();
    navigate('/login');
  };

  const handleRegister = () => {
    onClose();
    navigate('/register');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'visible',
        }
      }}
    >
      {/* Botón de cerrar */}
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: 'grey.500',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          }
        }}
      >
        <Close />
      </IconButton>

      {/* Icono decorativo */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          pt: 4,
          pb: 2,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
          }}
        >
          <Lock sx={{ fontSize: 40, color: 'white' }} />
        </Box>
      </Box>

      <DialogTitle sx={{ 
        textAlign: 'center',
        fontWeight: 700,
        fontSize: '1.75rem',
        color: '#333',
        pt: 2,
        pb: 1,
      }}>
        Inicia Sesión para Continuar
      </DialogTitle>

      <DialogContent sx={{ px: 4, pb: 2 }}>
        <Typography 
          variant="body1" 
          sx={{ 
            textAlign: 'center',
            color: '#666',
            fontSize: '1.1rem',
            lineHeight: 1.6,
            mb: 3,
          }}
        >
          Para <strong>{action}</strong> necesitas tener una cuenta en Cuestom.
        </Typography>

        <Box
          sx={{
            backgroundColor: 'rgba(102, 126, 234, 0.08)',
            borderRadius: 3,
            p: 3,
            border: '1px solid rgba(102, 126, 234, 0.2)',
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#555',
              fontSize: '0.95rem',
              lineHeight: 1.7,
              mb: 1,
            }}
          >
            ✨ <strong>Con una cuenta puedes:</strong>
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 0 }}>
            <Typography component="li" variant="body2" sx={{ color: '#555', mb: 0.5 }}>
              Crear encuestas ilimitadas
            </Typography>
            <Typography component="li" variant="body2" sx={{ color: '#555', mb: 0.5 }}>
              Votar y comentar en encuestas
            </Typography>
            <Typography component="li" variant="body2" sx={{ color: '#555', mb: 0.5 }}>
              Ver resultados en tiempo real
            </Typography>
            <Typography component="li" variant="body2" sx={{ color: '#555' }}>
              Acceder a estadísticas avanzadas
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 4, pt: 2, gap: 2, flexDirection: 'column' }}>
        <Button
          onClick={handleLogin}
          variant="contained"
          fullWidth
          size="large"
          startIcon={<Login />}
          sx={{
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 700,
            borderRadius: 3,
            background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
            '&:hover': {
              background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
              boxShadow: '0 12px 32px rgba(102, 126, 234, 0.6)',
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          Iniciar Sesión
        </Button>

        <Box sx={{ width: '100%', textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
            ¿No tienes cuenta?
          </Typography>
          <Button
            onClick={handleRegister}
            variant="outlined"
            fullWidth
            size="large"
            startIcon={<PersonAdd />}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 3,
              borderColor: '#8C4EFF',
              color: '#8C4EFF',
              '&:hover': {
                borderColor: '#5a6fd8',
                backgroundColor: 'rgba(102, 126, 234, 0.08)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            Crear Cuenta Gratis
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default LoginRequiredModal;
