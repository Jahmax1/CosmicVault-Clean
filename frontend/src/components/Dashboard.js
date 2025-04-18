// C:\Users\HP\CosmicVault\frontend\src\components\Dashboard.js
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { IoMoon, IoSunny, IoWallet, IoSend, IoSave, IoRocket, IoStar, IoGift } from 'react-icons/io5';
import { QRCodeCanvas } from 'qrcode.react';
import '../Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = ({ token, setToken }) => {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState([]);
  const [deposit, setDeposit] = useState({ amount: '', currency: 'USD' });
  const [withdraw, setWithdraw] = useState({ amount: '', currency: 'USD' });
  const [send, setSend] = useState({ amount: '', currency: 'USD', walletId: '' });
  const [savings, setSavings] = useState({ name: '', amount: '', currency: 'USD', type: 'accessible' });
  const [investment, setInvestment] = useState({ name: '', amount: '', currency: 'USD', type: 'basic' });
  const [redeem, setRedeem] = useState({ points: '' });
  const [error, setError] = useState('');
  const history = useHistory();

  useEffect(() => {
    document.body.className = theme;
    const fetchUser = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/user', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
      } catch (err) {
        console.error('Failed to fetch user:', err.response?.data || err.message);
        setError('Failed to load user data');
        setTimeout(() => setError(''), 3000);
      }
    };
    fetchUser();
  }, [theme, token]);

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    history.push('/login');
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/deposit', deposit, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser({ ...user, balances: { ...user.balances, [deposit.currency]: res.data.balance } });
      setDeposit({ amount: '', currency: 'USD' });
      setNotifications([...notifications, res.data.message]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deposit');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/withdraw', withdraw, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser({ ...user, balances: { ...user.balances, [withdraw.currency]: res.data.balance } });
      setWithdraw({ amount: '', currency: 'USD' });
      setNotifications([...notifications, res.data.message]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to withdraw');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/send', send, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser({ ...user, balances: { ...user.balances, [send.currency]: res.data.balance } });
      setSend({ amount: '', currency: 'USD', walletId: '' });
      setNotifications([...notifications, res.data.message]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSavings = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/savings', savings, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser({ ...user, savings: res.data.savings });
      setSavings({ name: '', amount: '', currency: 'USD', type: 'accessible' });
      setNotifications([...notifications, res.data.message]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create savings');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleInvestment = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/investments', investment, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser({ ...user, investments: res.data.investments });
      setInvestment({ name: '', amount: '', currency: 'USD', type: 'basic' });
      setNotifications([...notifications, res.data.message]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create investment');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/redeem', redeem, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser({ ...user, stardustPoints: res.data.stardustPoints });
      setRedeem({ points: '' });
      setNotifications([...notifications, res.data.message]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to redeem');
      setTimeout(() => setError(''), 3000);
    }
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
        <div key={index} className="notification">{note}</div>
      ))}
      {user ? (
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
          </section>
          <section className="referral">
            <h2>Referral Code</h2>
            <p>{user.referralCode}</p>
            <QRCodeCanvas value={`http://localhost:3000/register?ref=${user.referralCode}`} size={128} />
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
              <h3>Send Money</h3>
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
                value={send.walletId}
                onChange={(e) => setSend({ ...send, walletId: e.target.value })}
                placeholder="Recipient Wallet ID"
                required
              />
              <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <IoSend /> Send
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
        </motion.div>
      ) : (
        <p>Loading user data...</p>
      )}
    </div>
  );
};

export default Dashboard;