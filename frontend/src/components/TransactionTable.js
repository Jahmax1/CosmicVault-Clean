import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TransactionTable = ({ poolId }) => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewAll, setViewAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [page, viewAll]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/pools/transactions/${poolId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit: 5, viewAll: viewAll.toString() },
      });
      setTransactions(response.data.transactions);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.response?.data?.message || 'Failed to fetch transactions');
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  return (
    <div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading ? (
        <p>Loading transactions...</p>
      ) : (
        <>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="p-2">Type</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Currency</th>
                <th className="p-2">User</th>
                <th className="p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, index) => (
                <tr key={index} className="border-t border-gray-700">
                  <td className="p-2">{tx.type}</td>
                  <td className="p-2">{tx.amount}</td>
                  <td className="p-2">{tx.currency}</td>
                  <td className="p-2">{tx.user?.username || 'Unknown'}</td>
                  <td className="p-2">{new Date(tx.date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!viewAll && total > 5 && (
            <div className="flex justify-between mt-4">
              <button
                onClick={handlePrevPage}
                disabled={page === 1}
                className="bg-blue-500 py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages} (Total: {total})
              </span>
              <button
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="bg-blue-500 py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
          <button
            onClick={() => setViewAll(!viewAll)}
            className="bg-purple-500 py-2 px-4 rounded hover:bg-purple-600 mt-4"
          >
            {viewAll ? 'Show Paginated' : 'View All Transactions'}
          </button>
        </>
      )}
    </div>
  );
};

export default TransactionTable;