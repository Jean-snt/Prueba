import React, { useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const PayPalButton = ({ 
  plan, 
  onSuccess, 
  onError, 
  onCancel, 
  loading = false,
  disabled = false 
}) => {
  const paypalRef = useRef();

  useEffect(() => {
    if (!plan || disabled || loading) return;

    // Limpiar botón anterior
    if (paypalRef.current) {
      paypalRef.current.innerHTML = '';
    }

    // Verificar que PayPal SDK esté cargado
    if (!window.paypal) {
      console.error('PayPal SDK no está cargado');
      return;
    }

    // Crear botón de PayPal
    window.paypal.Buttons({
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: plan.price.toString(),
              currency_code: 'USD'
            },
            description: `Suscripción VIP Cuestom - ${plan.name}`,
            custom_id: plan.id,
          }]
        });
      },
      onApprove: async (data, actions) => {
        try {
          const details = await actions.order.capture();
          onSuccess(details, data);
        } catch (error) {
          console.error('Error capturing PayPal order:', error);
          onError(error);
        }
      },
      onError: (err) => {
        console.error('PayPal error:', err);
        onError(err);
      },
      onCancel: (data) => {
        onCancel(data);
      },
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
        height: 45,
      }
    }).render(paypalRef.current);

  }, [plan, disabled, loading, onSuccess, onError, onCancel]);

  if (!plan) return null;

  return (
    <Box sx={{ position: 'relative' }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 10,
            borderRadius: 1,
          }}
        >
          <CircularProgress size={30} sx={{ color: '#ffd700' }} />
        </Box>
      )}
      
      <Box
        ref={paypalRef}
        sx={{
          minHeight: 45,
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
        }}
      />
      
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.7)',
          mt: 1,
        }}
      >
        Pago seguro con PayPal
      </Typography>
    </Box>
  );
};

export default PayPalButton;