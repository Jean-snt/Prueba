import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Paper,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Send, Person } from '@mui/icons-material';
import { surveyAPI } from '../services/api';

const ResponseForm = ({ surveyId, currentUser, onResponseSubmitted }) => {
  const [responseContent, setResponseContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  
  // Estados para identidad dinámica
  const [responseIdentity, setResponseIdentity] = useState({
    gender: '',
    age: '',
    showRealName: true
  });

  // Opciones para los selectores
  const genderOptions = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' },
    { value: 'A', label: 'Anónimo' },
  ];

  // Cargar perfil del usuario al montar el componente
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentUser) return;
      
      try {
        const profileResponse = await surveyAPI.getUserProfile();
        const profile = profileResponse.data.profile;
        
        setResponseIdentity(prev => ({
          ...prev,
          gender: profile.gender || '',
          age: profile.age || ''
        }));
      } catch (err) {
        console.error('Error loading user profile:', err);
      }
    };

    loadUserProfile();
  }, [currentUser]);

  const handleContentChange = (value) => {
    if (value.length <= 1000) {
      setResponseContent(value);
      setCharacterCount(value.length);
    }
  };

  const handleSubmitResponse = async () => {
    if (!responseContent.trim()) {
      setError('Por favor escribe tu respuesta');
      return;
    }

    if (!responseIdentity.gender || !responseIdentity.age) {
      setError('Por favor completa tu información de identidad');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Enviar respuesta usando el endpoint de submit response
      const submitData = {
        general_comment: responseContent.trim(),
        response_identity: responseIdentity
      };

      await surveyAPI.submitResponse(surveyId, submitData);
      
      // Limpiar formulario
      setResponseContent('');
      setCharacterCount(0);
      setResponseIdentity(prev => ({
        ...prev,
        gender: prev.gender, // Mantener género
        age: prev.age, // Mantener edad
        showRealName: true // Reset a mostrar nombre
      }));

      // Notificar al componente padre que se envió una respuesta
      if (onResponseSubmitted) {
        onResponseSubmitted();
      }

    } catch (err) {
      console.error('Error submitting response:', err);
      setError('Error al enviar la respuesta. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box textAlign="center" py={4}>
            <Person sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Inicia sesión para responder
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Necesitas una cuenta para participar en esta encuesta
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          💬 Deja tu Respuesta
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Formulario de Identidad Dinámica */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#333' }}>
            Tu Identidad para esta Respuesta
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configura cómo quieres aparecer en esta respuesta específica
          </Typography>

          <Grid container spacing={3}>
            {/* Mostrar nombre real */}
            <Grid item xs={12}>
              <FormControl component="fieldset" sx={{ width: '100%' }}>
                <FormLabel component="legend">Mostrar nombre</FormLabel>
                <RadioGroup
                  value={responseIdentity.showRealName}
                  onChange={(e) => setResponseIdentity(prev => ({
                    ...prev,
                    showRealName: e.target.value === 'true'
                  }))}
                  row
                >
                  <FormControlLabel
                    value={true}
                    control={<Radio />}
                    label={`Mi nombre (${currentUser?.username})`}
                  />
                  <FormControlLabel
                    value={false}
                    control={<Radio />}
                    label="Anónimo"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* Género */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Género</InputLabel>
                <Select
                  value={responseIdentity.gender}
                  onChange={(e) => setResponseIdentity(prev => ({
                    ...prev,
                    gender: e.target.value
                  }))}
                  label="Género"
                  sx={{ 
                    minHeight: '56px',
                    '& .MuiSelect-select': {
                      paddingRight: '32px !important'
                    }
                  }}
                >
                  {genderOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Edad */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Edad"
                value={responseIdentity.age}
                onChange={(e) => setResponseIdentity(prev => ({
                  ...prev,
                  age: e.target.value
                }))}
                inputProps={{ min: 18, max: 100 }}
                helperText="Edad que quieres mostrar en esta respuesta"
                sx={{ minHeight: '56px' }}
              />
            </Grid>
          </Grid>
        </Paper>

        <Divider sx={{ mb: 3 }} />

        {/* Campo de respuesta */}
        <Box sx={{ position: 'relative', mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Tu respuesta a esta encuesta"
            value={responseContent}
            onChange={(e) => handleContentChange(e.target.value)}
            variant="outlined"
            placeholder="Comparte tu opinión, experiencia o respuesta a esta encuesta..."
            inputProps={{
              maxLength: 1000,
            }}
            sx={{
              '& .MuiInputBase-inputMultiline': {
                resize: 'vertical',
                minHeight: '100px'
              }
            }}
          />
          <Typography 
            variant="caption" 
            sx={{ 
              position: 'absolute',
              bottom: 8,
              right: 12,
              color: characterCount > 900 ? '#f44336' : '#666',
              fontWeight: characterCount > 900 ? 'bold' : 'normal',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}
          >
            {characterCount}/1000
          </Typography>
        </Box>

        {/* Botón de envío */}
        <Box display="flex" justifyContent="center">
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmitResponse}
            disabled={submitting || !responseContent.trim() || !responseIdentity.gender || !responseIdentity.age}
            startIcon={submitting ? <CircularProgress size={20} /> : <Send />}
            sx={{
              py: 2,
              px: 6,
              fontSize: '1.1rem',
              fontWeight: 600,
              borderRadius: 3,
              background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                boxShadow: '0 6px 25px rgba(102, 126, 234, 0.4)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {submitting ? 'Enviando...' : 'Enviar Respuesta'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ResponseForm;