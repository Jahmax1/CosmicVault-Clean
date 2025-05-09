import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import PoolFund from './components/PoolFund';
import CreatePool from './components/CreatePool';
import WithdrawalAdminPanel from './components/WithdrawalAdminPanel';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Debug imports
console.log('Login:', Login);
console.log('Register:', Register);
console.log('Dashboard:', Dashboard);
console.log('PoolFund:', PoolFund);
console.log('CreatePool:', CreatePool);
console.log('WithdrawalAdminPanel:', WithdrawalAdminPanel);

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-red-500 mb-4">{this.state.error?.message || 'Unknown error'}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 py-2 px-4 rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  const PrivateRoute = ({ children }) => {
    return token ? children : <Navigate to="/login" />;
  };

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<Login setToken={setToken} />} />
          <Route path="/register" element={<Register setToken={setToken} />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard token={token} setToken={setToken} />
              </PrivateRoute>
            }
          />
          <Route
            path="/pools"
            element={
              <PrivateRoute>
                <PoolFund />
              </PrivateRoute>
            }
          />
          <Route
            path="/create-pool"
            element={
              <PrivateRoute>
                <CreatePool />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/withdrawals"
            element={
              <PrivateRoute>
                <WithdrawalAdminPanel />
              </PrivateRoute>
            }
          />
        </Routes>
        <ToastContainer />
      </Router>
    </ErrorBoundary>
  );
};

export default App;