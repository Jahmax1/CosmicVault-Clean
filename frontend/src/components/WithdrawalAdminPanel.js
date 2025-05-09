import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import '../App.css';

const WithdrawalAdminPanel = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [poolWithdrawals, setPoolWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const [userRes, poolRes] = await Promise.all([
          axios.get('http://localhost:5000/api/admin/withdrawals', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get('http://localhost:5000/api/pools/withdraw/requests/all', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setWithdrawals(userRes.data);
        setPoolWithdrawals(poolRes.data);
      } catch (err) {
        console.error('Fetch Withdrawals - Error:', err.response?.data, err.message);
        setError(err.response?.data?.message || 'Failed to load withdrawals.');
        toast.error(err.response?.data?.message || 'Failed to load withdrawals.');
      } finally {
        setLoading(false);
      }
    };
    fetchWithdrawals();
  }, []);

  const handleApprove = async (withdrawalId, userId, isPool = false, poolId, requestId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (isPool) {
        await axios.post(
          `http://localhost:5000/api/pools/withdraw/approve/${poolId}/${requestId}`,
          { approve: true },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPoolWithdrawals(poolWithdrawals.filter((w) => w._id !== requestId));
      } else {
        await axios.post(
          `http://localhost:5000/api/admin/withdrawals/approve/${withdrawalId}`,
          { userId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setWithdrawals(withdrawals.filter((w) => w._id !== withdrawalId));
      }
      toast.success('Withdrawal approved.');
    } catch (err) {
      console.error('Approve Withdrawal - Error:', err.response?.data, err.message);
      setError(err.response?.data?.message || 'Failed to approve withdrawal.');
      toast.error(err.response?.data?.message || 'Failed to approve withdrawal.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (withdrawalId, userId, isPool = false, poolId, requestId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (isPool) {
        await axios.post(
          `http://localhost:5000/api/pools/withdraw/approve/${poolId}/${requestId}`,
          { approve: false },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPoolWithdrawals(poolWithdrawals.filter((w) => w._id !== requestId));
      } else {
        await axios.post(
          `http://localhost:5000/api/admin/withdrawals/reject/${withdrawalId}`,
          { userId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setWithdrawals(withdrawals.filter((w) => w._id !== withdrawalId));
      }
      toast.success('Withdrawal rejected.');
    } catch (err) {
      console.error('Reject Withdrawal - Error:', err.response?.data, err.message);
      setError(err.response?.data?.message || 'Failed to reject withdrawal.');
      toast.error(err.response?.data?.message || 'Failed to reject withdrawal.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && withdrawals.length === 0 && poolWithdrawals.length === 0) {
    return <p>Loading withdrawals...</p>;
  }

  return (
    <div className="auth-container">
      <div className="stars-background"></div>
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2>Withdrawal Admin Panel</h2>
        {error && (
          <div className="error">
            {error}
            <button onClick={() => setError('')} className="ml-2 text-sm">
              Dismiss
            </button>
          </div>
        )}
        <h3>User Withdrawals</h3>
        {withdrawals.length === 0 ? (
          <p>No pending user withdrawals.</p>
        ) : (
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal._id} className="card flex justify-between items-center">
                <div>
                  <p>User: {withdrawal.user?.username || 'Unknown'}</p>
                  <p>Amount: {withdrawal.amount} {withdrawal.currency}</p>
                  <p>Status: {withdrawal.status}</p>
                  <p>Date: {new Date(withdrawal.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex space-x-2">
                  <motion.button
                    onClick={() => handleApprove(withdrawal._id, withdrawal.userId)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={loading}
                  >
                    Approve
                  </motion.button>
                  <motion.button
                    onClick={() => handleReject(withdrawal._id, withdrawal.userId)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={loading}
                  >
                    Reject
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        )}
        <h3>Pool Withdrawals</h3>
        {poolWithdrawals.length === 0 ? (
          <p>No pending pool withdrawals.</p>
        ) : (
          <div className="space-y-4">
            {poolWithdrawals.map((withdrawal) => (
              <div key={withdrawal._id} className="card flex justify-between items-center">
                <div>
                  <p>Pool: {withdrawal.pool?.name || 'Unknown'}</p>
                  <p>Initiator: {withdrawal.initiator?.username || 'Unknown'}</p>
                  <p>Recipient Wallet: {withdrawal.recipientWalletId}</p>
                  <p>Amount: {withdrawal.amount} {withdrawal.currency}</p>
                  <p>Status: {withdrawal.status}</p>
                  <p>Date: {new Date(withdrawal.createdAt).toLocaleString()}</p>
                  <p>
                    Approvals:{' '}
                    {withdrawal.approvals
                      .map((a) => `${a.user?.username || 'Unknown'}: ${a.approved ? 'Yes' : 'No'}`)
                      .join(', ')}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <motion.button
                    onClick={() =>
                      handleApprove(withdrawal._id, null, true, withdrawal.poolId, withdrawal._id)
                    }
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={loading || withdrawal.status !== 'pending'}
                  >
                    Approve
                  </motion.button>
                  <motion.button
                    onClick={() =>
                      handleReject(withdrawal._id, null, true, withdrawal.poolId, withdrawal._id)
                    }
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={loading || withdrawal.status !== 'pending'}
                  >
                    Reject
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default WithdrawalAdminPanel;