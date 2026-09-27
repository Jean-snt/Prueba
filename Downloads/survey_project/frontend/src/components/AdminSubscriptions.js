import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  Person,
  Payment,
  Schedule,
  AttachMoney,
} from '@mui/icons-material';
import { surveyAPI } from '../services/api';

const AdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para diálogos
  const [approveDialog, setApproveDialog] = useState({ open: false, subscription: null });
  const [rejectDialog, setRejectDialog] = useState({ open: false, subscription: null });
  const [proofDialog, setProofDialog] = useState({ open: false, proofUrl: null });
  
  // Estados para formularios
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPendingSubscriptions();
  }, []);

  const loadPendingSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await surveyAPI.getAdminPendingSubscriptions();
      
      if (response.data.success) {
        setSubscriptions(response.data.subscriptions);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError('Error cargando suscripciones pendientes');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveDialog.subscription) return;
    
    try {
      setProcessing(true);
      const response = await surveyAPI.adminApproveSubscription(
        approveDialog.subscription.id,
        adminNotes
      );
      
      if (response.data.success) {
        setSuccess(`Suscripción de ${approveDialog.subscription.user.username} aprobada exitosamente`);
        setApproveDialog({ open: false, subscription: null });
        setAdminNotes('');
        loadPendingSubscriptions(); // Recargar lista
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError('Error aprobando suscripción');
      console.error('Error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.subscription) return;
    
    try {
      setProcessing(true);
      const response = await surveyAPI.adminRejectSubscription(
        rejectDialog.subscription.id,
        rejectReason
      );
      
      if (response.data.success) {
        setSuccess(`Suscripción de ${rejectDialog.subscription.user.username} rechazada`);
        setRejectDialog({ open: false, subscription: null });
        setRejectReason('');
        loadPendingSubscriptions(); // Recargar lista
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError('Error rechazando suscripción');
      console.error('Error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'yape': return '📱';
      case 'bcp': return '🏦';
      case 'paypal': return '💳';
      default: return '💰';
    }
  };

  const getPlanIcon = (planType) => {
    switch (planType) {
      case 'monthly': return '⭐';
      case 'quarterly': return '💎';
      case 'annual': return '🏆';
      default: return '⭐';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          🛡️ Panel de Administración
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Suscripciones Pendientes de Aprobación
        </Typography>
      </Box>

      {/* Mensajes */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Lista de suscripciones */}
      {subscriptions.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary">
              ✅ No hay suscripciones pendientes
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Todas las suscripciones han sido procesadas
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {subscriptions.map((subscription) => (
            <Grid item xs={12} md={6} lg={4} key={subscription.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  border: '2px solid #ffd700',
                  boxShadow: '0 4px 20px rgba(255, 215, 0, 0.2)',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(255, 215, 0, 0.3)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <CardContent>
                  {/* Usuario */}
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ bgcolor: '#667eea', mr: 2 }}>
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {subscription.user.full_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        @{subscription.user.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {subscription.user.email}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Plan */}
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h5" mr={1}>
                      {getPlanIcon(subscription.plan.type)}
                    </Typography>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {subscription.plan.name}
                      </Typography>
                      <Typography variant="h6" color="primary" fontWeight="bold">
                        ${subscription.plan.price}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Método de pago */}
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h6" mr={1}>
                      {getPaymentMethodIcon(subscription.payment.method)}
                    </Typography>
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {subscription.payment.method_name}
                      </Typography>
                      {subscription.payment.transaction_id && (
                        <Typography variant="body2" color="text.secondary">
                          ID: {subscription.payment.transaction_id}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Fecha */}
                  <Box display="flex" alignItems="center" mb={3}>
                    <Schedule sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(subscription.dates.created_at)}
                    </Typography>
                  </Box>

                  {/* Comprobante */}
                  {subscription.payment.has_proof && (
                    <Box mb={3}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => setProofDialog({ 
                          open: true, 
                          proofUrl: subscription.payment.proof_url 
                        })}
                        fullWidth
                      >
                        Ver Comprobante
                      </Button>
                    </Box>
                  )}

                  {/* Botones de acción */}
                  <Box display="flex" gap={1}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => setApproveDialog({ 
                        open: true, 
                        subscription 
                      })}
                      fullWidth
                      sx={{
                        background: 'linear-gradient(45deg, #4caf50, #66bb6a)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #43a047, #5cb85c)',
                        }
                      }}
                    >
                      Aprobar
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={() => setRejectDialog({ 
                        open: true, 
                        subscription 
                      })}
                      fullWidth
                    >
                      Rechazar
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Diálogo de aprobación */}
      <Dialog 
        open={approveDialog.open} 
        onClose={() => setApproveDialog({ open: false, subscription: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          ✅ Aprobar Suscripción VIP
        </DialogTitle>
        <DialogContent>
          {approveDialog.subscription && (
            <>
              <Typography variant="body1" mb={2}>
                ¿Estás seguro de que deseas aprobar la suscripción de{' '}
                <strong>{approveDialog.subscription.user.full_name}</strong>?
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Al aprobar, el usuario se convertirá automáticamente en VIP y recibirá un email de confirmación.
              </Alert>

              <TextField
                fullWidth
                label="Notas del administrador (opcional)"
                multiline
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Agregar comentarios internos..."
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setApproveDialog({ open: false, subscription: null })}
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleApprove}
            variant="contained"
            color="success"
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {processing ? 'Aprobando...' : 'Aprobar Suscripción'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de rechazo */}
      <Dialog 
        open={rejectDialog.open} 
        onClose={() => setRejectDialog({ open: false, subscription: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          ❌ Rechazar Suscripción
        </DialogTitle>
        <DialogContent>
          {rejectDialog.subscription && (
            <>
              <Typography variant="body1" mb={2}>
                ¿Estás seguro de que deseas rechazar la suscripción de{' '}
                <strong>{rejectDialog.subscription.user.full_name}</strong>?
              </Typography>

              <TextField
                fullWidth
                label="Motivo del rechazo"
                multiline
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explica por qué se rechaza el pago..."
                required
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRejectDialog({ open: false, subscription: null })}
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={processing || !rejectReason.trim()}
            startIcon={processing ? <CircularProgress size={20} /> : <Cancel />}
          >
            {processing ? 'Rechazando...' : 'Rechazar Suscripción'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de comprobante */}
      <Dialog 
        open={proofDialog.open} 
        onClose={() => setProofDialog({ open: false, proofUrl: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          📄 Comprobante de Pago
        </DialogTitle>
        <DialogContent>
          {proofDialog.proofUrl && (
            <Box textAlign="center">
              <img 
                src={proofDialog.proofUrl} 
                alt="Comprobante de pago"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '500px',
                  border: '1px solid #ddd',
                  borderRadius: '8px'
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProofDialog({ open: false, proofUrl: null })}>
            Cerrar
          </Button>
          {proofDialog.proofUrl && (
            <Button 
              variant="contained"
              onClick={() => window.open(proofDialog.proofUrl, '_blank')}
            >
              Abrir en Nueva Pestaña
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminSubscriptions;
