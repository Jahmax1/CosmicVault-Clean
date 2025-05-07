import { useState, useRef, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import '../App.css';

function Register({ setToken }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [idType, setIdType] = useState('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [selfie, setSelfie] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const history = useHistory();

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        setErrors({ selfie: 'Failed to access camera. Please allow camera access.' });
      }
    };
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureSelfie = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, 320, 240);
      canvasRef.current.toBlob((blob) => {
        setSelfie(blob);
      }, 'image/jpeg');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Client-side validation
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!username) newErrors.username = 'Full name from ID is required';
    if (!password) newErrors.password = 'Password is required';
    if (!idType) newErrors.idType = 'ID type is required';
    if (!idNumber) newErrors.idNumber = 'ID number is required';
    if (!selfie) newErrors.selfie = 'Selfie is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    console.log('Register - Password state before FormData:', password);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('username', username);
    formData.append('password', password);
    formData.append('idType', idType);
    formData.append('idNumber', idNumber);
    formData.append('selfie', selfie, 'selfie.jpg');

    console.log('Register - FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
    }

    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      history.push('/');
    } catch (err) {
      const errorDetails = {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        stack: err.stack,
      };
      console.error('Register - Error:', errorDetails);
      setErrors({
        server: err.response?.data?.message || `Failed to register: ${err.message}`,
      });
      setTimeout(() => setErrors({}), 5000);
    } finally {
      setLoading(false);
    }
  };

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
              placeholder="Full Name (as on ID)"
              required
              disabled={loading}
              aria-label="Full Name"
            />
            {errors.username && <p className="error">{errors.username}</p>}
            <input
              type="password"
              value={password}
              onChange={(e) => {
                console.log('Password input changed:', e.target.value);
                setPassword(e.target.value);
              }}
              placeholder="Password"
              required
              disabled={loading}
              aria-label="Password"
            />
            {errors.password && <p className="error">{errors.password}</p>}
            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value)}
              required
              disabled={loading}
              aria-label="ID Type"
            >
              <option value="national_id">National ID (Uganda)</option>
              <option value="driving_license">Driving License</option>
              <option value="passport">Passport (Foreigners)</option>
            </select>
            {errors.idType && <p className="error">{errors.idType}</p>}
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="ID Number"
              required
              disabled={loading}
              aria-label="ID Number"
            />
            {errors.idNumber && <p className="error">{errors.idNumber}</p>}
            <div className="selfie-capture">
              <video ref={videoRef} autoPlay width="320" height="240" />
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
          <a href="/login" aria-label="Login">
            Login
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default Register;