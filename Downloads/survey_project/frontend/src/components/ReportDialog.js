import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import { Flag, Warning } from '@mui/icons-material';
import { surveyAPI } from '../services/api';

const ReportDialog = ({ 
  open, 
  onClose, 
  contentType, // 'survey' o 'comment'
  contentId, 
  contentTitle = '' 
}) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);  // ✅ NUEVO

  const reasonOptions = [
    { value: 'inappropriate', label: 'Contenido Inapropiado', description: 'Contenido ofensivo, vulgar o inadecuado' },
    { value: 'spam', label: 'Spam', description: 'Contenido repetitivo o promocional no deseado' },
    { value: 'harassment', label: 'Acoso', description: 'Comportamiento hostil o intimidatorio' },
    { value: 'other', label: 'Otro', description: 'Otro motivo no listado arriba' },
  ];

  const handleSubmit = async () => {
    if (!reason) {
      setError('Por favor selecciona un motivo');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await surveyAPI.reportContent({
        content_type: contentType,
        object_id: contentId,
        reason: reason,
        description: description.trim(),
      });

      if (response.status === 200 || response.status === 201) {
        if (response.data.success) {
          // ✅ NUEVO: Mostrar Snackbar de éxito
          setShowSnackbar(true);
          // ✅ CRÍTICO: Cerrar inmediatamente sin esperar
          setTimeout(() => {
            handleClose(true);
          }, 1500);  // Dar tiempo para ver el Snackbar
        } else {
          setError(response.data.error || 'Error al enviar el reporte');
        }
      } else {
        setError(`Error inesperado: Status ${response.status}`);
      }
    } catch (err) {
      if (err.response?.status === 400) {
        const errorMsg = err.response.data?.error || 'Ya has reportado este contenido';
        setError(errorMsg);
      } else if (err.response?.status === 302) {
        setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }, 2000);
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Debes iniciar sesión para reportar contenido');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }, 2000);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Error al enviar el reporte. Inténtalo de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (success = false) => {
    setReason('');
    setDescription('');
    setError('');
    setSuccess(false);
    setSubmitting(false);
    setShowSnackbar(false);  // ✅ NUEVO
    onClose(success);
  };

  const getContentTypeLabel = () => {
    return contentType === 'survey' ? 'encuesta' : 'comentario';
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => handleClose(false)}
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Flag color="error" />
          <Typography variant="h6" component="span">
            Reportar {getContentTypeLabel()}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              ✅ Reporte enviado exitosamente. Nuestro equipo lo revisará pronto.
            </Typography>
          </Alert>
        ) : (
          <>
            {contentTitle && (
              <Box sx={{ mb: 3, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Reportando {getContentTypeLabel()}:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {contentTitle}
                </Typography>
              </Box>
            )}

            <Box sx={{ mb: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Warning color="warning" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  Los reportes son revisados por nuestro equipo de moderación
                </Typography>
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
              <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                ¿Por qué estás reportando este {getContentTypeLabel()}?
              </FormLabel>
              <RadioGroup
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {reasonOptions.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {option.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Box>
                    }
                    sx={{ 
                      mb: 1,
                      alignItems: 'flex-start',
                      '& .MuiRadio-root': { mt: 0.5 }
                    }}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Descripción adicional (opcional)"
              placeholder="Proporciona más detalles sobre el problema..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              variant="outlined"
              helperText={`${description.length}/500 caracteres`}
              inputProps={{ maxLength: 500 }}
            />
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={() => handleClose(false)}
          disabled={submitting}
        >
          {success ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!success && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="error"
            disabled={!reason || submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <Flag />}
          >
            {submitting ? 'Enviando...' : 'Enviar Reporte'}
          </Button>
        )}
      </DialogActions>

      {/* ✅ NUEVO: Snackbar de éxito */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSnackbar(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          ✅ Reporte realizado exitosamente
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default ReportDialog;