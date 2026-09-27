import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { surveyAPI } from '../services/api';

const ProtectedDashboardRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      // Verificar usuario logueado
      const stored = localStorage.getItem('user');
      if (!stored) {
        setLoading(false);
        return;
      }

      const user = JSON.parse(stored);
      setCurrentUser(user);

      // Si es admin, tiene acceso automático
      if (user.is_staff) {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // Verificar si es VIP
      try {
        const subscriptionResponse = await surveyAPI.getUserSubscription();
        const subData = subscriptionResponse.data;
        
        const userIsVip = user.is_vip || 
                         (subData.has_subscription && subData.subscription?.status === 'active') ||
                         subData.is_vip;
        
        setHasAccess(userIsVip);
      } catch (err) {
        setHasAccess(user.is_vip || false);
      }
    } catch (error) {
      console.error('Error verificando acceso:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Verificando permisos...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/vip" replace />;
  }

  return children;
};

export default ProtectedDashboardRoute;