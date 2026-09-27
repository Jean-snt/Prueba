import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Container,
  Chip,
  Switch,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  Assessment, 
  Send, 
  CheckCircle, 
  Warning
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';
import LoginRequiredModal from './LoginRequiredModal';
import './SurveyForm.css';

const SurveyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  
  // Estados para creación de encuesta (SIMPLIFICADO)
  const [isCreating] = useState(!id);
  const [surveyTitle, setSurveyTitle] = useState('');
  const [generalComment, setGeneralComment] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isNSFW, setIsNSFW] = useState(false); // ← NUEVO campo NSFW
  const [expiresIn, setExpiresIn] = useState(''); // ✅ NUEVO: Auto-destrucción VIP
  const [creatorIdentity, setCreatorIdentity] = useState({
    showRealName: true,
    gender: '',
    age: '',
    country: 'PE'  // Default
  });
  const [ageError, setAgeError] = useState('');
  const [userSurveys, setUserSurveys] = useState([]);
  
  // Estados para identidad dinámica al responder (NUEVO)
  const [responseIdentity, setResponseIdentity] = useState({
    gender: '',
    age: '',
    showRealName: true
  });
  
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [loginRequiredModal, setLoginRequiredModal] = useState(false);

  // Obtener usuario actual
  const [currentUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // ✅ PROTECCIÓN DE AUTENTICACIÓN: Redirigir a login si no está autenticado
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // ✅ NUEVO: Verificar si el usuario está logueado al cargar el componente
  useEffect(() => {
    if (!currentUser && !id) {
      // Si no hay usuario y está intentando crear una encuesta nueva
      setLoginRequiredModal(true);
    }
  }, [currentUser, id]);

  const fetchSurveyDetails = useCallback(async () => {
    // VERIFICAR QUE ID EXISTE ANTES DE HACER LA PETICIÓN
    if (!id || id === 'undefined') {
      setError('ID de encuesta no válido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await surveyAPI.getSurvey(id);
      setSurvey(response.data.survey);
      setQuestions(response.data.questions);
    } catch (err) {
      setError('Error al cargar la encuesta');
      console.error('Error fetching survey details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadUserProfile = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      // Cargar perfil del usuario para obtener país Y GÉNERO
      const profileResponse = await surveyAPI.getUserProfile();
      const profile = profileResponse.data.profile;
      
      if (isCreating) {
        // Modo creación: cargar en creatorIdentity
        setCreatorIdentity(prev => ({
          ...prev,
          country: profile.country || 'PE', // Default a Perú
          gender: profile.gender || '', // ← CRÍTICO: Cargar género del perfil
          age: profile.age || '' // ← También cargar edad
        }));
      } else {
        // Modo respuesta: cargar en responseIdentity
        setResponseIdentity(prev => ({
          ...prev,
          gender: profile.gender || '', // ← Cargar género del perfil
          age: profile.age || '' // ← También cargar edad
        }));
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      if (isCreating) {
        setCreatorIdentity(prev => ({
          ...prev,
          country: 'PE', // Default a Perú
          gender: '', // ← Mantener vacío si hay error
          age: ''
        }));
      } else {
        setResponseIdentity(prev => ({
          ...prev,
          gender: '', // ← Mantener vacío si hay error
          age: ''
        }));
      }
    }
  }, [currentUser, isCreating]);

  const loadUserSurveys = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const response = await surveyAPI.getUserSurveys(5); // Últimas 5 encuestas
      setUserSurveys(response.data.surveys || []);
    } catch (err) {
      console.error('Error loading user surveys:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isCreating) {
      // Modo creación: cargar perfil del usuario y sus encuestas
      loadUserProfile();
      loadUserSurveys();
    } else {
      // Modo edición/respuesta: cargar detalles de la encuesta Y perfil del usuario
      if (id && id !== 'undefined') {
        fetchSurveyDetails();
        if (currentUser) {
          loadUserProfile(); // ← NUEVO: Cargar perfil también en modo respuesta
        }
      } else {
        setError('ID de encuesta no proporcionado');
        setLoading(false);
      }
    }
  }, [id, isCreating, fetchSurveyDetails, loadUserProfile, loadUserSurveys, currentUser]);

  const handleInputChange = (questionId, value) => {
    setFormData(prev => ({
      ...prev,
      [`question_${questionId}`]: value
    }));
  };

  const handleCheckboxChange = (questionId, choiceId, checked) => {
    setFormData(prev => {
      const currentValues = prev[`question_${questionId}`] || [];
      if (checked) {
        return {
          ...prev,
          [`question_${questionId}`]: [...currentValues, choiceId]
        };
      } else {
        return {
          ...prev,
          [`question_${questionId}`]: currentValues.filter(id => id !== choiceId)
        };
      }
    });
  };

  const handleAgeChange = (value) => {
    const age = parseInt(value);
    setCreatorIdentity(prev => ({
      ...prev,
      age: value
    }));
    
    if (value && (age < 18 || age > 45)) {
      setAgeError('La edad debe estar entre 18 y 45 años');
    } else {
      setAgeError('');
    }
  };

  const handleContentChange = (val) => {
    if (val.length <= 1000) {
      setGeneralComment(val);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Verificar que sea una imagen
      if (file.type.startsWith('image/')) {
        setSelectedImage(file);
      } else {
        setError('Solo se permiten archivos de imagen (PNG, JPG)');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      if (isCreating) {
        // Validar campos requeridos
        if (!creatorIdentity.gender || !creatorIdentity.age || ageError) {
          setError('Por favor completa todos los campos requeridos correctamente');
          return;
        }
        
        // Crear nueva encuesta
        const formData = new FormData();
        formData.append('title', surveyTitle.trim() || 'Encuesta sin título');
        formData.append('description', generalComment.trim());
        formData.append('creator_identity', JSON.stringify(creatorIdentity));
        formData.append('is_nsfw', isNSFW); // ← NUEVO campo NSFW
        
        // ✅ NUEVO: Auto-destrucción VIP
        if (expiresIn && currentUser?.is_vip) {
          formData.append('expires_in', expiresIn);
        }
        
        if (selectedImage && currentUser?.is_vip) {
          formData.append('image', selectedImage);
        }
        
        const response = await surveyAPI.createSurveyWithImage(formData);
        
        // Recargar encuestas del usuario
        loadUserSurveys();
        
        // Limpiar formulario
        setSurveyTitle('');
        setGeneralComment('');
        setSelectedImage(null);
        setIsNSFW(false); // ← Limpiar campo NSFW
        setExpiresIn(''); // ✅ NUEVO: Limpiar auto-destrucción
        setCreatorIdentity({
          showRealName: true,
          gender: '',
          age: '',
          country: creatorIdentity.country // Mantener país
        });
        setAgeError('');
        
        setShowSuccessDialog(true);
      } else {
        // Enviar respuesta a encuesta existente
        const submitData = {
          ...formData,
          general_comment: generalComment,
          // ✅ NUEVO: Incluir identidad dinámica
          response_identity: responseIdentity
        };
        
        await surveyAPI.submitResponse(id, submitData);
        setShowSuccessDialog(true);
      }
    } catch (err) {
      // Manejo específico de error 403 (límite VIP)
      if (err.response?.status === 403) {
        const errorData = err.response?.data;
        const errorMessage = errorData?.error || 'Has alcanzado el límite de 6 encuestas diarias. ¡Sube a VIP para creación ilimitada!';
        
        setError(
          <Box>
            <Typography variant="body1" color="error" gutterBottom sx={{ fontWeight: 600 }}>
              {errorMessage}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/vip"
              sx={{ mt: 2 }}
              startIcon={<Warning />}
            >
              Ver Planes VIP
            </Button>
          </Box>
        );
      } else if (err.response?.data?.error) {
        // Mostrar error específico del backend
        setError(err.response.data.error);
      } else {
        // Error genérico
        setError(isCreating ? 'Error al crear la encuesta' : 'Error al enviar la respuesta');
      }
      console.error('Error submitting:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    if (isCreating) {
      // Mantener en la página de creación para crear más encuestas
      setError(null);
    } else {
      navigate('/encuestas');
    }
  };

  // Opciones para los selectores
  const genderOptions = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' },
    { value: 'A', label: 'Anónimo' },
  ];

  const countryOptions = [
    { code: 'PE', name: 'Perú' },
    { code: 'MX', name: 'México' },
    { code: 'CO', name: 'Colombia' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'PA', name: 'Panamá' },
    { code: 'SV', name: 'El Salvador' },
    { code: 'HN', name: 'Honduras' },
    { code: 'CR', name: 'Costa Rica' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'NI', name: 'Nicaragua' },
    { code: 'US', name: 'Estados Unidos' },
    { code: 'ES', name: 'España' },
  ];

  const renderQuestion = (question, index) => {
    const questionKey = `question_${question.id}`;
    const value = formData[questionKey] || '';

    switch (question.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            label={question.text}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            variant="outlined"
            sx={{ mt: 2 }}
          />
        );

      case 'radio':
        return (
          <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
            <FormLabel component="legend">{question.text}</FormLabel>
            <RadioGroup
              value={value}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
            >
              {question.choices.map((choice) => (
                <FormControlLabel
                  key={choice.id}
                  value={choice.id}
                  control={<Radio />}
                  label={choice.text}
                />
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'checkbox':
        return (
          <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
            <FormLabel component="legend">{question.text}</FormLabel>
            <FormGroup>
              {question.choices.map((choice) => (
                <FormControlLabel
                  key={choice.id}
                  control={
                    <Checkbox
                      checked={value.includes(choice.id)}
                      onChange={(e) => handleCheckboxChange(question.id, choice.id, e.target.checked)}
                    />
                  }
                  label={choice.text}
                />
              ))}
            </FormGroup>
          </FormControl>
        );

      case 'select':
        return (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>{question.text}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              label={question.text}
            >
              {question.choices.map((choice) => (
                <MenuItem key={choice.id} value={choice.id}>
                  {choice.text}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'scale':
        return (
          <Box sx={{ mt: 3, width: '100%' }}>
            <Typography gutterBottom>{question.text}</Typography>
            <Box sx={{ px: 3 }}>
              <Slider
                value={value || 3}
                onChange={(e, newValue) => handleInputChange(question.id, newValue)}
                min={1}
                max={5}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 2, label: '2' },
                  { value: 3, label: '3' },
                  { value: 4, label: '4' },
                  { value: 5, label: '5' },
                ]}
                valueLabelDisplay="auto"
              />
              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography variant="caption" color="text.secondary">Muy malo</Typography>
                <Typography variant="caption" color="text.secondary">Muy bueno</Typography>
              </Box>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ 
      backgroundColor: '#7113B8',
      minHeight: '100vh',
      py: 3
    }}>
      <Container maxWidth="md">
        {/* Header */}
        <Card sx={{ 
          mb: 3, 
          borderRadius: 3,
          backgroundColor: '#ffffff !important',
          opacity: 1,
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
            border: '2px solid #ffffff',
            backgroundColor: '#ffffff !important',
            opacity: 1
          }
        }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2} justifyContent="center">
              <Assessment sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
              <Box textAlign="center">
                <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                  {isCreating ? 'Crear Nueva Encuesta' : survey?.title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {isCreating 
                    ? 'Comparte tu opinión con la comunidad de Cuestom'
                    : survey?.description
                  }
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Formulario principal */}
        {isCreating ? (
          /* MODO CREACIÓN - Vista vertical simplificada */
          <Card sx={{ 
            borderRadius: 3,
            border: '1px solid #e0e0e0',
            backgroundColor: '#ffffff !important',
            opacity: 1,
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              border: '2px solid #ffffff'
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: '#e0e0e0' },
              '&:hover fieldset': { borderColor: '#7113B8' },
              '&.Mui-focused fieldset': { borderColor: '#7113B8' }
            }
          }}>
            <CardContent sx={{ p: 4 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {/* Sección 1: Identidad del Creador */}
              <Paper sx={{ 
                p: 3, 
                mb: 4, 
                bgcolor: '#f8f9fa', 
                borderRadius: 2,
                backgroundColor: '#ffffff !important',
                opacity: 1
              }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#333' }}>
                  Tu Identidad en esta Encuesta
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configura cómo quieres aparecer como creador
                </Typography>

                <Grid container spacing={3}>
                  {/* Nombre */}
                  <Grid item xs={12}>
                    <FormControl component="fieldset" sx={{ width: '100%' }}>
                      <FormLabel component="legend">Mostrar nombre</FormLabel>
                      <RadioGroup
                        value={creatorIdentity.showRealName}
                        onChange={(e) => setCreatorIdentity(prev => ({
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

                  {/* Género y Edad en la misma fila con más espacio */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Género</InputLabel>
                      <Select
                        value={creatorIdentity.gender}
                        onChange={(e) => setCreatorIdentity(prev => ({
                          ...prev,
                          gender: e.target.value
                        }))}
                        label="Género"
                        sx={{ 
                          minHeight: '56px',
                          minWidth: '200px',
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

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Edad"
                      value={creatorIdentity.age}
                      onChange={(e) => handleAgeChange(e.target.value)}
                      inputProps={{ min: 18, max: 45 }}
                      error={!!ageError}
                      helperText={ageError || 'Entre 18 y 45 años'}
                      sx={{ minHeight: '56px' }}
                    />
                  </Grid>

                  {/* País (campo de texto plano, sin dropdown) */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="País"
                      value={countryOptions.find(c => c.code === creatorIdentity.country)?.name || 'Perú'}
                      disabled
                      sx={{
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#666',
                          color: '#666'
                        },
                        '& .MuiOutlinedInput-root.Mui-disabled': {
                          backgroundColor: '#f5f5f5'
                        }
                      }}
                      helperText="País obtenido de tu perfil"
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Sección 2: Información de la Encuesta */}
              <Paper sx={{ 
                p: 3, 
                mb: 4, 
                bgcolor: '#fff', 
                borderRadius: 2, 
                border: '1px solid #e0e0e0',
                backgroundColor: '#ffffff !important',
                opacity: 1
              }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#333' }}>
                  Información de la Encuesta
                </Typography>
                
                <TextField
                  fullWidth
                  label="Título de la encuesta (opcional)"
                  value={surveyTitle}
                  onChange={(e) => setSurveyTitle(e.target.value)}
                  variant="outlined"
                  inputProps={{ maxLength: 50 }}
                  sx={{ mb: 3 }}
                  placeholder="Ej: ¿Cuál es tu opinión sobre...?"
                  helperText={`${surveyTitle.length}/50 caracteres`}
                />

                <Box sx={{ position: 'relative', mb: 3 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Contenido principal de la encuesta"
                    value={generalComment}
                    onChange={(e) => handleContentChange(e.target.value)}
                    variant="outlined"
                    required
                    placeholder="Escribe tu pregunta principal o el tema que quieres discutir..."
                    helperText="Este será el contenido principal de tu encuesta"
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
                      color: generalComment.length >= 1000 ? '#f44336' : '#666',
                      fontWeight: generalComment.length >= 1000 ? 'bold' : 'normal',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    {generalComment.length}/1000
                  </Typography>
                </Box>

                {/* Switch NSFW */}
                <Box sx={{ mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isNSFW}
                        onChange={(e) => setIsNSFW(e.target.checked)}
                        color="warning"
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Warning sx={{ fontSize: 18, color: 'warning.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Contenido sensible / NSFW
                        </Typography>
                      </Box>
                    }
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block' }}>
                    Marca esta opción si tu encuesta contiene contenido para adultos o sensible
                  </Typography>
                </Box>

                {/* ✅ NUEVO: Auto-destrucción VIP con FOMO para usuarios comunes */}
                <Box sx={{ mb: 3 }}>
                  <FormControl fullWidth disabled={!currentUser?.is_vip}>
                    <InputLabel>
                      Auto-destrucción (FOMO) {!currentUser?.is_vip && '🔒'}
                    </InputLabel>
                    <Select
                      value={expiresIn}
                      onChange={(e) => setExpiresIn(e.target.value)}
                      label={`Auto-destrucción (FOMO) ${!currentUser?.is_vip ? '🔒' : ''}`}
                    >
                      <MenuItem value="24h">24 horas</MenuItem>
                      <MenuItem value="48h">48 horas</MenuItem>
                      <MenuItem value="72h">72 horas</MenuItem>
                    </Select>
                  </FormControl>
                  {currentUser?.is_vip ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      ⏰ Beneficio VIP: Tu encuesta se eliminará automáticamente después del tiempo seleccionado
                    </Typography>
                  ) : (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, fontWeight: 600, color: '#757575' }}>
                      🔒 Función exclusiva para Miembros VIP. ¡<Link to="/vip" style={{ color: '#757575', textDecoration: 'underline' }}>Actualiza tu plan</Link>!
                    </Typography>
                  )}
                </Box>

                {/* Función multimedia VIP */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Multimedia (Exclusivo VIP)
                  </Typography>
                  
                  {currentUser?.is_vip ? (
                    <Box>
                      <input
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        id="image-upload"
                        type="file"
                        onChange={handleImageUpload}
                      />
                      <label htmlFor="image-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<Assessment />}
                          sx={{ mr: 2 }}
                        >
                          Subir Imagen
                        </Button>
                      </label>
                      {selectedImage && (
                        <Chip
                          label={selectedImage.name}
                          onDelete={() => setSelectedImage(null)}
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  ) : (
                    <Box>
                      <Button
                        variant="outlined"
                        disabled
                        startIcon={<Assessment />}
                        onClick={() => setError('Función exclusiva para Miembros VIP')}
                      >
                        Subir Imagen
                      </Button>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                        Función exclusiva para Miembros VIP
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>

              {/* Botón de Publicar */}
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubmit}
                  disabled={submitting || !creatorIdentity.gender || !creatorIdentity.age || ageError || !generalComment.trim()}
                  startIcon={submitting ? <CircularProgress size={20} /> : <Send />}
                  sx={{
                    py: 2,
                    px: 6,
                    borderRadius: 3,
                    backgroundColor: '#7113B8 !important', // Color sólido Cuestom
                    backgroundImage: 'none !important',    // Eliminamos gradientes que causan el flash
                    color: 'white',
                    border: '2px solid transparent',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: '#8C4EFF !important', // Cambio de tono sólido suave
                      border: '2px solid #ffffff !important', // Borde blanco firme
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                    },
                  }}
                >
                  {submitting ? 'Publicando...' : 'Publicar Encuesta'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          /* MODO RESPUESTA - Código existente simplificado */
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                  <CircularProgress size={60} />
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              ) : !survey || !survey.is_active ? (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Esta encuesta no está disponible para responder
                </Alert>
              ) : (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Responder Encuesta
                  </Typography>
                  {questions.map((question, index) => (
                    <Box key={question.id} sx={{ mb: 4, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      {renderQuestion(question, index)}
                    </Box>
                  ))}
                  
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Comentario general (opcional)"
                    value={generalComment}
                    onChange={(e) => setGeneralComment(e.target.value)}
                    variant="outlined"
                    sx={{ mt: 3, mb: 3 }}
                  />

                  {/* ✅ NUEVO: Formulario de Identidad Dinámica */}
                  {currentUser && (
                    <Paper sx={{ 
                      p: 3, 
                      mb: 3, 
                      bgcolor: '#f8f9fa', 
                      borderRadius: 2,
                      backgroundColor: '#ffffff !important',
                      opacity: 1
                    }}>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#333' }}>
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
                  )}

                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={20} /> : <Send />}
                    sx={{ mt: 2 }}
                  >
                    {submitting ? 'Enviando...' : 'Enviar Respuesta'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dialog de éxito */}
        <Dialog open={showSuccessDialog} onClose={handleSuccessClose}>
          <DialogTitle>
            <Box display="flex" alignItems="center">
              <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
              {isCreating ? '¡Encuesta Creada!' : '¡Respuesta Enviada!'}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography>
              {isCreating 
                ? 'Tu encuesta ha sido creada exitosamente y ya está disponible para la comunidad.'
                : 'Gracias por completar la encuesta. Tu respuesta ha sido registrada exitosamente.'
              }
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSuccessClose} variant="contained">
              Continuar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Feed de Encuestas Recientes (solo para usuarios VIP con suscripción activa) */}
        {isCreating && userSurveys.length > 0 && currentUser?.is_vip && (
          <Card sx={{ 
            mt: 4, 
            borderRadius: 3,
            backgroundColor: '#ffffff !important',
            opacity: 1
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Tus Encuestas Recientes (VIP)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Historial exclusivo para miembros VIP con suscripción activa
              </Typography>
              
              {userSurveys.map((userSurvey) => (
                <Paper 
                  key={userSurvey.id} 
                  sx={{ 
                    p: 2, 
                    mb: 2, 
                    border: '1px solid', 
                    borderColor: 'divider',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      cursor: 'pointer'
                    }
                  }}
                  onClick={() => navigate(`/encuestas/${userSurvey.id}`)}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="start">
                    <Box flexGrow={1}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        {userSurvey.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {userSurvey.description}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Chip 
                          label={`${userSurvey.response_count || 0} respuestas`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Typography variant="caption" color="text.secondary">
                          Creada: {new Date(userSurvey.created_at).toLocaleDateString('es-ES')}
                        </Typography>
                        <Chip 
                          label={userSurvey.is_active ? 'Activa' : 'Inactiva'}
                          size="small"
                          color={userSurvey.is_active ? 'success' : 'default'}
                        />
                      </Box>
                    </Box>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/encuestas/${userSurvey.id}/results`);
                      }}
                      title="Ver resultados"
                    >
                      <Assessment />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
              
              <Button
                component={Link}
                to="/profile"
                variant="outlined"
                sx={{ mt: 2 }}
              >
                Ver todas mis encuestas
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ✅ NUEVO: Modal de Login Requerido */}
        <LoginRequiredModal
          open={loginRequiredModal}
          onClose={() => {
            setLoginRequiredModal(false);
            // Redirigir a la lista de encuestas si cierra el modal
            if (!currentUser && !id) {
              navigate('/encuestas');
            }
          }}
          action="crear encuestas"
        />
      </Container>
    </Box>
  );
};

export default SurveyForm;