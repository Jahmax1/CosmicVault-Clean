import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreatePool = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goalAmount: '',
    currency: 'USD',
    deadline: '',
    signatoryWalletIds: ['', ''],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('signatoryWalletId')) {
      const index = parseInt(name.split('-')[1]);
      const newSignatoryWalletIds = [...formData.signatoryWalletIds];
      newSignatoryWalletIds[index] = value;
      setFormData({ ...formData, signatoryWalletIds: newSignatoryWalletIds });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/pools/create',
        {
          name: formData.name,
          description: formData.description,
          goalAmount: parseFloat(formData.goalAmount),
          currency: formData.currency,
          deadline: formData.deadline,
          signatoryWalletIds: formData.signatoryWalletIds,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Pool created:', response.data);
      navigate('/pools');
    } catch (err) {
      console.error('Error creating pool:', err);
      setError(err.response?.data?.message || 'Failed to create pool');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="bg-gray-800 bg-opacity-80 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Create Funding Pool</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Pool Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 bg-gray-700 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-2 bg-gray-700 rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Goal Amount</label>
            <input
              type="number"
              name="goalAmount"
              value={formData.goalAmount}
              onChange={handleChange}
              className="w-full p-2 bg-gray-700 rounded"
              min="1"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Currency</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full p-2 bg-gray-700 rounded"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Deadline</label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className="w-full p-2 bg-gray-700 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Signatory 1 Wallet ID</label>
            <input
              type="text"
              name="signatoryWalletId-0"
              value={formData.signatoryWalletIds[0]}
              onChange={handleChange}
              className="w-full p-2 bg-gray-700 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Signatory 2 Wallet ID</label>
            <input
              type="text"
              name="signatoryWalletId-1"
              value={formData.signatoryWalletIds[1]}
              onChange={handleChange}
              className="w-full p-2 bg-gray-700 rounded"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 py-2 rounded hover:from-purple-600 hover:to-blue-600 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Pool'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePool;