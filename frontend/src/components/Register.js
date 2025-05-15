import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import '../App.css';

// Debug component mount
console.log('Register component loaded');

function Register({ setToken }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selfie, setSelfie] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState(null);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // Check if camera is available
  const checkCameraAvailability = async () => {
    try {
      console.log('[Register] Checking available media devices');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('[Register] Available video devices:', videoDevices);
      return videoDevices.length > 0;
    } catch (err) {
      console.error('[Register] Error checking media devices:', err);
      return false;
    }
  };

  // Initialize camera stream
  const initializeCamera = async () => {
    try {
      console.log('[Register] Checking camera API support');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      // Check if there are any cameras available
      const hasCamera = await checkCameraAvailability();
      if (!hasCamera) {
        throw new Error('No camera detected on this device. You can still register without a selfie.');
      }

      console.log('[Register] Requesting camera access');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('[Register] Camera access granted, stream received');
      setStream(mediaStream);
    } catch (err) {
      console.error('[Register] Camera access error:', err);
      setCameraError(err.message || 'Failed to access camera. You can still register without a selfie.');
    }
  };

  // Set up camera initialization with manual timeout
  useEffect(() => {
    console.log('[Register] useEffect: Initializing camera');
    let timeoutId;

    const startCamera = async () => {
      // Set a manual timeout to catch if getUserMedia hangs
      timeoutId = setTimeout(() => {
        if (!stream && !cameraError) {
          console.error('[Register] Camera initialization timed out after 5 seconds');
          setCameraError('Camera initialization timed out after 5 seconds. You can still register without a selfie.');
        }
      }, 5000);

      await initializeCamera();
    };

    startCamera();

    return () => {
      clearTimeout(timeoutId);
      if (stream) {
        console.log('[Register] Stopping camera stream');
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // Run only once on mount

  // Set up video stream when videoRef is ready
  useEffect(() => {
    if (stream && videoRef.current) {
      console.log('[Register] Setting video stream');
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play().catch((err) => {
          console.error('[Register] Video play error:', err);
          setCameraError('Failed to play video. You can still register without a selfie.');
        });
        setCameraInitialized(true);
        console.log('[Register] Camera initialized successfully');
      };
    }
  }, [stream]); // Run when stream is available

  const captureSelfie = () => {
    if (canvasRef.current && videoRef.current) {
      console.log('[Register] Capturing selfie');
      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, 320, 240);
      canvasRef.current.toBlob((blob) => {
        setSelfie(blob);
        console.log('[Register] Selfie captured:', blob);
      }, 'image/jpeg');
    } else {
      console.error('[Register] Cannot capture selfie: canvasRef or videoRef missing');
      setErrors({ selfie: 'Cannot capture selfie. Camera not initialized.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!username) newErrors.username = 'Full name is required';
    if (!password) newErrors.password = 'Password is required';
    // Selfie is now optional
    // if (!selfie) newErrors.selfie = 'Selfie is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    console.log('[Register] Preparing FormData', { email, username });
    const formData = new FormData();
    formData.append('email', email);
    formData.append('username', username);
    formData.append('password', password);
    if (selfie) {
      formData.append('selfie', selfie, 'selfie.jpg');
    }

    console.log('[Register] FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[Register] Request timed out after 15s');
        controller.abort();
      }, 15000);

      console.log('[Register] Sending request to /api/auth/register');
      const res = await axios.post('http://localhost:5000/api/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      console.log('[Register] Response received:', res.data);
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (err) {
      console.error('[Register] Error:', {
        message: err.message || 'No message provided',
        name: err.name,
        code: err.code,
        status: err.response?.status,
        responseData: err.response?.data,
        headers: err.response?.headers,
        stack: err.stack,
      });
      let errorMessage = 'Failed to register. Please try again.';
      if (err.name === 'AbortError') {
        errorMessage = 'Registration timed out after 15s. Check if backend is running at http://localhost:5000.';
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
  };

  // Debug render
  console.log('[Register] Rendering', {
    email,
    username,
    password,
    selfie: !!selfie,
    errors,
    loading,
    cameraInitialized,
    cameraError,
  });

  return (
    <div className="auth-container">
      <div className="stars-background"></div>
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2>Register for CosmicVault</h2>
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
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Full Name"
              required
              disabled={loading}
              aria-label="Full Name"
            />
            {errors.username && <p className="error">{errors.username}</p>}
            <input
              type="password"
              value={password}
              onChange={(e) => {
                console.log('[Register] Password input changed:', e.target.value);
                setPassword(e.target.value);
              }}
              placeholder="Password"
              required
              disabled={loading}
              aria-label="Password"
            />
            {errors.password && <p className="error">{errors.password}</p>}
            <div className="selfie-capture">
              {cameraError ? (
                <p className="error">{cameraError}</p>
              ) : cameraInitialized ? (
                <>
                  <video ref={videoRef} width="320" height="240" />
                  <canvas ref={canvasRef} width="320" height="240" style={{ display: 'none' }} />
                  <motion.button
                    type="button"
                    onClick={captureSelfie}
                    disabled={loading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="capture-button"
                    aria-label="Capture Selfie"
                  >
                    Capture Selfie
                  </motion.button>
                  {selfie && <p className="success">Selfie captured!</p>}
                  {errors.selfie && <p className="error">{errors.selfie}</p>}
                </>
              ) : (
                <p>Loading camera...</p>
              )}
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Register"
            >
              {loading ? 'Registering...' : 'Register'}
            </motion.button>
          </form>
        )}
        <p>
          Already have an account?{' '}
          <a href="/CosmicVault-Clean/login" aria-label="Login">
            Login
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default Register;