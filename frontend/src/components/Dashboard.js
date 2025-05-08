// C:\Users\HP\CosmicVault-New\frontend\src\components\Dashboard.js
import { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  IoMoon,
  IoSunny,
  IoWallet,
  IoSend,
  IoSave,
  IoRocket,
  IoGift,
  IoPeople,
} from 'react-icons/io5';
import { QRCodeCanvas } from 'qrcode.react';
import io from 'socket.io-client';
import '../Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const socket = io('http://localhost:5000', {
  auth: { token: localStorage.getItem('token') },
  reconnection: true,
  reconnectionAttempts: 5, // Increased for stability
  reconnectionDelay: 3000,
});

const Dashboard = ({ token, setToken }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('userData');
    return cached ? JSON.parse(cached) : null;
  });
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState([]);
  const [deposit, setDeposit] = useState({ amount: '', currency: 'USD' });
  const [withdraw, setWithdraw] = useState({ amount: '', currency: 'USD' });
  const [send, setSend] = useState({
    amount: '',
    currency: 'USD',
    recipient: '',
    transferType: 'cosmicvault',
    isInternational: false,
  });
  const [savings, setSavings] = useState({
    name: '',
    amount: '',
    currency: 'USD',
    type: 'accessible',
  });
  const [investment, setInvestment] = useState({
    name: '', // Fixed syntax
    amount: '',
    currency: 'USD',
    type: 'basic',
  });
  const [redeem, setRedeem] = useState({ points: '' });
  const [poolContribution, setPoolContribution] = useState({
    poolId: '',
    amount: '',
    currency: 'USD',
  });
  const [pools, setPools] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recipientDetails, setRecipientDetails] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const history = useHistory();

  const fetchUser = useCallback(async (retryAttempt = 0) => {
    if (!token) {
      setError('No token available. Please log in.');
      setLoading(false);
      return;
    }

    if (retryAttempt >= maxRetries) {
      setError('Failed to load user data. Please check your connection or try again.');
      setLoading(false);
      return;
    }

    try {
      console.log('[fetchUser] Fetching user data with token:', token);
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[fetchUser] User data fetched:', res.data);
      setUser(res.data);
      localStorage.setItem('userData', JSON.stringify(res.data));
      setError('');
      setRetryCount(0);
    } catch (err) {
      console.error('[fetchUser] Failed to fetch user data:', err.message);
      if (err.response?.status === 401 && retryAttempt < maxRetries) {
        console.log('[fetchUser] Unauthorized, attempting token refresh');
        await refreshToken(retryAttempt + 1);
      } else {
        setError('Failed to load user data. Please check your connection or try again.');
        setRetryCount(retryAttempt + 1);
        setTimeout(() => fetchUser(retryAttempt + 1), 5000);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPools = useCallback(async (retryAttempt = 0) => {
    if (!token) {
      setError('No token available. Please log in.');
      return;
    }

    if (retryAttempt >= maxRetries) {
      setError('Failed to load pools. Please check your connection or try again.');
      return;
    }

    try {
      console.log('[fetchPools] Fetching pools with token:', token);
      const res = await axios.get('http://localhost:5000/api/pools/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[fetchPools] Pools fetched:', res.data);
      setPools(res.data);
      setRetryCount(0);
    } catch (err) {
      console.error('[fetchPools] Failed to fetch pools:', err.message);
      if (err.response?.status === 401 && retryAttempt < maxRetries) {
        console.log('[fetchPools] Unauthorized, attempting token refresh');
        await refreshToken(retryAttempt + 1);
      } else {
        setError('Failed to load pools. Please check your connection or try again.');
        setRetryCount(retryAttempt + 1);
        setTimeout(() => fetchPools(retryAttempt + 1), 5000);
      }
    }
  }, [token]);

  const refreshToken = useCallback(async (retryAttempt = 0) => {
    if (retryAttempt >= maxRetries) {
      setError('Session expired. Please log in again.');
      setTimeout(() => {
        setToken('');
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        history.push('/login');
      }, 5000);
      return;
    }

    try {
      console.log('[refreshToken] Attempting to refresh token');
      const res = await axios.post('http://localhost:5000/api/auth/refresh', { token });
      const newToken = res.data.token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      console.log('[refreshToken] Token refreshed successfully');
      await fetchUser(0);
      await fetchPools(0);
    } catch (err) {
      console.error('[refreshToken] Token refresh failed:', err.message);
      setError('Session expired. Please log in again.');
      setTimeout(() => {
        setToken('');
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        history.push('/login');
      }, 5000);
    }
  }, [setToken, history]);

  useEffect(() => {
    document.body.className = theme;

    if (token) {
      fetchUser();
      fetchPools();
    } else {
      setError('No token found. Redirecting to login...');
      setTimeout(() => {
        localStorage.removeItem('userData');
        history.push('/login');
      }, 5000);
    }

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to server');
      if (user?._id) {
        socket.emit('joinRoom', user._id.toString());
        pools.forEach((pool) => {
          socket.emit('joinRoom', pool._id.toString());
        });
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket.IO] Connection error:', err.message);
      setError('Failed to connect to server. Please ensure the backend is running.');
    });

    socket.on('balanceUpdate', ({ currency, balance }) => {
      console.log('[Socket.IO] Balance update received:', { currency, balance });
      setUser((prev) => {
        const updated = {
          ...prev,
          balances: { ...prev.balances, [currency]: balance },
        };
        localStorage.setItem('userData', JSON.stringify(updated));
        return updated;
      });
    });

    socket.on('pointsUpdate', ({ stardustPoints }) => {
      console.log('[Socket.IO] Points update received:', stardustPoints);
      setUser((prev) => {
        const updated = { ...prev, stardustPoints };
        localStorage.setItem('userData', JSON.stringify(updated));
        return updated;
      });
    });

    socket.on('poolUpdate', ({ poolId, currentAmount, status }) => {
      console.log('[Socket.IO] Pool update received:', { poolId, currentAmount, status });
      setPools((prev) =>
        prev.map((p) => (p._id === poolId ? { ...p, currentAmount, status } : p))
      );
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('balanceUpdate');
      socket.off('pointsUpdate');
      socket.off('poolUpdate');
    };
  }, [theme, token, user?._id, pools]);

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    history.push('/login');
  };

  const handleRetry = () => {
    setError('');
    setRetryCount(0);
    fetchUser();
    fetchPools();
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    try {
      const parsedAmount = parseFloat(deposit.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Amount must be a positive number');
        setTimeout(() => setError(''), 10000);
        return;
      }
      const res = await axios.post(
        'http://localhost:5000/api/deposit',
        { amount: parsedAmount, currency: deposit.currency },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications([...notifications, res.data.message]);
      await fetchUser();
      setDeposit({ amount: '', currency: 'USD' });
    } catch (err) {
      if (err.response?.status === 401) {
        await refreshToken();
      } else {
        setError(err.response?.data?.message || 'Failed to deposit');
        setTimeout(() => setError(''), 10000);
      }
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      const parsedAmount = parseFloat(withdraw.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Amount must be a positive number');
        setTimeout(() => setError(''), 10000);
        return;
      }
      const res = await axios.post(
        'http://localhost:5000/api/withdraw',
        { amount: parsedAmount, currency: withdraw.currency },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications([...notifications, res.data.message]);
      await fetchUser();
      setWithdraw({ amount: '', currency: 'USD' });
    } catch (err) {
      if (err.response?.status === 401) {
        await refreshToken();
      } else {
        setError(err.response?.data?.message || 'Failed to withdraw');
        setTimeout(() => setError(''), 10000);
      }
    }
  };

  const handleVerifyRecipient = async () => {
    if (!send.recipient) {
      setError('Please enter a recipient wallet ID');
      setTimeout(() => setError(''), 10000);
      return;
    }
    try {
      const res = await axios.get(
        `http://localhost:5000/api/verify-wallet?walletId=${send.recipient}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecipientDetails(res.data);
      setShowConfirm(true);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        await refreshToken();
      } else {
        setError(err.response?.data?.message || 'Failed to verify recipient');
        setRecipientDetails(null);
        setShowConfirm(false);
        setTimeout(() => setError(''), 10000);
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!send.amount || !send.recipient || !recipientDetails) {
      setError('Please verify the recipient before sending');
      setTimeout(() => setError(''), 10000);
      return;
    }
    try {
      const parsedAmount = parseFloat(send.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Amount must be a positive number');
        setTimeout(() => setError(''), 10000);
        return;
      }
      const payload = {
        amount: parsedAmount,
        currency: send.currency,
        recipientWalletId: send.recipient,
        transferType: send.transferType,
        isInternational: send.isInternational,
      };
      const res = await axios.post('http://localhost:5000/api/send', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([...notifications, res.data.message]);
      await fetchUser();
      setSend({
        amount: '',
        currency: 'USD',
        recipient: '',
        transferType: 'cosmicvault',
        isInternational: false,
      });
      setRecipientDetails(null);
      setShowConfirm(false);
    } catch (err) {
      if (err.response?.status === 401) {
        await refreshToken();
      } else {
        setError(err.response?.data?.message || 'Failed to send');
        setTimeout(() => setError(''), 10000);
      }
    }
  };

  const handleSavings = async (e) => {
    e.preventDefault();
    try {
      const parsedAmount = parseFloat(savings.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Amount must be a positive number');
        setTimeout(() => setError(''), 10000);
        return;
      }
      const res = await axios.post(
        'http://localhost:5000/api/savings',
        { ...savings, amount: parsedAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications([...notifications, res.data.message]);
      await fetchUser();
      setSavings({ name: '', amount: '', currency: 'USD', type: 'accessible' });
    } catch (err) {
      if (err.response?.status === 401) {
        await refreshToken();
      } else {
        setError(err.response?.data?.message || 'Failed to create savings');
        setTimeout(() => setError(''), 10000);
      }
    }
  };

  const handleInvestment = async (e) => {
    e.preventDefault();
    try {
      const parsedAmount = parseFloat(investment.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Amount must be a positive number');
        setTimeout(() => setError(''), 10000);
        return;
      }
      const res = await axios.post(
        'http://localhost:5000/api/investments',
        { ...investment, amount: parsedAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications([...notifications, res.data.message]);
      await fetchUser();
      setInvestment({ name: '', amount: '', currency: 'USD', type: 'basic' });
    } catch (err) {
      if (err.response?.status === 401) {
        await refreshToken();
      } else {
        setError(err.response?.data?.message || 'Failed to create investment');
        setTimeout(() => setError(''), 10000);
      }
    }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    try {
      const parsedPoints = parseFloat(redeem.points);
      if (isNaN(parsedPoints) || parsedPoints <= 0) {
        setError('Points must be a positive number');
        setTimeout(() => setError(''), 10000);
        return;
      }
      const res = await axios.post(
        'http://localhost:5000/api/redeem',
        { points: parsedPoints },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications([...notifications, res.data.message]);
      await fetchUser();
      setRedeem({ points: '' });
    } catch (err) {
      if (err.response?.status === 401) {
        await refreshToken();
      } else {
        setError(err.response?.data?.message || 'Failed to redeem');
        setTimeout(() => setError(''), 10000);
      }
    }
  };

  const handleContributePool = async (e) => {
    e.preventDefault();
    try {
      const parsedAmount = parseFloat(poolContribution.amount);
      if (isNaN(parsedAmount) || parsedAmount < 1) {
        setError('Contribution amount must be at least 1');
        setTimeout(() => setError(''), 10000);
        return;
      }
      const res = await axios.post(
        'http://localhost:5000/api/pools/contribute',
        {
          poolId: poolContribution.poolId,
          amount: parsedAmount,
          currency: poolContribution.currency,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications([...notifications, res.data.message]);
      await fetchPools();
      await fetchUser();
      setPoolContribution({ poolId: '', amount: '', currency: 'USD' });
    } catch (err) {
      if (err.response?.status === 401) {
        await refreshToken();
      } else {
        setError(err.response?.data?.message || 'Failed to contribute to pool');
        setTimeout(() => setError(''), 10000);
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
      setNotifications([...notifications, res.data.message]);
      await fetchPools();
      await fetchUser();
    } catch (err) {
      if (err.response?.status === 401) {
        await refreshToken();
      } else {
        setError(err.response?.data?.message || 'Failed to release pool funds');
        setTimeout(() => setError(''), 10000);
      }
    }
  };

  const handleDismissNotification = (index) => {
    setNotifications(notifications.filter((_, i) => i !== index));
  };

  const chartData = {
    labels: user?.transactions?.map((t) => new Date(t.date).toLocaleDateString()) || [],
    datasets: [
      {
        label: 'Balance Trend',
        data: user?.transactions?.map((t) => t.amount) || [],
        borderColor: '#ffd700',
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
      },
    ],
  };

  return (
    <div className="dashboard">
      <div className="stars-background"></div>
      <header className="dashboard-header">
        <h1>CosmicVault Dashboard</h1>
        <div className="header-actions">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <IoSunny /> : <IoMoon />}
          </button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>
      {error && (
        <div className="error">
          {error}
          <div>
            <button onClick={() => setError('')} className="ml-2 text-sm">
              Dismiss
            </button>
            <button onClick={handleRetry} className="ml-2 text-sm">
              Retry
            </button>
          </div>
        </div>
      )}
      {notifications.map((note, index) => (
        <div key={index} className="notification">
          {note}
          <button onClick={() => handleDismissNotification(index)} className="ml-2 text-sm">
            Dismiss
          </button>
        </div>
      ))}
      {loading && !user ? (
        <p>Loading user data...</p>
      ) : user ? (
        <motion.div
          className="dashboard-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <section className="balances">
            <h2>Balances</h2>
            <p>USD: ${user.balances?.USD?.toFixed(2) || '0.00'}</p>
            <p>EUR: €{user.balances?.EUR?.toFixed(2) || '0.00'}</p>
            <p>GBP: £{user.balances?.GBP?.toFixed(2) || '0.00'}</p>
            <p>Stardust Points: {user.stardustPoints || 0}</p>
          </section>
          <section className="referral">
            <h2>Wallet ID</h2>
            <p>{user.walletId}</p>
            <QRCodeCanvas
              value={`http://localhost:3000/register?wallet=${user.walletId}`}
              size={128}
            />
          </section>
          <section className="pools">
            <h2>Funding Pools</h2>
            <div className="pool-actions">
              <motion.button
                onClick={() => history.push('/create-pool')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="create-pool-btn"
              >
                <IoPeople /> Create New Pool
              </motion.button>
              <motion.button
                onClick={() => history.push('/pools')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="view-pools-btn"
              >
                View All Pools
              </motion.button>
            </div>
            {pools.length === 0 ? (
              <p>No funding pools available. Create one to get started!</p>
            ) : (
              <div className="grid">
                {pools.map((p) => (
                  <div key={p._id} className="card">
                    <h5>{p.name}</h5>
                    <p>{p.description}</p>
                    <p>Goal: {p.goalAmount} {p.currency}</p>
                    <p>Raised: {p.currentAmount} {p.currency}</p>
                    <p>Deadline: {new Date(p.deadline).toLocaleString()}</p>
                    <p>Status: {p.status}</p>
                    <p>Creator: {p.creator?.username || 'Unknown'}</p>
                    <QRCodeCanvas
                      value={`http://localhost:3000/pool/${p._id}`}
                      size={64}
                    />
                    <motion.button
                      onClick={() => handleFetchLeaderboard(p._id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      View Leaderboard
                    </motion.button>
                    {p.creator?._id === user._id && p.status === 'completed' && (
                      <motion.button
                        onClick={() => handleReleasePool(p._id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Release Funds
                      </motion.button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {leaderboard.length > 0 && (
              <div className="leaderboard">
                <h3>Leaderboard</h3>
                <ul>
                  {leaderboard.map((entry, index) => (
                    <li key={index}>
                      {entry.username}: {entry.amount}{' '}
                      {pools.find((p) => p._id === poolContribution.poolId)?.currency || 'USD'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <section className="forms">
            <h2>Transactions</h2>
            <form onSubmit={handleDeposit}>
              <h3>Deposit</h3>
              <input
                type="number"
                value={deposit.amount}
                onChange={(e) => setDeposit({ ...deposit, amount: e.target.value })}
                placeholder="Amount"
                required
              />
              <select
                value={deposit.currency}
                onChange={(e) => setDeposit({ ...deposit, currency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <IoWallet /> Deposit
              </motion.button>
            </form>
            <form onSubmit={handleWithdraw}>
              <h3>Withdraw</h3>
              <input
                type="number"
                value={withdraw.amount}
                onChange={(e) => setWithdraw({ ...withdraw, amount: e.target.value })}
                placeholder="Amount"
                required
              />
              <select
                value={withdraw.currency}
                onChange={(e) => setWithdraw({ ...withdraw, currency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <IoWallet /> Withdraw
              </motion.button>
            </form>
            <form onSubmit={handleSend}>
              <h3>Transfer Funds</h3>
              <input
                type="number"
                value={send.amount}
                onChange={(e) => setSend({ ...send, amount: e.target.value })}
                placeholder="Amount"
                required
              />
              <select
                value={send.currency}
                onChange={(e) => setSend({ ...send, currency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <input
                type="text"
                value={send.recipient}
                onChange={(e) => setSend({ ...send, recipient: e.target.value })}
                placeholder="Recipient Wallet ID"
                required
              />
              <select
                value={send.transferType}
                onChange={(e) => setSend({ ...send, transferType: e.target.value })}
              >
                <option value="cosmicvault">CosmicVault Wallet</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank">Bank</option>
                <option value="exness">Exness</option>
                <option value="binance">Binance</option>
              </select>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={send.isInternational}
                  onChange={(e) => setSend({ ...send, isInternational: e.target.checked })}
                  className="mr-2"
                />
                International Transfer
              </label>
              <motion.button
                type="button"
                onClick={handleVerifyRecipient}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Verify Recipient
              </motion.button>
            </form>
            <form onSubmit={handleSavings}>
              <h3>Create Savings Goal</h3>
              <input
                type="text"
                value={savings.name}
                onChange={(e) => setSavings({ ...savings, name: e.target.value })}
                placeholder="Goal Name"
                required
              />
              <input
                type="number"
                value={savings.amount}
                onChange={(e) => setSavings({ ...savings, amount: e.target.value })}
                placeholder="Amount"
                required
              />
              <select
                value={savings.currency}
                onChange={(e) => setSavings({ ...savings, currency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <select
                value={savings.type}
                onChange={(e) => setSavings({ ...savings, type: e.target.value })}
              >
                <option value="accessible">Accessible</option>
                <option value="fixed">Fixed</option>
              </select>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <IoSave /> Save
              </motion.button>
            </form>
            <form onSubmit={handleInvestment}>
              <h3>Start Investment</h3>
              <input
                type="text"
                value={investment.name}
                onChange={(e) => setInvestment({ ...investment, name: e.target.value })}
                placeholder="Investment Name"
                required
              />
              <input
                type="number"
                value={investment.amount}
                onChange={(e) => setInvestment({ ...investment, amount: e.target.value })}
                placeholder="Amount"
                required
              />
              <select
                value={investment.currency}
                onChange={(e) => setInvestment({ ...investment, currency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <select
                value={investment.type}
                onChange={(e) => setInvestment({ ...investment, type: e.target.value })}
              >
                <option value="basic">Basic</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <IoRocket /> Invest
              </motion.button>
            </form>
            <form onSubmit={handleRedeem}>
              <h3>Redeem Stardust Points</h3>
              <input
                type="number"
                value={redeem.points}
                onChange={(e) => setRedeem({ ...redeem, points: e.target.value })}
                placeholder="Points to Redeem"
                required
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <IoGift /> Redeem
              </motion.button>
            </form>
            <form onSubmit={handleContributePool}>
              <h3>Contribute to Pool</h3>
              <select
                value={poolContribution.poolId}
                onChange={(e) => {
                  const selectedPool = pools.find((p) => p._id === e.target.value);
                  setPoolContribution({
                    ...poolContribution,
                    poolId: e.target.value,
                    currency: selectedPool?.currency || 'USD',
                  });
                }}
                required
              >
                <option value="">Select Pool</option>
                {pools.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={poolContribution.amount}
                onChange={(e) => setPoolContribution({ ...poolContribution, amount: e.target.value })}
                placeholder="Contribution Amount"
                required
              />
              <select value={poolContribution.currency} disabled>
                <option value={poolContribution.currency}>{poolContribution.currency}</option>
              </select>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <IoPeople /> Contribute
              </motion.button>
            </form>
          </section>
          <section className="chart">
            <h2>Balance Trend</h2>
            <Line data={chartData} />
          </section>
          <section className="savings">
            <h2>Your Savings</h2>
            <div className="grid">
              {user.savings?.map((saving, index) => (
                <div key={index} className="card">
                  <h5>{saving.name}</h5>
                  <p>
                    Amount: ${saving.amount} {saving.currency}
                  </p>
                  <p>Type: {saving.type}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="investments">
            <h2>Your Investments</h2>
            <div className="grid">
              {user.investments?.map((inv, index) => (
                <div key={index} className={`card ${inv.type}`}>
                  <h5>{inv.name}</h5>
                  <p>
                    Amount: ${inv.amount} {inv.currency}
                  </p>
                  <p>Type: {inv.type}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="transactions">
            <h2>Transaction History</h2>
            <div className="space-y-4">
              {user.transactions?.map((tx) => (
                <div key={tx._id} className="card flex">
                  <div>
                    <p>
                      {tx.type}{' '}
                      {tx.amount ? `${tx.amount} ${tx.currency}` : `${tx.points} Points`}
                      {tx.poolId && ` (Pool ID: ${tx.poolId})`}
                    </p>
                    <p>{new Date(tx.date).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </motion.div>
      ) : (
        <p>No user data available. Please log in again.</p>
      )}
      {showConfirm && recipientDetails && (
        <motion.div
          className="modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="modal-content">
            <h3>Confirm Recipient</h3>
            <p>Name: {recipientDetails.username}</p>
            <img
              src={`http://localhost:5000/${recipientDetails.selfiePath}`}
              alt="Recipient Selfie"
            />
            <div className="modal-actions">
              <button onClick={() => setShowConfirm(false)}>Cancel</button>
              <motion.button
                onClick={handleSend}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Confirm
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;