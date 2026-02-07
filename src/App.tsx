import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RiceTypes from './pages/RiceTypes';
import Suppliers from './pages/Suppliers';
import Destinations from './pages/Destinations';
import StockManagement from './pages/StockManagement';
import Incoming from './pages/Incoming';
import Outgoing from './pages/Outgoing';
import Reports from './pages/Reports';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rice-types"
        element={
          <ProtectedRoute>
            <RiceTypes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute>
            <Suppliers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/destinations"
        element={
          <ProtectedRoute>
            <Destinations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock"
        element={
          <ProtectedRoute>
            <StockManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/incoming"
        element={
          <ProtectedRoute>
            <Incoming />
          </ProtectedRoute>
        }
      />
      <Route
        path="/outgoing"
        element={
          <ProtectedRoute>
            <Outgoing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
