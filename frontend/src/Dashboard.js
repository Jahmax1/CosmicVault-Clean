// C:\Users\HP\CosmicVault-New\frontend\src\Dashboard.js
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { IoMoon, IoSunny, IoWallet, IoSend, IoSave, IoRocket, IoGift } from 'react-icons/io5';
import { QRCodeCanvas } from 'qrcode.react';
import '../Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = ({ token, setToken, onTokenInvalid }) => {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState([]);
  const [deposit, setDeposit] = useState({ amount: '', currency: 'USD' });
  const [withdraw, setWithdraw] = useState({ amount: '', currency: 'USD' });
  const [send, setSend] = useState({ amount: '', currency: 'USD', recipient: '', transferType: 'cosmicvault', isInternational: false });
  const [savings, setSavings] = useState({ name: '', amount: '', currency: 'USD', type: 'accessible' });
  const [investment, setInvestment] = useState({ name: '', amount: '', currency: 'USD', type: 'basic' });
  const [redeem, setRedeem] = useState({ points: '' });
  const [recipientDetails, setRecipientDetails] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const history = useHistory();

  const fetchUser = async () => {
    if (!token) {
      console.log('No token available, redirecting to login');
      onTokenInvalid();
      history.push('/login');
      return;
    }
    try {
      console.log('Fetching user data with token:', token);
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch user data:', err.response?.data, err.message);
      if (err.response?.status === 401) {
        console.log('Unauthorized, attempting token refresh');
        await refreshToken();
      } else {
        setError('Failed to load user data. Please try again.');
        setTimeout(() => setError(''), 10000);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/refresh', { token });
      const newToken = res.data.token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      console.log('Token refreshed successfully');
      await fetchUser();
    } catch (err) {
      console.error('Token refresh failed:', err.response?.data, err.message);
      onTokenInvalid();
      history.push('/login');
    }
  };

  useEffect(() => {
    document.body.className = theme;
    fetchUser();
  }, [theme, token, history, onTokenInvalid]);

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    history.push('/login');
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
      const res = await axios.post('http://localhost:5000/api/deposit', { amount: parsedAmount, currency: deposit.currency }, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const res = await axios.post('http://localhost:5000/api/withdraw', { amount: parsedAmount, currency: withdraw.currency }, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const res = await axios.get(`http://localhost:5000/api/verify-wallet?walletId=${send.recipient}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      setSend({ amount: '', currency: 'USD', recipient: '', transferType: 'cosmicvault', isInternational: false });
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
      const res = await axios.post('http://localhost:5000/api/savings', { ...savings, amount: parsedAmount }, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const res = await axios.post('http://localhost:5000/api/investments', { ...investment, amount: parsedAmount }, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const res = await axios.post('http://localhost:5000/api/redeem', { points: parsedPoints }, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const handleDismissNotification = (index) => {
    setNotifications(notifications.filter((_, i) => i !== index));
  };

  const chartData = {
    labels: user?.transactions?.map(t => new Date(t.date).toLocaleDateString()) || [],
    datasets: [{
      label: 'Balance Trend',
      data: user?.transactions?.map(t => t.amount) || [],
      borderColor: '#ffd700',
      backgroundColor: 'rgba(255, 215, 0, 0.2)',
    }],
  };

  return (
    <div className="dashboard">
      <div className="stars-background"></div>
      <header className="dashboard-header">
        <h1>CosmicVault Dashboard</h1>
        <div className="header-actions">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            {theme === 'dark' ? <IoSunny /> : <IoMoon />}
          </button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>
      {error && <p className="error">{error}</p>}
      {notifications.map((note, index) => (
        <div key={index} className="notification">
          {note}
          <button onClick={() => handleDismissNotification(index)} className="ml-2 text-sm">Dismiss</button>
        </div>
      ))}
      {loading ? (
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
            <p>USD: ${user.balances.USD.toFixed(2)}</p>
            <p>EUR: €{user.balances.EUR.toFixed(2)}</p>
            <p>GBP: £{user.balances.GBP.toFixed(2)}</p>
            <p>Stardust Points: {user.stardustPoints}</p>
          </section>
          <section className="referral">
            <h2>Wallet ID</h2>
            <p>{user.walletId}</p>
            <QRCodeCanvas value={`http://localhost:3000/register?wallet=${user.walletId}`} size={128} />
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
              <select value={deposit.currency} onChange={(e) => setDeposit({ ...deposit, currency: e.target.value })}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
              <select value={withdraw.currency} onChange={(e) => setWithdraw({ ...withdraw, currency: e.target.value })}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
              <select value={send.currency} onChange={(e) => setSend({ ...send, currency: e.target.value })}>
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
              <select value={send.transferType} onChange={(e) => setSend({ ...send, transferType: e.target.value })}>
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
              <select value={savings.currency} onChange={(e) => setSavings({ ...savings, currency: e.target.value })}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <select value={savings.type} onChange={(e) => setSavings({ ...savings, type: e.target.value })}>
                <option value="accessible">Accessible</option>
                <option value="fixed">Fixed</option>
              </select>
              <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
              <select value={investment.currency} onChange={(e) => setInvestment({ ...investment, currency: e.target.value })}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <select value={investment.type} onChange={(e) => setInvestment({ ...investment, type: e.target.value })}>
                <option value="basic">Basic</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
              <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
              <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <IoGift /> Redeem
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
              {user.savings.map((saving, index) => (
                <div key={index} className="card">
                  <h5>{saving.name}</h5>
                  <p>Amount: ${saving.amount} {saving.currency}</p>
                  <p>Type: {saving.type}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="investments">
            <h2>Your Investments</h2>
            <div className="grid">
              {user.investments.map((inv, index) => (
                <div key={index} className={`card ${inv.type}`}>
                  <h5>{inv.name}</h5>
                  <p>Amount: ${inv.amount} {inv.currency}</p>
                  <p>Type: {inv.type}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="transactions">
            <h2>Transaction History</h2>
            <div className="space-y-4">
              {user.transactions.map((tx) => (
                <div key={tx._id} className="card flex">
                  <div>
                    <p>
                      {tx.type} {tx.amount ? `$${tx.amount} ${tx.currency}` : `${tx.points} Points`}
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
            <img src={`http://localhost:5000/${recipientDetails.selfiePath}`} alt="Recipient Selfie" />
            <div className="modal-actions">
              <button onClick={() => setShowConfirm(false)}>Cancel</button>
              <motion.button onClick={handleSend} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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