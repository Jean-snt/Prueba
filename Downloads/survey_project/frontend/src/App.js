import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, AppBar, Toolbar, Typography, Box, CircularProgress } from '@mui/material';
import { deepPurple } from '@mui/material/colors';

// ✅ OPTIMIZACIÓN: Componentes críticos cargados inmediatamente
import HomePage from './components/HomePage';
import Login from './components/Login';
import Register from './components/Register';
import VerifyAccount from './components/VerifyAccount';
import ForgotPassword from './components/ForgotPassword';
import Navigation from './components/Navigation';
import CuestomLogo from './components/CuestomLogo';
import { UserProvider } from './context/UserContext';
import VipProtectedRoute from './components/VipProtectedRoute';
import ProtectedDashboardRoute from './components/ProtectedDashboardRoute';
import SurveyList from './components/SurveyList';
import SurveyDetail from './components/SurveyDetail';

// ✅ OPTIMIZACIÓN: Lazy loading para componentes pesados (Dashboard, VIP, Forms)
const Dashboard = lazy(() => import('./components/Dashboard'));
const VipDashboard = lazy(() => import('./components/VipDashboard'));
const SurveyForm = lazy(() => import('./components/SurveyForm'));
const SurveyResults = lazy(() => import('./components/SurveyResults'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const VipPage = lazy(() => import('./components/VipPage'));
const UpgradePage = lazy(() => import('./components/UpgradePage'));
const CheckoutPage = lazy(() => import('./components/CheckoutPage'));

// ✅ OPTIMIZACIÓN: Loading fallback para lazy components
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
    }}
  >
    <CircularProgress size={60} />
  </Box>
);

// Create Material-UI theme with Cuestom branding
const theme = createTheme({
  palette: {
    primary: {
      main: '#8C4EFF',
      dark: '#7113B8',
    },
    secondary: {
      main: deepPurple[300],
    },
    background: {
      default: 'transparent',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 15px 0 rgba(102, 126, 234, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
            boxShadow: '0 6px 20px 0 rgba(102, 126, 234, 0.4)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        },
      },
    },
  },
});

// Barra superior compartida con logo + navegación
const TopBar = ({ position = 'static' }) => (
  <AppBar position={position} elevation={0} className="glass-nav">
    <Toolbar>
      <Box
        component={Link}
        to="/home"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'opacity 0.3s ease',
          '&:hover': { opacity: 0.9 },
        }}
      >
        <CuestomLogo height={40} animated={false} />
        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.8rem', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
          Cuestom
        </Typography>
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <Navigation />
    </Toolbar>
  </AppBar>
);

// Layout for full-screen pages (HomePage, VIP, etc.)
const FullScreenLayout = ({ children }) => (
  <Box sx={{ flexGrow: 1, minHeight: '100vh' }}>
    <TopBar position="fixed" />
    <Box sx={{ pt: 8 }}>
      {children}
    </Box>
  </Box>
);

// Layout for authenticated app pages (encuestas, profile, etc.)
const AppLayout = ({ children }) => (
  <Box sx={{ flexGrow: 1, minHeight: '100vh' }}>
    <TopBar position="static" />
    {children}
  </Box>
);



function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncVipOnStart = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (storedUser && token) {
        try {
          const user = JSON.parse(storedUser);
          const response = await fetch('http://localhost:8000/encuestas/api/auth/profile/', {
            headers: { 'Authorization': `Token ${token}` },
          });
          
          if (response.ok) {
            const data = await response.json();
            const backendIsVip = data.profile?.is_vip || false;
            
            if (user.is_vip !== backendIsVip) {
              const updatedUser = { ...user, is_vip: backendIsVip };
              localStorage.setItem('user', JSON.stringify(updatedUser));
              window.dispatchEvent(new CustomEvent('vipStatusChanged', { detail: { is_vip: backendIsVip } }));
            }
          }
        } catch (err) {
          // Silencioso — error de red no debe bloquear la app
        }
      }
    };
    
    syncVipOnStart().finally(() => {
      setTimeout(() => setLoading(false), 800);
    });
  }, []);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <CuestomLogo height={120} animated={true} />
          <Typography
            variant="h3"
            sx={{
              mt: 3,
              color: 'white',
              fontWeight: 700,
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              animation: 'fadeIn 0.8s ease-out 0.3s both',
              '@keyframes fadeIn': {
                '0%': {
                  opacity: 0,
                  transform: 'translateY(10px)',
                },
                '100%': {
                  opacity: 1,
                  transform: 'translateY(0)',
                },
              },
            }}
          >
            Cuestom
          </Typography>
          <Box
            sx={{
              mt: 4,
              width: '200px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '2px',
              overflow: 'hidden',
              animation: 'fadeIn 0.8s ease-out 0.5s both',
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                background: 'white',
                animation: 'loading 1.5s ease-in-out infinite',
                '@keyframes loading': {
                  '0%': {
                    transform: 'translateX(-100%)',
                  },
                  '100%': {
                    transform: 'translateX(100%)',
                  },
                },
              }}
            />
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UserProvider>
      <Router>
        <Routes>
          {/* Redirección desde la raíz a HomePage */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          
          {/* Rutas de autenticación (sin layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-account" element={<VerifyAccount />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* HomePage principal con layout full-screen */}
          <Route path="/home" element={
            <FullScreenLayout>
              <HomePage />
            </FullScreenLayout>
          } />
          
          {/* Dashboard principal - SOLO VIP/ADMIN */}
          <Route path="/dashboard" element={
            <AppLayout>
              <ProtectedDashboardRoute>
                <Suspense fallback={<LoadingFallback />}>
                  <Dashboard />
                </Suspense>
              </ProtectedDashboardRoute>
            </AppLayout>
          } />
          
          {/* Dashboard VIP exclusivo (ruta separada) */}
          <Route path="/vip-dashboard" element={
            <AppLayout>
              <VipProtectedRoute>
                <Suspense fallback={<LoadingFallback />}>
                  <VipDashboard />
                </Suspense>
              </VipProtectedRoute>
            </AppLayout>
          } />
          
          {/* Rutas principales - ACCESIBLES PARA TODOS */}
          <Route path="/encuestas" element={
            <AppLayout>
              <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <SurveyList />
              </Container>
            </AppLayout>
          } />
          <Route path="/create" element={
            <AppLayout>
              <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Suspense fallback={<LoadingFallback />}>
                  <SurveyForm />
                </Suspense>
              </Container>
            </AppLayout>
          } />
          <Route path="/encuestas/:id" element={
            <AppLayout>
              <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <SurveyDetail />
              </Container>
            </AppLayout>
          } />
          <Route path="/encuestas/:id/form" element={
            <AppLayout>
              <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Suspense fallback={<LoadingFallback />}>
                  <SurveyForm />
                </Suspense>
              </Container>
            </AppLayout>
          } />
          <Route path="/encuestas/:id/results" element={
            <AppLayout>
              <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Suspense fallback={<LoadingFallback />}>
                  <SurveyResults />
                </Suspense>
              </Container>
            </AppLayout>
          } />
          
          {/* Perfil de usuario */}
          <Route path="/profile" element={
            <AppLayout>
              <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Suspense fallback={<LoadingFallback />}>
                  <UserProfile />
                </Suspense>
              </Container>
            </AppLayout>
          } />
          
          {/* Página VIP */}
          <Route path="/vip" element={
            <FullScreenLayout>
              <Suspense fallback={<LoadingFallback />}>
                <VipPage />
              </Suspense>
            </FullScreenLayout>
          } />
          
          {/* ✅ NUEVO: Ruta /upgrade para selección de planes */}
          <Route path="/upgrade" element={
            <FullScreenLayout>
              <Suspense fallback={<LoadingFallback />}>
                <UpgradePage />
              </Suspense>
            </FullScreenLayout>
          } />
          
          {/* ✅ NUEVO: Ruta /checkout para finalizar compra */}
          <Route path="/checkout" element={
            <FullScreenLayout>
              <Suspense fallback={<LoadingFallback />}>
                <CheckoutPage />
              </Suspense>
            </FullScreenLayout>
          } />
          
          {/* ✅ ELIMINADO: Ruta /select-plan - Todo centralizado en /vip */}
          {/* <Route path="/select-plan" element={
            <FullScreenLayout>
              <SelectPlan />
            </FullScreenLayout>
          } /> */}
          
          {/* Ruta catch-all - redirige a HomePage */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;