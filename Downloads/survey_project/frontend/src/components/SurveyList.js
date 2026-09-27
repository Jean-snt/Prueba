import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Button,
  Divider,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Fade,
  Pagination,
  Drawer,
  Fab,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Assessment,
  FilterList,
  TrendingUp,
  Visibility,
  Search,
  Clear,
  ExpandMore,
  ExpandLess,
  Leaderboard,
} from '@mui/icons-material';

import { Link } from 'react-router-dom';
import { surveyAPI } from '../services/api';
import SurveyCard from './SurveyCard';
import './SurveyList.css';

const SurveyList = () => {
  const [surveys, setSurveys] = useState([]);
  const [filteredSurveys, setFilteredSurveys] = useState([]);
  const [popularSurveys, setPopularSurveys] = useState([]);
  const [historicRanking, setHistoricRanking] = useState([]); // ✅ NUEVO: Ranking histórico
  const [showAllRanking, setShowAllRanking] = useState(false); // ✅ NUEVO: Estado para expandir ranking
  const [showRanking, setShowRanking] = useState(true); // ✅ NUEVO: Estado para mostrar/ocultar ranking
  const [rankingDrawerOpen, setRankingDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ✅ NUEVO: Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total_pages: 1,
    current_page: 1,
    total_count: 0,
    has_next: false,
    has_previous: false,
  });
  
  // Estados de filtros
  const [filters, setFilters] = useState({
    country: '',
    ageMin: '',  // ← CAMBIO: Edad mínima manual
    ageMax: '',  // ← CAMBIO: Edad máxima manual
    gender: '',
    showNSFW: false,
    timeRange: '',  // ✅ NUEVO: Filtro de fecha
  });
  
  // Obtener usuario actual del localStorage
  const [currentUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // Búsqueda optimizada con useMemo
  const searchedAndFilteredSurveys = useMemo(() => {
    let result = filteredSurveys;
    
    // Aplicar búsqueda por texto si hay término de búsqueda
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      result = result.filter(survey => 
        survey.title.toLowerCase().includes(searchLower) ||
        survey.description.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [filteredSurveys, searchTerm]);

  // Función de búsqueda optimizada con debounce
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // Opciones de filtros
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
  ];

  // ELIMINADO: Ya no usamos rangos predefinidos, ahora son inputs manuales

  const genderOptions = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' },
    { value: 'A', label: 'Anónimo' },  /* ✅ FIX: Opción Anónimo */
  ];

  // ✅ NUEVO: Opciones de rango de tiempo
  const timeRangeOptions = [
    { value: '', label: 'Todas las fechas' },
    { value: '24h', label: 'Últimas 24 horas' },
    { value: '3d', label: 'Últimos 3 días' },
    { value: '1w', label: 'Última semana' },
    { value: '1m', label: 'Último mes' },
    { value: '1y', label: 'Último año' },
  ];

  useEffect(() => {
    fetchSurveys();
    fetchHistoricRanking(); // ✅ NUEVO: Cargar ranking histórico
    fetchQuarterlyRanking(); // ✅ TEMPORADAS 2026: Cargar ranking trimestral
    
    // ✅ OPTIMIZADO: NO recargar toda la lista, solo actualizar rankings
    window.refreshRankings = () => {
      fetchHistoricRanking();
      fetchQuarterlyRanking();
    };
    
    // Cleanup
    return () => {
      delete window.refreshRankings;
    };
  }, []); // SOLO se ejecuta una vez al montar

  const fetchHistoricRanking = async () => {
    try {
      const response = await surveyAPI.getHistoricRanking();
      if (response.data && response.data.surveys) {
        setHistoricRanking(response.data.surveys);
      }
    } catch (err) {
      console.error('❌ Error cargando ranking histórico:', err);
    }
  };
  
  // ✅ TEMPORADAS 2026: Cargar ranking trimestral
  const fetchQuarterlyRanking = async () => {
    try {
      const response = await surveyAPI.getQuarterlyRanking();
      if (response.data && response.data.surveys) {
        setPopularSurveys(response.data.surveys);
      }
    } catch (err) {
      console.error('❌ Error cargando ranking trimestral:', err);
    }
  };

  const fetchSurveys = async (appliedFilters = {}, page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ NUEVO: Agregar página a los filtros
      const filtersWithPage = { ...appliedFilters, page };
      
      const response = await surveyAPI.getAllSurveys(filtersWithPage);
      
      if (response.data && response.data.surveys) {
        const surveysData = response.data.surveys;
        setSurveys(surveysData);
        setFilteredSurveys(surveysData);
        
        // ✅ NUEVO: Guardar información de paginación
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
        
        // ✅ TEMPORADAS 2026: Ya NO calculamos ranking aquí, viene del endpoint trimestral
        // El ranking se carga en fetchQuarterlyRanking()
      } else {
        console.warn('Estructura de respuesta inesperada:', response.data);
        setSurveys([]);
        setFilteredSurveys([]);
        setPopularSurveys([]);
      }
    } catch (err) {
      setError('Error al cargar las encuestas');
      setSurveys([]);
      setFilteredSurveys([]);
      setPopularSurveys([]);
    } finally {
      setLoading(false);
    }
  };

  // CRÍTICO: Función para aplicar filtros - SIN restricciones VIP
  const handleApplyFilters = async () => {
    try {
      setLoading(true);
      setError(null);
      setCurrentPage(1); // ✅ NUEVO: Resetear a página 1 al aplicar filtros

      // ✅ SIEMPRE aplicar filtros con API (incluye estado NSFW)
      await applyFiltersWithAPI(1); // ✅ NUEVO: Pasar página 1
      
    } catch (error) {
      setFilteredSurveys(surveys);
      setError('Error aplicando filtros');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersWithAPI = async (page = 1) => {
    try {
      setLoading(true);
      
      // CRÍTICO: Construir filtros base - incluir NSFW siempre
      const baseFilters = {};
      
      // ✅ CRÍTICO: Incluir showNSFW siempre (true o false) - USAR ESTADO ACTUAL
      baseFilters.showNSFW = filters.showNSFW;
      
      // Solo agregar country si tiene valor
      if (filters.country && filters.country.trim() !== '') {
        baseFilters.country = filters.country;
      }
      
      // Solo agregar gender si tiene valor
      if (filters.gender && filters.gender.trim() !== '') {
        baseFilters.gender = filters.gender;
      }

      // ✅ NUEVO: Agregar filtro de fecha si tiene valor
      if (filters.timeRange && filters.timeRange.trim() !== '') {
        baseFilters.time_range = filters.timeRange;
      }

      // CAMBIO: Usar edad manual en lugar de rangos
      if (filters.ageMin && filters.ageMin.trim() !== '') {
        const ageMin = parseInt(filters.ageMin);
        if (!isNaN(ageMin) && ageMin >= 18) {
          baseFilters.ageMin = ageMin;
        }
      }
      
      if (filters.ageMax && filters.ageMax.trim() !== '') {
        const ageMax = parseInt(filters.ageMax);
        if (!isNaN(ageMax) && ageMax <= 100) {
          baseFilters.ageMax = ageMax;
        }
      }

      // ✅ NUEVO: Agregar página
      baseFilters.page = page;

      // 🚀 DEBUG CRÍTICO: Mostrar exactamente qué se envía
      
      // Hacer la petición con los filtros limpios
      const response = await surveyAPI.getAllSurveys(baseFilters);
      
      if (response.data && response.data.surveys) {
        const surveysData = response.data.surveys;
        setFilteredSurveys(surveysData);
        
        // ✅ NUEVO: Actualizar paginación
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
        
        // Actualizar también surveys principales si es necesario
        if (!filters.country && !filters.ageRange && !filters.gender) {
          setSurveys(surveysData);
        }
      } else {
        console.warn('Estructura de respuesta inesperada:', response.data);
        setFilteredSurveys([]);
      }
    } catch (err) {
      setError('Error al aplicar filtros');
      setFilteredSurveys([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    // CRÍTICO: Todos los usuarios pueden cambiar filtros libremente
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      country: '',
      ageMin: '',  // ← CAMBIO: Limpiar edad mínima
      ageMax: '',  // ← CAMBIO: Limpiar edad máxima
      gender: '',
      showNSFW: false,
      timeRange: '',  // ✅ NUEVO: Limpiar filtro de fecha
    });
    setSearchTerm(''); // ← También limpiar búsqueda
    setCurrentPage(1); // ✅ NUEVO: Resetear a página 1
    // CRÍTICO: Restaurar encuestas originales al limpiar filtros
    setFilteredSurveys(surveys);
    setError(null);
  };

  // ✅ NUEVO: Función para cambiar de página
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    applyFiltersWithAPI(value);
    // Scroll suave hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReportSubmitted = () => {
    // Report submitted successfully
  };

  const handleSurveyDeleted = (deletedSurveyId, message) => {
    setSurveys(prev => prev.filter(survey => survey.id !== deletedSurveyId));
    setFilteredSurveys(prev => prev.filter(survey => survey.id !== deletedSurveyId));
    
    if (message) {
      const alertDiv = document.createElement('div');
      alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        font-family: 'Roboto', sans-serif;
        font-weight: 500;
      `;
      alertDiv.textContent = message;
      document.body.appendChild(alertDiv);
      
      setTimeout(() => {
        if (document.body.contains(alertDiv)) {
          document.body.removeChild(alertDiv);
        }
      }, 5000);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2">
            Verifica que el servidor Django esté ejecutándose en http://localhost:8000
          </Typography>
        </Box>
      </Alert>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      maxWidth: '1600px',
      mx: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      p: { xs: 1, md: 2 },
      backgroundColor: '#7113B8',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom 
          sx={{ 
            mb: 2,
            fontWeight: 800,
            color: '#FFFFFF', // ✅ CAMBIO: Texto blanco
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)', // ✅ Sombra para mejor legibilidad
            fontSize: { xs: '2rem', md: '3rem' },
          }}
        >
          Encuestas Disponibles
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            color: '#FFFFFF', // ✅ CAMBIO: Subtítulo blanco
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)', // ✅ Sombra para mejor legibilidad
          }}
        >
          Participa en nuestras encuestas y comparte tu opinión
        </Typography>
      </Box>

      {/* Barra de Filtros - Disponible para todos */}
      <Paper sx={{ 
        p: 3, 
        mb: 4, 
        borderRadius: 3, 
        bgcolor: '#FFFFFF',
        border: '1px solid #e0e0e0'
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <FilterList sx={{ color: 'primary.main' }} />
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600,
                color: '#333'
              }}
            >
              Filtros de Búsqueda
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3} alignItems="center">
          {/* Campo de Búsqueda */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar encuestas por título o descripción..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              inputProps={{ maxLength: 30 }} // ✅ NUEVO: Límite de 30 caracteres
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={clearSearch}
                      sx={{ color: 'text.secondary' }}
                    >
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ 
                bgcolor: 'white',
                minWidth: '300px',
                width: '100%', // ✅ NUEVO: Ancho completo para evitar deformación
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  paddingRight: '8px',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '12px 14px',
                }
              }}
            />
          </Grid>

          {/* Filtro de País */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>País</InputLabel>
              <Select
                value={filters.country}
                label="País"
                onChange={(e) => handleFilterChange('country', e.target.value)}
                sx={{ 
                  bgcolor: 'white',
                  minWidth: '140px', // ← Ancho mínimo mejorado
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0,0,0,0.23)'
                  },
                  '& .MuiSelect-select': {
                    padding: '12px 14px', // ← Padding mejorado
                    paddingRight: '32px !important' // ← Espacio para flecha
                  }
                }}
              >
                <MenuItem value="">Todos los países</MenuItem>
                {countryOptions.map((country) => (
                  <MenuItem key={country.code} value={country.code}>
                    {country.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Filtros de Edad Manual */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Edad Mínima"
              value={filters.ageMin}
              onChange={(e) => handleFilterChange('ageMin', e.target.value)}
              inputProps={{ min: 18, max: 100 }}
              sx={{ 
                bgcolor: 'white',
                minWidth: '120px',
                '& .MuiOutlinedInput-root': {
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '12px 14px',
                }
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Edad Máxima"
              value={filters.ageMax}
              onChange={(e) => handleFilterChange('ageMax', e.target.value)}
              inputProps={{ min: 18, max: 100 }}
              sx={{ 
                bgcolor: 'white',
                minWidth: '120px',
                '& .MuiOutlinedInput-root': {
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '12px 14px',
                }
              }}
            />
          </Grid>

          {/* Filtro de Género */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Género</InputLabel>
              <Select
                value={filters.gender}
                label="Género"
                onChange={(e) => handleFilterChange('gender', e.target.value)}
                sx={{ 
                  bgcolor: 'white',
                  minWidth: '140px', // ← Ancho mínimo mejorado
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0,0,0,0.23)'
                  },
                  '& .MuiSelect-select': {
                    padding: '12px 14px', // ← Padding mejorado
                    paddingRight: '32px !important' // ← Espacio para flecha
                  }
                }}
              >
                <MenuItem value="">Todos los géneros</MenuItem>
                {genderOptions.map((gender) => (
                  <MenuItem key={gender.value} value={gender.value}>
                    {gender.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* ✅ NUEVO: Filtro de Fecha */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Fecha</InputLabel>
              <Select
                value={filters.timeRange}
                label="Fecha"
                onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                sx={{ 
                  bgcolor: 'white',
                  minWidth: '160px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0,0,0,0.23)'
                  },
                  '& .MuiSelect-select': {
                    padding: '12px 14px',
                    paddingRight: '32px !important'
                  }
                }}
              >
                {timeRangeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Switch NSFW */}
          <Grid item xs={12} sm={6} md={2}>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.showNSFW}
                    onChange={(e) => handleFilterChange('showNSFW', e.target.checked)}
                    color="warning"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    NSFW
                  </Typography>
                }
              />
            </Box>
          </Grid>
        </Grid>

        {/* CRÍTICO: Botón Aplicar Filtros */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleApplyFilters}
            disabled={loading}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
              '&:hover': {
                background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
              }
            }}
          >
            {loading ? 'Aplicando...' : 'Aplicar Filtros'}
          </Button>
          
          {(filters.country || filters.ageMin || filters.ageMax || filters.gender || filters.timeRange || searchTerm) && (
            <Button 
              onClick={clearFilters}
              variant="outlined"
              sx={{ 
                px: 3,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600
              }}
            >
              Limpiar Todo
            </Button>
          )}
        </Box>
      </Paper>
      {/* Contenido principal con sidebar - Layout dinámico */}
      <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start', width: '100%', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        {/* Lista principal de encuestas - Ancho dinámico según showRanking */}
        <Box sx={{ flex: showRanking ? '1 1 66%' : '1 1 100%', minWidth: 0, transition: 'all 0.3s ease' }}>
          <Paper sx={{ 
            p: 3, 
            borderRadius: 3, 
            bgcolor: '#FFFFFF',
            border: '1px solid #e0e0e0'
          }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 600,
                  color: '#333'
                }}
              >
                Encuestas {searchTerm ? 'Encontradas' : (filters.country || filters.ageRange || filters.gender) ? 'Filtradas' : 'Disponibles'}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                {/* ✅ NUEVO: Botón para minimizar/maximizar ranking (solo desktop) */}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowRanking(!showRanking)}
                  startIcon={showRanking ? <ExpandLess /> : <ExpandMore />}
                  sx={{
                    display: { xs: 'none', md: 'inline-flex' },
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      borderColor: 'primary.dark',
                    }
                  }}
                >
                  {showRanking ? 'Ocultar Ranking' : 'Mostrar Ranking'}
                </Button>
                {searchTerm && (
                  <Chip 
                    label={`"${searchTerm}"`}
                    size="small"
                    onDelete={clearSearch}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {(filters.country || filters.ageRange || filters.gender || searchTerm) && (
                  <Chip 
                    label={`${searchedAndFilteredSurveys.length} resultados`}
                    color="primary"
                    size="small"
                  />
                )}
              </Box>
            </Box>

            {searchedAndFilteredSurveys.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchedAndFilteredSurveys.length} encuesta{searchedAndFilteredSurveys.length !== 1 ? 's' : ''} 
                {searchTerm ? ` encontrada${searchedAndFilteredSurveys.length !== 1 ? 's' : ''} para "${searchTerm}"` : ' disponible' + (searchedAndFilteredSurveys.length !== 1 ? 's' : '')}
              </Typography>
            )}
            
            {searchedAndFilteredSurveys.length === 0 ? (
              <Box textAlign="center" py={8} sx={{ width: '100%' }}> {/* ✅ NUEVO: width 100% */}
                <Assessment sx={{ fontSize: 120, color: 'grey.300', mb: 3 }} />
                <Typography 
                  variant="h5" 
                  color="text.secondary" 
                  gutterBottom
                  sx={{ color: '#666', wordBreak: 'break-word' }} // ✅ NUEVO: break-word
                >
                  {searchTerm 
                    ? `No se encontraron encuestas para "${searchTerm.length > 50 ? searchTerm.substring(0, 50) + '...' : searchTerm}"`
                    : (filters.country || filters.ageRange || filters.gender) 
                      ? 'No hay encuestas que coincidan con los filtros'
                      : 'No hay encuestas disponibles'
                  }
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary"
                  sx={{ color: '#666' }}
                >
                  {searchTerm || (filters.country || filters.ageRange || filters.gender)
                    ? 'Intenta ajustar los filtros o términos de búsqueda'
                    : 'Las encuestas aparecerán aquí cuando estén disponibles'
                  }
                </Typography>
              </Box>
            ) : (
              <Grid 
                container 
                spacing={{ xs: 2, md: 3 }} 
                justifyContent="center"
                alignItems="stretch"
                sx={{ 
                  width: '100%',
                  maxWidth: '1600px', 
                  mx: 'auto'
                }}
              >
                {searchedAndFilteredSurveys.map((survey) => (
                  <Grid 
                    item 
                    xs={12} 
                    sm={showRanking ? 12 : 6}  // ✅ NUEVO: Si ranking oculto, 2 columnas en sm
                    md={showRanking ? 6 : 6}   // ✅ NUEVO: Si ranking visible, 1 columna; si oculto, 2 columnas
                    lg={showRanking ? 4 : 3}   // ✅ NUEVO: Si ranking visible, 3 columnas; si oculto, 4 columnas
                    key={survey.id} 
                    sx={{ display: 'flex', width: '100%' }}
                  >
                    <Fade in={true} timeout={300}>
                      <Box sx={{ width: '100%', display: 'flex' }}>
                        <SurveyCard 
                          survey={survey}
                          currentUser={currentUser}
                          onReport={handleReportSubmitted}
                          onDelete={handleSurveyDeleted}
                        />
                      </Box>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            )}
            
            {/* ✅ NUEVO: Paginación Global */}
            {searchedAndFilteredSurveys.length > 0 && pagination.total_pages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={pagination.total_pages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontSize: '1rem',
                      fontWeight: 600,
                    },
                    '& .Mui-selected': {
                      background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
                      color: 'white',
                    },
                  }}
                />
              </Box>
            )}
          </Paper>
        </Box>

        {/* Sidebar de Ranking - Solo visible si showRanking es true */}
        {showRanking && (
          <Box id="rankings-container" sx={{ flex: '1 1 33%', minWidth: '300px', transition: 'all 0.3s ease', display: { xs: 'none', md: 'block' } }}>
            {/* Ranking Trimestral */}
            <Paper sx={{ 
              p: 3, 
              borderRadius: 3, 
              bgcolor: '#FFFFFF',
              border: '1px solid #e0e0e0',
              position: 'relative',
              display: 'block',
            }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600, 
                mb: 3,
                color: '#333'
              }}
            >
              🏆 Ranking - Top {showAllRanking ? '10' : '5'}
            </Typography>
            
            {popularSurveys.length === 0 ? (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666', 
                  textAlign: 'center', 
                  py: 2 
                }}
              >
                No hay tendencias disponibles aún
              </Typography>
            ) : (
              <Box>
                {popularSurveys.slice(0, showAllRanking ? 10 : 5).map((survey, index) => (
                  <Box key={survey.id} sx={{ mb: index < popularSurveys.length - 1 ? 2 : 0, overflow: 'hidden' }}>
                    <Box display="flex" alignItems="center" gap={2} sx={{ flexWrap: 'nowrap' }}>
                      <Box 
                        sx={{ 
                          minWidth: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: index === 0 ? 'linear-gradient(45deg, #ffd700, #ffed4e)' : 
                                     index === 1 ? 'linear-gradient(45deg, #c0c0c0, #e8e8e8)' :
                                     index === 2 ? 'linear-gradient(45deg, #cd7f32, #daa520)' :
                                     'linear-gradient(45deg, #8C4EFF, #7113B8)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: index <= 2 ? '#333' : 'white',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          flexShrink: 0,
                        }}
                      >
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </Box>
                      <Box flexGrow={1} sx={{ minWidth: 0, overflow: 'hidden' }}>
                        <Typography 
                          variant="body2"
                          component={Link}
                          to={`/encuestas/${survey.id}`}
                          sx={{ 
                            fontWeight: 500,
                            color: '#333',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                            mb: 0.5,
                            textDecoration: 'none',
                            cursor: 'pointer',
                            '&:hover': { color: '#8C4EFF', textDecoration: 'underline' },
                          }}
                        >
                          {survey.title}
                        </Typography>
                        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} sx={{ flexWrap: 'nowrap' }}>
                          {/* Columna Izquierda: Estadísticas y Puntos */}
                          <Box display="flex" alignItems="center" gap={1} sx={{ flexShrink: 0 }}>
                            <TrendingUp sx={{ fontSize: 14, color: '#666' }} />
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: '#666', 
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {survey.response_count || 0} resp | {survey.likes_count || 0} likes | {survey.total_score || 0} pts
                            </Typography>
                          </Box>
                          {/* Columna Derecha: Autor */}
                          {survey.creator && (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: '#666',
                                fontSize: survey.creator.username.length > 15 ? '0.7rem' : '0.75rem',
                                display: 'block',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '120px',
                                textAlign: 'right',
                                flexShrink: 0,
                              }}
                            >
                              por: {survey.creator.username}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Tooltip title="Ver encuesta">
                        <IconButton
                          component={Link}
                          to={`/encuestas/${survey.id}`}
                          size="small"
                          sx={{ 
                            color: '#666',
                            '&:hover': {
                              color: '#333',
                              backgroundColor: 'rgba(0,0,0,0.04)'
                            }
                          }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {index < popularSurveys.length - 1 && (
                      <Divider sx={{ 
                        mt: 2, 
                        borderColor: 'rgba(0,0,0,0.12)' 
                      }} />
                    )}
                  </Box>
                ))}
                
                {/* ✅ Botón para expandir/contraer ranking */}
                {popularSurveys.length > 5 && (
                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Button
                      onClick={() => setShowAllRanking(!showAllRanking)}
                      size="small"
                      endIcon={showAllRanking ? <ExpandLess /> : <ExpandMore />}
                      sx={{ 
                        fontSize: '0.875rem',
                        py: 1,
                        px: 2,
                        color: 'primary.main',
                        borderColor: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'rgba(102, 126, 234, 0.04)'
                        }
                      }}
                      variant="outlined"
                    >
                      {showAllRanking ? 'Mostrar Menos' : 'Ver Top 10'}
                    </Button>
                  </Box>
                )}
                
                {/* ✅ Mensaje de actualización trimestral */}
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontStyle: 'italic'
                    }}
                  >
                    📅 Este ranking se actualiza cada 3 meses
                  </Typography>
                </Box>
              </Box>
            )}
            </Paper>
            
            {/* ✅ SALÓN DE LA FAMA - Panel Completamente Independiente */}
            <Box sx={{ mt: 4, display: 'block', position: 'relative', zIndex: 1 }}>
              <Paper sx={{ 
                p: 3, 
                borderRadius: 3, 
                bgcolor: '#FFFFFF',
                border: '1px solid #e0e0e0',
                display: 'block',
              }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600, 
                      mb: 3,
                      color: '#333',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    🏅 Salón de la Fama
                  </Typography>
                  
                  {/* Ranking histórico */}
                  
                  {historicRanking.length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', py: 2 }}>
                      No hay datos de ranking histórico disponibles
                    </Typography>
                  ) : (
                    <Box>
                      {historicRanking.map((survey, index) => (
                        <Box key={survey.id} sx={{ mb: index < historicRanking.length - 1 ? 2 : 0, overflow: 'hidden' }}>
                          <Box display="flex" alignItems="center" gap={2} sx={{ flexWrap: 'nowrap' }}>
                            <Box 
                              sx={{ 
                                minWidth: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: index === 0 ? 'linear-gradient(45deg, #ffd700, #ffed4e)' : 
                                           index === 1 ? 'linear-gradient(45deg, #c0c0c0, #e8e8e8)' :
                                           index === 2 ? 'linear-gradient(45deg, #cd7f32, #daa520)' :
                                           'linear-gradient(45deg, #8C4EFF, #7113B8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: index <= 2 ? '#333' : 'white',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                flexShrink: 0,
                              }}
                            >
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </Box>
                            <Box flexGrow={1} sx={{ minWidth: 0, overflow: 'hidden' }}>
                              <Typography 
                                variant="body2"
                                component={Link}
                                to={`/encuestas/${survey.id}`}
                                sx={{ 
                                  fontWeight: 500,
                                  color: '#333',
                                  display: 'block',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%',
                                  mb: 0.5,
                                  textDecoration: 'none',
                                  cursor: 'pointer',
                                  '&:hover': { color: '#8C4EFF', textDecoration: 'underline' },
                                }}
                              >
                                {survey.title}
                              </Typography>
                              <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} sx={{ flexWrap: 'nowrap' }}>
                                {/* Columna Izquierda: Estadísticas y Puntos */}
                                <Box display="flex" alignItems="center" gap={1} sx={{ flexShrink: 0 }}>
                                  <TrendingUp sx={{ fontSize: 14, color: '#666' }} />
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: '#666', 
                                      fontSize: '0.75rem',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {survey.response_count || 0} resp | {survey.likes_count || 0} likes | {survey.total_score || 0} pts
                                  </Typography>
                                </Box>
                                {/* Columna Derecha: Autor */}
                                {survey.creator && (
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: '#666',
                                      fontSize: survey.creator.username.length > 15 ? '0.7rem' : '0.75rem',
                                      display: 'block',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      maxWidth: '120px',
                                      textAlign: 'right',
                                      flexShrink: 0,
                                    }}
                                  >
                                    por: {survey.creator.username}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <Tooltip title="Ver encuesta">
                              <IconButton
                                component={Link}
                                to={`/encuestas/${survey.id}`}
                                size="small"
                                sx={{ 
                                  color: '#666',
                                  '&:hover': {
                                    color: '#333',
                                    backgroundColor: 'rgba(0,0,0,0.04)'
                                  }
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          {index < historicRanking.length - 1 && (
                            <Divider sx={{ 
                              mt: 2, 
                              borderColor: 'rgba(0,0,0,0.12)' 
                            }} />
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Mensaje de ranking histórico */}
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontStyle: 'italic'
                      }}
                    >
                      🏆 Las encuestas más populares de Cuestom
                    </Typography>
                  </Box>
                </Paper>
              </Box>
          </Box>
        )}
      </Box>

      {/* Botón flotante para Ranking en móvil */}
      <Fab
        color="primary"
        onClick={() => setRankingDrawerOpen(true)}
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1200,
        }}
      >
        <Leaderboard />
      </Fab>

      {/* Drawer móvil para Ranking */}
      <Drawer
        anchor="bottom"
        open={rankingDrawerOpen}
        onClose={() => setRankingDrawerOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' } }}
        PaperProps={{
          sx: {
            maxHeight: '80vh',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            p: 2,
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Ranking</Typography>
          <IconButton onClick={() => setRankingDrawerOpen(false)}>
            <Clear />
          </IconButton>
        </Box>
        <Box sx={{ overflow: 'auto' }}>
          {/* Ranking Trimestral */}
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#FFFFFF', border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#333' }}>
              🏆 Ranking - Top {showAllRanking ? '10' : '5'}
            </Typography>
            {popularSurveys.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', py: 2 }}>
                No hay tendencias disponibles aún
              </Typography>
            ) : (
              <Box>
                {popularSurveys.slice(0, showAllRanking ? 10 : 5).map((survey, index) => (
                  <Box key={survey.id} sx={{ mb: index < popularSurveys.length - 1 ? 2 : 0, overflow: 'hidden' }}>
                    <Box display="flex" alignItems="center" gap={2} sx={{ flexWrap: 'nowrap' }}>
                      <Box sx={{ minWidth: '32px', height: '32px', borderRadius: '50%',
                        background: index === 0 ? 'linear-gradient(45deg, #ffd700, #ffed4e)' :
                                   index === 1 ? 'linear-gradient(45deg, #c0c0c0, #e8e8e8)' :
                                   index === 2 ? 'linear-gradient(45deg, #cd7f32, #daa520)' :
                                   'linear-gradient(45deg, #8C4EFF, #7113B8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: index <= 2 ? '#333' : 'white', fontWeight: 'bold', fontSize: '14px', flexShrink: 0
                      }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </Box>
                      <Box flexGrow={1} sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          component={Link}
                          to={`/encuestas/${survey.id}`}
                          onClick={() => setRankingDrawerOpen(false)}
                          sx={{ fontWeight: 500, color: '#333', textDecoration: 'none', cursor: 'pointer', '&:hover': { color: '#8C4EFF', textDecoration: 'underline' } }}
                        >
                          {survey.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#666' }}>
                          {survey.response_count || 0} resp | {survey.likes_count || 0} likes | {survey.total_score || 0} pts
                        </Typography>
                      </Box>
                      <IconButton
                        component={Link}
                        to={`/encuestas/${survey.id}`}
                        size="small"
                        sx={{ color: '#666' }}
                        onClick={() => setRankingDrawerOpen(false)}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Box>
                    {index < popularSurveys.length - 1 && <Divider sx={{ mt: 2, borderColor: 'rgba(0,0,0,0.12)' }} />}
                  </Box>
                ))}
              </Box>
            )}
          </Paper>

          {/* Salón de la Fama */}
          <Box sx={{ mt: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#FFFFFF', border: '1px solid #e0e0e0' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#333' }}>
                🏆 Salón de la Fama
              </Typography>
              {historicRanking.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', py: 2 }}>
                  No hay datos de ranking histórico disponibles
                </Typography>
              ) : (
                <Box>
                  {historicRanking.map((survey, index) => (
                    <Box key={survey.id} sx={{ mb: index < historicRanking.length - 1 ? 2 : 0, overflow: 'hidden' }}>
                      <Box display="flex" alignItems="center" gap={2} sx={{ flexWrap: 'nowrap' }}>
                        <Box sx={{ minWidth: '32px', height: '32px', borderRadius: '50%',
                          background: index === 0 ? 'linear-gradient(45deg, #ffd700, #ffed4e)' :
                                     index === 1 ? 'linear-gradient(45deg, #c0c0c0, #e8e8e8)' :
                                     index === 2 ? 'linear-gradient(45deg, #cd7f32, #daa520)' :
                                     'linear-gradient(45deg, #8C4EFF, #7113B8)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: index <= 2 ? '#333' : 'white', fontWeight: 'bold', fontSize: '14px', flexShrink: 0
                        }}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </Box>
                        <Box flexGrow={1} sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            component={Link}
                            to={`/encuestas/${survey.id}`}
                            onClick={() => setRankingDrawerOpen(false)}
                            sx={{ fontWeight: 500, color: '#333', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', mb: 0.5, textDecoration: 'none', cursor: 'pointer', '&:hover': { color: '#8C4EFF', textDecoration: 'underline' } }}
                          >
                            {survey.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem' }}>
                            {survey.response_count || 0} resp | {survey.likes_count || 0} likes | {survey.total_score || 0} pts
                          </Typography>
                        </Box>
                        <IconButton component={Link} to={`/encuestas/${survey.id}`} size="small" sx={{ color: '#666', flexShrink: 0 }} onClick={() => setRankingDrawerOpen(false)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Box>
                      {index < historicRanking.length - 1 && <Divider sx={{ mt: 2, borderColor: 'rgba(0,0,0,0.12)' }} />}
                    </Box>
                  ))}
                </Box>
              )}
              <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', textAlign: 'center', display: 'block', mt: 2 }}>
                🏆 Las encuestas más populares de Cuestom
              </Typography>
            </Paper>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default SurveyList;

