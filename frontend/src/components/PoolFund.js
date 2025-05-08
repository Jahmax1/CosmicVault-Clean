import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { motion } from 'framer-motion';
import { IoPeople } from 'react-icons/io5';
import { QRCodeCanvas } from 'qrcode.react';

const socket = io('http://localhost:5000', { auth: { token: localStorage.getItem('token') } });

function PoolFund({ token, setToken }) {
  const [pools, setPools] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const history = useHistory();

  const fetchUser = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (err) {
      console.error('[PoolFund] Failed to fetch user:', err.response?.data);
      if (err.response?.status === 401) {
        setToken('');
        localStorage.removeItem('token');
        history.push('/login');
      }
    }
  };

  const fetchPools = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/pools/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[PoolFund] Pools fetched:', res.data);
      setPools(res.data);
    } catch (err) {
      console.error('[PoolFund] Failed to fetch pools:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to load pools');
      setTimeout(() => setError(''), 10000);
      if (err.response?.status === 401) {
        setToken('');
        localStorage.removeItem('token');
        history.push('/login');
      }
    }
  };

  const handleFetchLeaderboard = async (poolId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/pools/leaderboard/${poolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaderboard(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch leaderboard');
      setTimeout(() => setError(''), 10000);
    }
  };

  const handleReleasePool = async (poolId) => {
    try {
      const res = await axios.post(
        `http://localhost:5000/api/pools/release/${poolId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPools((prev) =>
        prev.map((p) => (p._id === poolId ? { ...p, status: res.data.status } : p))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to release pool funds');
      setTimeout(() => setError(''), 10000);
      if (err.response?.status === 401) {
        setToken('');
        localStorage.removeItem('token');
        history.push('/login');
      }
    }
  };

  useEffect(() => {
    fetchUser();
    fetchPools();
    socket.on('poolUpdate', ({ poolId, currentAmount, status }) => {
      setPools((prev) =>
        prev.map((p) => (p._id === poolId ? { ...p, currentAmount, status } : p))
      );
    });
    socket.on('connect_error', (err) => {
      console.error('[Socket.IO] Connection error:', err.message);
    });
    return () => {
      socket.off('poolUpdate');
      socket.off('connect_error');
    };
  }, [token, history, setToken]);

  return (
    <div className="dashboard" style={{ padding: '20px' }}>
      <div className="stars-background"></div>
      <h1>PoolFund</h1>
      {error && <p className="error">{error}</p>}
      <motion.button
        onClick={() => history.push('/create-pool')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="create-pool-btn"
      >
        <IoPeople style={{ marginRight: '8px' }} /> Create New Pool
      </motion.button>
      {pools.length > 0 ? (
        <div className="grid" style={{ display: 'grid', gap: '20px' }}>
          {pools.map((pool) => (
            <div key={pool._id} className="card">
              <h5>{pool.name}</h5>
              <p>{pool.description}</p>
              <p>
                Goal: {pool.goalAmount} {pool.currency}
              </p>
              <p>
                Raised: {pool.currentAmount} {pool.currency}
              </p>
              <p>Deadline: {new Date(pool.deadline).toLocaleString()}</p>
              <p>Status: {pool.status}</p>
              <p>Creator: {pool.creator.username}</p>
              <QRCodeCanvas
                value={`http://localhost:3000/pool/${pool._id}`}
                size={64}
              />
              <motion.button
                onClick={() => handleFetchLeaderboard(pool._id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ margin: '10px 10px 0 0', padding: '5px 10px' }}
              >
                View Leaderboard
              </motion.button>
              {pool.creator._id === user?._id && pool.status !== 'active' && (
                <motion.button
                  onClick={() => handleReleasePool(pool._id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ marginTop: '10px', padding: '5px 10px' }}
                >
                  Release Funds
                </motion.button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>No pools available. Create one to get started!</p>
      )}
      {leaderboard.length > 0 && (
        <div className="leaderboard" style={{ marginTop: '20px' }}>
          <h3>Leaderboard</h3>
          <ul>
            {leaderboard.map((entry, index) => (
              <li key={index}>
                {entry.username}: {entry.amount} {entry.currency}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PoolFund;