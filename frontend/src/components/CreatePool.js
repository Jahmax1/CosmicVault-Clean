import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { IoPeople } from 'react-icons/io5';

function CreatePool({ token, setToken }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goalAmount: '',
    currency: 'USD',
    deadline: '',
    recipientWalletId: '',
    isPublic: true,
  });
  const [error, setError] = useState('');
  const history = useHistory();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const parsedGoalAmount = parseFloat(formData.goalAmount);
      if (isNaN(parsedGoalAmount) || parsedGoalAmount <= 0) {
        setError('Goal amount must be a positive number');
        setTimeout(() => setError(''), 10000);
        return;
      }
      await axios.post(
        'http://localhost:5000/api/pools/create',
        { ...formData, goalAmount: parsedGoalAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('[CreatePool] Pool created successfully');
      history.push('/pools');
    } catch (err) {
      console.error('[CreatePool] Failed to create pool:', err);
      setError(err.response?.data?.message || 'Failed to create pool');
      setTimeout(() => setError(''), 10000);
      if (err.response?.status === 401) {
        setToken('');
        localStorage.removeItem('token');
        history.push('/login');
      }
    }
  };

  return (
    <div className="dashboard" style={{ padding: '20px' }}>
      <div className="stars-background"></div>
      <h1>Create a New Pool</h1>
      {error && <p className="error">{error}</p>}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Name:
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Description:
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '5px',
                height: '100px',
              }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Goal Amount:
            <input
              type="number"
              name="goalAmount"
              value={formData.goalAmount}
              onChange={handleChange}
              min="1"
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Currency:
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </label>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Deadline:
            <input
              type="datetime-local"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Recipient Wallet ID:
            <input
              type="text"
              name="recipientWalletId"
              value={formData.recipientWalletId}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            Public Pool:
            <input
              type="checkbox"
              name="isPublic"
              checked={formData.isPublic}
              onChange={handleChange}
              style={{ marginLeft: '10px' }}
            />
          </label>
        </div>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="create-pool-btn"
        >
          <IoPeople style={{ marginRight: '8px' }} /> Create Pool
        </motion.button>
      </motion.form>
    </div>
  );
}

export default CreatePool;