import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import '../App.css';

const PoolFund = () => {
  const [showPools, setShowPools] = useState(false);
  const [pools, setPools] = useState([]);
  const [filteredPools, setFilteredPools] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPool, setSelectedPool] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (showPools) {
      fetchPools();
    }
  }, [showPools]);

  useEffect(() => {
    // Filter pools based on search query
    const filtered = pools.filter(
      (pool) =>
        pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pool.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPools(filtered);
  }, [searchQuery, pools]);

  const fetchPools = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('[PoolFund] Fetching pools');
      const response = await axios.get('http://localhost:5000/api/pools/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[PoolFund] Pools fetched:', response.data);
      setPools(response.data);
      setFilteredPools(response.data);
      setError('');
    } catch (err) {
      console.error('[PoolFund] Fetch error:', err.response?.data, err.message);
      setError(err.response?.data?.message || 'Failed to load pools.');
      toast.error(err.response?.data?.message || 'Failed to load pools.');
      setPools([]);
      setFilteredPools([]);
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async (poolId) => {
    if (!contributionAmount || contributionAmount <= 0) {
      toast.error('Please enter a valid contribution amount.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('[PoolFund] Contributing to pool:', { poolId, amount: contributionAmount });
      const response = await axios.post(
        'http://localhost:5000/api/pools/contribute',
        {
          poolId,
          amount: parseFloat(contributionAmount),
          currency: selectedPool.currency,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('[PoolFund] Contribution success:', response.data);
      toast.success(`Contributed ${contributionAmount} ${selectedPool.currency} to pool!`);
      setContributionAmount('');
      fetchPools(); // Refresh pools
    } catch (err) {
      console.error('[PoolFund] Contribution error:', err.response?.data, err.message);
      toast.error(err.response?.data?.message || 'Failed to contribute to pool.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !showPools) {
    return <p>Loading...</p>;
  }

  return (
    <div className="auth-container">
      <div className="stars-background"></div>
      <motion.div
        className="auth-card max-w-4xl"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold mb-4">Funding Pools</h2>
        {!showPools ? (
          <div className="flex space-x-4">
            <motion.button
              onClick={() => navigate('/create-pool')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-500 py-2 px-4 rounded"
            >
              Create New Pool
            </motion.button>
            <motion.button
              onClick={() => setShowPools(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-green-500 py-2 px-4 rounded"
            >
              View All Pools
            </motion.button>
          </div>
        ) : (
          <div>
            {error && (
              <div className="error mb-4">
                {error}
                <button onClick={() => setError('')} className="ml-2 text-sm">
                  Dismiss
                </button>
              </div>
            )}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search pools by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 rounded bg-gray-800 text-white"
              />
            </div>
            {filteredPools.length === 0 ? (
              <p>No pools available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPools.map((pool) => (
                  <motion.div
                    key={pool._id}
                    className="card cursor-pointer"
                    onClick={() => setSelectedPool(pool)}
                    whileHover={{ scale: 1.02 }}
                  >
                    <h3>{pool.name}</h3>
                    <p>Goal: {pool.goalAmount} {pool.currency}</p>
                    <p>Current: {pool.currentAmount} {pool.currency}</p>
                    <p>Status: {pool.status}</p>
                  </motion.div>
                ))}
              </div>
            )}
            {selectedPool && (
              <motion.div
                className="mt-6 card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <h3>{selectedPool.name}</h3>
                <p>Description: {selectedPool.description || 'No description'}</p>
                <p>Goal: {selectedPool.goalAmount} {selectedPool.currency}</p>
                <p>Current: {selectedPool.currentAmount} {selectedPool.currency}</p>
                <p>Deadline: {new Date(selectedPool.deadline).toLocaleDateString()}</p>
                <p>Creator: {selectedPool.creator?.username || 'Unknown'}</p>
                <p>Signatories: {selectedPool.signatories.map(s => s.user?.username || 'Unknown').join(', ')}</p>
                <p>Status: {selectedPool.status}</p>
                {selectedPool.status === 'active' && (
                  <div className="mt-4">
                    <input
                      type="number"
                      placeholder="Contribution amount"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      className="p-2 rounded bg-gray-800 text-white mr-2"
                    />
                    <motion.button
                      onClick={() => handleContribute(selectedPool._id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-purple-500 py-2 px-4 rounded"
                      disabled={loading}
                    >
                      Contribute
                    </motion.button>
                  </div>
                )}
                <button
                  onClick={() => setSelectedPool(null)}
                  className="mt-2 text-sm text-blue-400"
                >
                  Close
                </button>
              </motion.div>
            )}
            <button
              onClick={() => setShowPools(false)}
              className="mt-4 text-sm text-blue-400"
            >
              Back
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PoolFund;