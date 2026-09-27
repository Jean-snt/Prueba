import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Button, 
  Box, 
  Menu, 
  MenuItem, 
  Avatar, 
  Typography,
  Divider,
  IconButton,
  Chip,
  Badge,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { 
  Create, 
  Login, 
  PersonAdd, 
  AccountCircle,
  Logout,
  Dashboard,
  Assessment,
  Diamond,
  Star,
  Menu as MenuIcon,
} from '@mui/icons-material';
import NotificationCenter from './NotificationCenter';
import LogoAvatar from './LogoAvatar';
import { surveyAPI } from '../services/api';
import { useUser } from '../context/UserContext';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: contextUser, updateUser } = useUser();
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isVip, setIsVip] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
        checkVipStatus(user);
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  useEffect(() => {
    if (contextUser) {
      setCurrentUser(prev => ({ ...prev, ...contextUser }));
    }
  }, [contextUser]);

  useEffect(() => {
    if (isVip) {
      document.body.classList.add('vip-user');
    } else {
      document.body.classList.remove('vip-user');
    }
    
    return () => {
      document.body.classList.remove('vip-user');
    };
  }, [isVip]);

  const checkVipStatus = async (user) => {
    try {
      const subscriptionResponse = await surveyAPI.getUserSubscription();
      const subData = subscriptionResponse.data;
      
      setSubscription(subData.subscription);
      
      const userIsVip = user.is_vip || 
                       (subData.has_subscription && subData.subscription?.status === 'active') ||
                       subData.is_vip;
      
      setIsVip(userIsVip);

    } catch (err) {
      setIsVip(user.is_vip || false);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    const userId = currentUser?.id;
    const vipTimeKeys = {};
    
    if (userId) {
      vipTimeKeys[`vip_time_${userId}`] = localStorage.getItem(`vip_time_${userId}`);
      vipTimeKeys[`vip_session_date_${userId}`] = localStorage.getItem(`vip_session_date_${userId}`);
      vipTimeKeys[`vip_weekly_usage_${userId}`] = localStorage.getItem(`vip_weekly_usage_${userId}`);
      vipTimeKeys[`vip_week_start_${userId}`] = localStorage.getItem(`vip_week_start_${userId}`);
      vipTimeKeys[`vip_weekly_history_${userId}`] = localStorage.getItem(`vip_weekly_history_${userId}`);
    }
    
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    if (userId) {
      Object.entries(vipTimeKeys).forEach(([key, value]) => {
        if (value !== null) {
          localStorage.setItem(key, value);
        }
      });
    }
    
    setCurrentUser(null);
    handleMenuClose();
    navigate('/login');
  };

  const isActiveRoute = (path) => {
    if (path === '/vip-dashboard') {
      return location.pathname === '/vip-dashboard' || location.pathname === '/dashboard';
    }
    if (path === '/encuestas') {
      return location.pathname === '/encuestas' || location.pathname.startsWith('/encuestas/');
    }
    if (path === '/create') {
      return location.pathname === '/create' || location.pathname === '/crear';
    }
    if (path === '/vip') {
      return location.pathname === '/vip';
    }
    return location.pathname === path;
  };

  // ✅ FUNCIÓN UNIFICADA: Estilos para todos los botones de navegación
  const getNavButtonSx = (item, isActive) => {
    // Botón VIP especial (dorado)
    if (item.special) {
      return {
        color: '#000 !important',
        textDecoration: 'none',
        fontWeight: 'bold',
        minWidth: 'auto',
        px: 2,
        py: 1,
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
        border: '1px solid transparent',
        boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
        '@media (hover: hover)': {
          '&:hover': {
            background: 'linear-gradient(45deg, #ffed4e, #ffd700)',
            boxShadow: '0 0 30px rgba(255, 215, 0, 1)',
            transform: 'translateY(-2px)',
          },
        },
      };
    }

    // Botones normales (Dashboard, Encuestas, Crear)
    return {
      color: 'white',
      textDecoration: 'none',
      fontWeight: isActive ? 700 : 500,
      minWidth: 'auto',
      px: 2,
      py: 1,
      borderRadius: 2,
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
      border: isActive ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
      '@media (hover: hover)': {
        '&:hover': {
          background: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          transform: 'none',
        },
      },
      // Línea indicadora blanca para botones activos
      '&::after': isActive ? {
        content: '""',
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60%',
        height: '2px',
        background: 'white',
        borderRadius: '1px',
      } : {},
    };
  };

  const navItems = [
    { 
      id: 'dashboard',
      label: 'Dashboard', 
      path: '/vip-dashboard', 
      icon: <Dashboard />, 
      description: 'Panel principal',
      vipOnly: true 
    },
    { 
      id: 'encuestas',
      label: 'Encuestas', 
      path: '/encuestas', 
      icon: <Assessment />, 
      description: 'Ver todas las encuestas',
      badge: 'Nuevo' 
    },
    { 
      id: 'crear',
      label: 'Crear', 
      path: '/create', 
      icon: <Create />, 
      description: 'Crear nueva encuesta',
      highlight: true 
    },
    { 
      id: 'vip',
      label: 'VIP', 
      path: '/vip', 
      icon: <Diamond />, 
      description: 'Funciones premium',
      special: true,
      glow: true 
    },
  ];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Hamburguesa solo en móvil */}
      {currentUser && (
        <IconButton
          onClick={() => setMobileDrawerOpen(true)}
          sx={{ display: { xs: 'flex', md: 'none' }, color: 'white' }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Navegación desktop */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
        {currentUser && (
          <>
            {navItems.map((item) => {
              const isActive = isActiveRoute(item.path);
              const showItem = !item.vipOnly || (item.vipOnly && (isVip || currentUser?.is_staff));
              
              if (!showItem) return null;
              
              return (
                <Tooltip key={item.id} title={item.description} arrow>
                  <Badge 
                    badgeContent={item.badge && !isActive ? item.badge : null}
                    color="error"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.6rem',
                        height: '16px',
                        minWidth: '16px',
                      }
                    }}
                  >
                    <Button
                    component={Link}
                    to={item.path}
                    startIcon={item.icon}
                    sx={getNavButtonSx(item, isActive)}
                  >
                    {item.label}
                  </Button>
                </Badge>
              </Tooltip>
            );
          })}
        </>
      )}
      </Box>

      {/* Drawer móvil */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' } }}
        PaperProps={{
          sx: {
            width: 280,
            background: 'linear-gradient(180deg, #7113B8 0%, #8C48C7 100%)',
            color: 'white',
            pt: 2,
          }
        }}
      >
        <Box sx={{ px: 2, pb: 2, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Cuestom</Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
        <List>
          {navItems.map((item) => {
            const isActive = isActiveRoute(item.path);
            const showItem = !item.vipOnly || (item.vipOnly && (isVip || currentUser?.is_staff));
            if (!showItem) return null;
            return (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={isActive}
                  onClick={() => setMobileDrawerOpen(false)}
                  sx={{
                    color: 'white',
                    '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.2)' },
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
                    py: 1.5,
                  }}
                >
                  <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
        <List>
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/profile" onClick={() => setMobileDrawerOpen(false)} sx={{ color: 'white', py: 1.5 }}>
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}><AccountCircle /></ListItemIcon>
              <ListItemText primary="Mi Perfil" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={() => { handleLogout(); setMobileDrawerOpen(false); }} sx={{ color: '#ff6b6b', py: 1.5 }}>
              <ListItemIcon sx={{ color: '#ff6b6b', minWidth: 40 }}><Logout /></ListItemIcon>
              <ListItemText primary="Cerrar Sesión" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      {currentUser ? (
        <>
          <NotificationCenter />
          
          <IconButton
            onClick={handleMenuOpen}
            sx={{ 
              color: 'white',
              ml: 1,
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'scale(1.1)',
              }
            }}
          >
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              badgeContent={
                isVip ? (
                  <Chip
                    icon={<Diamond sx={{ fontSize: '12px !important' }} />}
                    label="VIP"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                      color: '#333',
                      border: '2px solid #fff',
                      boxShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
                      animation: 'vipPulse 2s infinite',
                      '@keyframes vipPulse': {
                        '0%': {
                          boxShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
                          transform: 'scale(1)',
                        },
                        '50%': {
                          boxShadow: '0 0 25px rgba(255, 215, 0, 1)',
                          transform: 'scale(1.05)',
                        },
                        '100%': {
                          boxShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
                          transform: 'scale(1)',
                        },
                      },
                      '& .MuiChip-icon': {
                        fontSize: '12px',
                        color: '#333',
                      }
                    }}
                  />
                ) : null
              }
            >
              <Box
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              >
                {contextUser?.profile_image ? (
                  <Avatar
                    src={contextUser.profile_image}
                    sx={{ width: 40, height: 40 }}
                  />
                ) : currentUser?.profile_image ? (
                  <Avatar
                    src={currentUser.profile_image}
                    sx={{ width: 40, height: 40 }}
                  />
                ) : isVip ? (
                  <LogoAvatar size={40} isVip={true} circular={true} />
                ) : (
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(45deg, #8C4EFF, #7113B8)',
                    }}
                  >
                    <AccountCircle sx={{ fontSize: 28, color: 'white' }} />
                  </Avatar>
                )}
              </Box>
            </Badge>
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 220,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                }
              }
            }}
          >
            <Box sx={{ px: 3, py: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {currentUser.username}
                </Typography>
                {isVip && (
                  <Chip
                    icon={<Star sx={{ fontSize: '14px !important' }} />}
                    label="VIP"
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      background: 'linear-gradient(45deg, #ffd700, #ffed4e)',
                      color: '#333',
                      boxShadow: '0 2px 8px rgba(255, 215, 0, 0.4)',
                      '& .MuiChip-icon': {
                        fontSize: '14px',
                        color: '#333',
                      }
                    }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {currentUser.email || 'Usuario de Cuestom'}
              </Typography>
              {isVip && subscription && subscription.end_date && (
                <Box sx={{ 
                  mt: 1, 
                  p: 1.5, 
                  borderRadius: 2, 
                  background: 'linear-gradient(45deg, rgba(255, 215, 0, 0.1), rgba(255, 237, 78, 0.1))',
                  border: '1px solid rgba(255, 215, 0, 0.3)'
                }}>
                  <Typography variant="caption" display="block" sx={{ 
                    color: '#ffd700', 
                    fontWeight: 'bold', 
                    fontSize: '0.75rem',
                    mb: 0.5
                  }}>
                    🎯 Suscripción VIP Activa
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ 
                    color: 'text.primary', 
                    fontWeight: 'bold',
                    fontSize: '0.7rem'
                  }}>
                    Vence: {new Date(subscription.end_date).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ 
                    color: subscription.days_remaining <= 7 ? '#ff5722' : '#4caf50', 
                    fontWeight: 'bold',
                    fontSize: '0.65rem'
                  }}>
                    {(() => {
                      const now = new Date();
                      const endDate = new Date(subscription.end_date);
                      const diffTime = endDate - now;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (diffDays <= 0) return '⚠️ Expirado';
                      if (diffDays === 1) return '⏰ Expira mañana';
                      if (diffDays <= 7) return `⚠️ ${diffDays} días restantes`;
                      return `✅ ${diffDays} días restantes`;
                    })()}
                  </Typography>
                </Box>
              )}
            </Box>
            <Divider />
            <MenuItem 
              onClick={handleMenuClose} 
              component={Link} 
              to="/profile"
              sx={{ py: 1.5 }}
            >
              <AccountCircle sx={{ mr: 2 }} />
              Mi Perfil
            </MenuItem>
            <Divider />
            <MenuItem 
              onClick={handleLogout}
              sx={{ color: 'error.main', py: 1.5 }}
            >
              <Logout sx={{ mr: 2 }} />
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </>
      ) : (
        <>
          <Button
            component={Link}
            to="/login"
            startIcon={<Login />}
            sx={{
              color: 'white',
              px: 2,
              py: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Iniciar Sesión
          </Button>
          <Button
            component={Link}
            to="/register"
            startIcon={<PersonAdd />}
            variant="outlined"
            sx={{
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.5)',
              px: 2,
              py: 1,
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Registrarse
          </Button>
        </>
      )}
    </Box>
  );
};

export default Navigation;
