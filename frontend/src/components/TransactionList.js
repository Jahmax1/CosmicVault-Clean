import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5000', { withCredentials: true });

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [savings, setSavings] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [balance, setBalance] = useState(0);
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [transferType, setTransferType] = useState('mobile_money');
  const [isInternational, setIsInternational] = useState(false);
  const [savingsName, setSavingsName] = useState('');
  const [savingsTarget, setSavingsTarget] = useState('');
  const [savingsType, setSavingsType] = useState('accessible');
  const [investmentName, setInvestmentName] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [investmentType, setInvestmentType] = useState('basic');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please log in again');
          return;
        }
        const res = await axios.get('http://localhost:5000/api/data', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTransactions(res.data.transactions || []);
        setSavings(res.data.savings || []);
        setInvestments(res.data.investments || []);
        setBalance(res.data.balance || 0);
        setError('');
      } catch (err) {
        console.error('Fetch data failed:', err.response?.data);
        setError('Failed to load data: ' + (err.response?.data?.message || 'Unknown error'));
      }
    };
    fetchData();

    socket.on('transactionUpdate', ({ message, transaction }) => {
      setNotification(message);
      setTransactions((prev) => [...prev, transaction]);
      if (transaction.type === 'send' || transaction.type === 'withdraw') {
        setBalance((prev) => prev - transaction.amount);
      } else if (transaction.type === 'deposit') {
        setBalance((prev) => prev + transaction.amount);
      }
      setTimeout(() => setNotification(''), 5000);
    });

    return () => socket.off('transactionUpdate');
  }, []);

  const handleSend = async (type) => {
    if (!amount || !recipient) {
      setError('Please enter amount and recipient');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/transactions', {
        type,
        transferType,
        amount: parseFloat(amount),
        recipient: { identifier: recipient, provider: transferType === 'mobile_money' ? 'Airtel' : transferType, countryCode: '' },
        isInternational,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalance(res.data.balance);
      setTransactions(res.data.transactions);
      setAmount('');
      setRecipient('');
      setError('');
    } catch (err) {
      setError('Transaction failed: ' + (err.response?.data?.message || 'Unknown error'));
    }
  };

  const handleCreateSavings = async () => {
    if (!savingsName || !savingsTarget) {
      setError('Please enter savings name and target');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/savings', {
        name: savingsName,
        target: parseFloat(savingsTarget),
        type: savingsType,
        fixedAmount: savingsType === 'fixed' ? parseFloat(savingsTarget) : null,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalance(res.data.balance);
      setSavings(res.data.savings);
      setSavingsName('');
      setSavingsTarget('');
      setError('');
    } catch (err) {
      setError('Savings creation failed: ' + (err.response?.data?.message || 'Unknown error'));
    }
  };

  const handleCreateInvestment = async () => {
    if (!investmentName || !investmentAmount) {
      setError('Please enter investment name and amount');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/investments', {
        name: investmentName,
        amount: parseFloat(investmentAmount),
        type: investmentType,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalance(res.data.balance);
      setInvestments(res.data.investments);
      setInvestmentName('');
      setInvestmentAmount('');
      setError('');
    } catch (err) {
      setError('Investment creation failed: ' + (err.response?.data?.message || 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-black text-white font-sans">
      {/* Header Section */}
      <header className="p-6 flex justify-between items-center border-b border-blue-500/30">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          CosmicVault
        </h1>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-red-500/50"
        >
          Logout
        </button>
      </header>

      {/* Main Dashboard */}
      <div className="p-8">
        {notification && (
          <div className="fixed top-4 right-4 bg-gradient-to-r from-green-500 to-teal-500 text-white p-4 rounded-lg shadow-lg animate-slide-in">
            {notification}
          </div>
        )}
        {error && (
          <div className="fixed top-4 right-4 bg-gradient-to-r from-red-500 to-pink-500 text-white p-4 rounded-lg shadow-lg animate-slide-in">
            {error}
          </div>
        )}

        {/* Balance Section */}
        <div className="mb-8 p-6 bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl border border-blue-500/30 shadow-xl">
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Balance: ${balance}
          </h2>
          <p className="text-gray-400 mt-2">Your CosmicVault Wallet</p>
        </div>

        {/* Transfer Section */}
        <div className="mb-12 p-6 bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl border border-blue-500/30 shadow-xl">
          <h3 className="text-2xl font-semibold mb-6 text-blue-400">Transfer Funds</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                className="w-full p-3 rounded-lg bg-gray-900 text-white border border-blue-500/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
              />
            </div>
            <div>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Recipient (e.g., 0700335911, email)"
                className="w-full p-3 rounded-lg bg-gray-900 text-white border border-blue-500/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
              />
            </div>
            <div>
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-900 text-white border border-blue-500/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
              >
                <option value="mobile_money">Mobile Money</option>
                <option value="bank">Bank</option>
                <option value="cosmicvault">CosmicVault Wallet</option>
                <option value="exness">Exness</option>
                <option value="binance">Binance</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center text-gray-300">
                <input
                  type="checkbox"
                  checked={isInternational}
                  onChange={(e) => setIsInternational(e.target.checked)}
                  className="mr-2 accent-blue-500"
                />
                International Transfer
              </label>
            </div>
          </div>
          <div className="mt-6 flex space-x-4">
            <button
              onClick={() => handleSend('send')}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/50"
            >
              Send
            </button>
            <button
              onClick={() => handleSend('deposit')}
              className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 p-3 rounded-lg hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-green-500/50"
            >
              Deposit
            </button>
            <button
              onClick={() => handleSend('withdraw')}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 p-3 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-yellow-500/50"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* Savings Section */}
        <div className="mb-12 p-6 bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl border border-blue-500/30 shadow-xl">
          <h3 className="text-2xl font-semibold mb-6 text-blue-400">Savings Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <input
                type="text"
                value={savingsName}
                onChange={(e) => setSavingsName(e.target.value)}
                placeholder="Savings Name"
                className="w-full p-3 rounded-lg bg-gray-900 text-white border border-blue-500/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
              />
            </div>
            <div>
              <input
                type="number"
                value={savingsTarget}
                onChange={(e) => setSavingsTarget(e.target.value)}
                placeholder="Target Amount"
                className="w-full p-3 rounded-lg bg-gray-900 text-white border border-blue-500/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
              />
            </div>
            <div>
              <select
                value={savingsType}
                onChange={(e) => setSavingsType(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-900 text-white border border-blue-500/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
              >
                <option value="accessible">Accessible</option>
                <option value="fixed">Fixed (30-day lock)</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCreateSavings}
            className="mt-6 w-full bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-purple-500/50"
          >
            Create Savings
          </button>
          <h4 className="text-xl font-semibold mt-8 mb-4 text-blue-400">Your Savings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savings.map((saving, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-blue-500/30 shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
              >
                <h5 className="text-lg font-semibold text-blue-400">{saving.name}</h5>
                <p className="text-gray-300">Progress: ${saving.current}/${saving.target}</p>
                <p className="text-gray-400">Type: {saving.type}</p>
                {saving.lockEndDate && (
                  <p className="text-gray-400">Locked until {new Date(saving.lockEndDate).toLocaleDateString()}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Investments Section */}
        <div className="mb-12 p-6 bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl border border-blue-500/30 shadow-xl">
          <h3 className="text-2xl font-semibold mb-6 text-blue-400">Investment Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <input
                type="text"
                value={investmentName}
                onChange={(e) => setInvestmentName(e.target.value)}
                placeholder="Investment Name"
                className="w-full p-3 rounded-lg bg-gray-900 text-white border border-blue-500/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
              />
            </div>
            <div>
              <input
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                placeholder="Amount"
                className="w-full p-3 rounded-lg bg-gray-900 text-white border border-blue-500/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
              />
            </div>
            <div>
              <select
                value={investmentType}
                onChange={(e) => setInvestmentType(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-900 text-white border border-blue-500/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300"
              >
                <option value="basic">Basic (Low Risk)</option>
                <option value="gold">Gold (Medium Risk)</option>
                <option value="platinum">Platinum (High Risk)</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCreateInvestment}
            className="mt-6 w-full bg-gradient-to-r from-orange-500 to-yellow-500 p-3 rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all duration-300 shadow-lg hover:shadow-orange-500/50"
          >
            Create Investment
          </button>
          <h4 className="text-xl font-semibold mt-8 mb-4 text-blue-400">Your Investments</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {investments.map((inv, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border shadow-lg hover:shadow-lg transition-all duration-300 ${
                  inv.type === 'basic'
                    ? 'bg-gradient-to-br from-green-800 to-green-900 border-green-500/30 hover:shadow-green-500/50'
                    : inv.type === 'gold'
                    ? 'bg-gradient-to-br from-yellow-800 to-yellow-900 border-yellow-500/30 hover:shadow-yellow-500/50'
                    : 'bg-gradient-to-br from-purple-800 to-purple-900 border-purple-500/30 hover:shadow-purple-500/50'
                }`}
              >
                <h5 className="text-lg font-semibold text-blue-400">{inv.name}</h5>
                <p className="text-gray-300">Amount: ${inv.amount}</p>
                <p className="text-gray-400">Type: {inv.type}</p>
                <p className="text-gray-400">Dividends: ${inv.accruedDividends}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions Section */}
        <div className="p-6 bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl border border-blue-500/30 shadow-xl">
          <h3 className="text-2xl font-semibold mb-6 text-blue-400">Transaction History</h3>
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx._id}
                className="p-4 bg-gray-900 rounded-lg flex justify-between items-center border border-blue-500/30 hover:bg-gray-800 transition-all duration-300"
              >
                <div>
                  <p className="text-gray-300">
                    {tx.type} ${tx.amount} {tx.type === 'send' ? 'to' : 'via'} {tx.recipient.identifier} ({tx.transferType})
                    {tx.isInternational ? ' (International)' : ''}
                  </p>
                  <p className="text-gray-500 text-sm">{new Date(tx.date).toLocaleString()}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    tx.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : tx.status === 'pending'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {tx.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;