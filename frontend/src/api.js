import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && error.response.data.message === 'Token is not valid') {
      try {
        const { data } = await axios.post('http://localhost:5000/api/auth/refresh', {
          token: localStorage.getItem('token'),
        });
        localStorage.setItem('token', data.token);
        error.config.headers.Authorization = `Bearer ${data.token}`;
        return api(error.config);
      } catch (refreshError) {
        console.error('[API] Token refresh failed:', refreshError);
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;