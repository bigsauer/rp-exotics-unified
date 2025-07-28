import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const PasswordResetAdmin = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { getAuthHeaders } = useAuth();
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch pending requests from backend
  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/pending-password-resets`, {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          setPendingRequests(data.requests || []);
        }
      } catch (error) {
        console.error('Error fetching pending requests:', error);
      }
    };

    fetchPendingRequests();
  }, [API_BASE, getAuthHeaders]);

  const handleApprove = async (request) => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/approve-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          userEmail: request.userEmail,
          newPassword: request.newPassword,
          approved: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve password reset');
      }

      // Remove from pending requests
      const updatedRequests = pendingRequests.filter(req => req.id !== request.id);
      setPendingRequests(updatedRequests);

      setMessage('Password reset approved successfully');
    } catch (error) {
      setMessage('Error approving password reset: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (request) => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/approve-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          userEmail: request.userEmail,
          newPassword: request.newPassword,
          approved: false
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject password reset');
      }

      // Remove from pending requests
      const updatedRequests = pendingRequests.filter(req => req.id !== request.id);
      setPendingRequests(updatedRequests);

      setMessage('Password reset rejected successfully');
    } catch (error) {
      setMessage('Error rejecting password reset: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Password Reset Requests</h1>
        
        {message && (
          <div className={`p-4 rounded-lg mb-4 ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {pendingRequests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No pending password reset requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{request.userName}</h3>
                    <p className="text-gray-600">{request.userEmail}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <strong>Requested Password:</strong> {request.newPassword}
                    </p>
                    <p className="text-sm text-gray-500">
                      <strong>Requested:</strong> {new Date(request.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request)}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordResetAdmin; 