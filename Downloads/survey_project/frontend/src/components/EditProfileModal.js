import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';

const countries = [
  { code: 'MX', name: 'México' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'ES', name: 'España' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Perú' },
  { code: 'CL', name: 'Chile' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PY', name: 'Paraguay' },
];

const EditProfileModal = ({ open, onClose, profileData, onSave }) => {
  const [formData, setFormData] = useState(profileData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        Editar Perfil
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Apodo / Nombre"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Apellidos"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Edad"
            name="age"
            type="number"
            value={formData.age}
            onChange={handleChange}
            disabled={loading}
            inputProps={{ min: 18, max: 100 }}
          />
          <FormControl fullWidth disabled={loading}>
            <InputLabel>País</InputLabel>
            <Select
              name="country"
              value={formData.country}
              onChange={handleChange}
              label="País"
            >
              <MenuItem value="">
                <em>Selecciona tu país</em>
              </MenuItem>
              {countries.map((country) => (
                <MenuItem key={country.code} value={country.code}>
                  {country.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Número de teléfono"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            disabled={loading}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          disabled={loading}
          startIcon={<Cancel />}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <Save />}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditProfileModal;
