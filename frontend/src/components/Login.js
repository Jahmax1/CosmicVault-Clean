import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import '../App.css';

// Debug component mount
console.log('Login component loaded');

function Login({ setToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[Login] Request timed out after 15s');
        controller.abort();
      }, 15000);

      console.log('[Login] Sending request to /api/auth/login', { email });
      const res = await axios.post(
        'http://localhost:5000/api/auth/login',
        { email, password },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      console.log('[Login] Response received:', res.data);
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (err) {
      console.error('[Login] Error:', {
        message: err.message || 'No message provided',
        name: err.name,
        code: err.code,
        status: err.response?.status,
        responseData: err.response?.data,
        headers: err.response?.headers,
        stack: err.stack,
      });
      let errorMessage = 'Failed to log in. Please try again.';
      if (err.name === 'AbortError') {
        errorMessage = 'Login timed out after 15s. Check if backend is running at http://localhost:5000.';
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Cannot reach backend. Ensure http://localhost:5000 is accessible.';
      } else if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else {
        errorMessage = `Unexpected error: ${err.message || 'Unknown'}`;
      }
      setErrors({ server: errorMessage });
      toast.error(errorMessage);
      setTimeout(() => setErrors({}), 5000);
    } finally {
      setLoading(false);
    }
  }

  // Debug render
  console.log('[Login] Rendering', { email, password, errors, loading });

  return (
    <div className="auth-container">
      <div className="stars-background"></div>
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2>Login to CosmicVault</h2>
        {errors.server && <p className="error">{errors.server}</p>}
        {loading ? (
          <p>Loading...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              disabled={loading}
              aria-label="Email"
            />
            {errors.email && <p className="error">{errors.email}</p>}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              disabled={loading}
              aria-label="Password"
            />
            {errors.password && <p className="error">{errors.password}</p>}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Login"
            >
              {loading ? 'Logging in...' : 'Login'}
            </motion.button>
          </form>
        )}
        <p>
          Don't have an account?{' '}
          <a href="/CosmicVault-Clean/register" aria-label="Register">
            Register
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default Login;