import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  Key, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Building,
  FileText
} from 'lucide-react';

const ApiKeyManagement = () => {
  const { user, getAuthHeaders } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showKey, setShowKey] = useState({});

  // Form states
  const [newApiKey, setNewApiKey] = useState({
    name: '',
    description: '',
    type: 'internal',
    entityId: '',
    entityType: 'User',
    permissions: {
      signAgreements: true,
      viewDocuments: true,
      createSignatures: true
    },
    expiresAt: ''
  });

  const [entities, setEntities] = useState({
    users: [],
    dealers: [],
    deals: []
  });

  const API_BASE = process.env.REACT_APP_API_URL || 'https://astonishing-chicken-production.up.railway.app';

  // Fetch API keys
  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/api/apikeys`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      
      const data = await response.json();
      setApiKeys(data);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch entities for dropdown
  const fetchEntities = async () => {
    try {
      // Fetch users
      const usersResponse = await fetch(`${API_BASE}/api/users`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        setEntities(prev => ({ ...prev, users }));
      }

      // Fetch dealers
      const dealersResponse = await fetch(`${API_BASE}/api/dealers`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (dealersResponse.ok) {
        const dealers = await dealersResponse.json();
        setEntities(prev => ({ ...prev, dealers }));
      }
    } catch (error) {
      console.error('Error fetching entities:', error);
    }
  };

  useEffect(() => {
    fetchApiKeys();
    fetchEntities();
  }, []);

  // Create API key
  const handleCreateApiKey = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/api/apikeys`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newApiKey)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create API key');
      }
      
      const data = await response.json();
      setSuccess('API key created successfully');
      setShowCreateModal(false);
      setNewApiKey({
        name: '',
        description: '',
        type: 'internal',
        entityId: '',
        entityType: 'User',
        permissions: {
          signAgreements: true,
          viewDocuments: true,
          createSignatures: true
        },
        expiresAt: ''
      });
      fetchApiKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Update API key
  const handleUpdateApiKey = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/api/apikeys/${editingKey._id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingKey)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update API key');
      }
      
      setSuccess('API key updated successfully');
      setShowEditModal(false);
      setEditingKey(null);
      fetchApiKeys();
    } catch (error) {
      console.error('Error updating API key:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete API key
  const handleDeleteApiKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/apikeys/${keyId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete API key');
      }
      
      setSuccess('API key deleted successfully');
      fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      setError(error.message);
    }
  };

  // Regenerate API key
  const handleRegenerateApiKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to regenerate this API key? The old key will no longer work.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/apikeys/${keyId}/regenerate`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate API key');
      }
      
      setSuccess('API key regenerated successfully');
      fetchApiKeys();
    } catch (error) {
      console.error('Error regenerating API key:', error);
      setError(error.message);
    }
  };

  // Copy API key to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('API key copied to clipboard');
  };

  // Get entity options based on type
  const getEntityOptions = (entityType) => {
    switch (entityType) {
      case 'User':
        return entities.users.map(user => ({
          value: user._id,
          label: `${user.firstName} ${user.lastName} (${user.email})`
        }));
      case 'Dealer':
        return entities.dealers.map(dealer => ({
          value: dealer._id,
          label: `${dealer.name} (${dealer.email || 'No email'})`
        }));
      case 'Deal':
        return entities.deals.map(deal => ({
          value: deal._id,
          label: `${deal.vehicle} (${deal.stockNumber})`
        }));
      default:
        return [];
    }
  };

  // Get status badge
  const getStatusBadge = (apiKey) => {
    if (!apiKey.isActive) {
      return <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">Inactive</span>;
    }
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">Expired</span>;
    }
    return <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">Active</span>;
  };

  // Get type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case 'internal':
        return <User className="h-4 w-4" />;
      case 'customer':
        return <User className="h-4 w-4" />;
      case 'dealer':
        return <Building className="h-4 w-4" />;
      case 'system':
        return <FileText className="h-4 w-4" />;
      default:
        return <Key className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="relative bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-3 mr-4 shadow-lg shadow-purple-500/25">
                <Key className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">API Key Management</h1>
                <p className="text-gray-300 text-sm">Manage digital signature API keys</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => fetchApiKeys()}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg shadow-lg transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                New API Key
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-400">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-400">{success}</span>
            </div>
          </div>
        )}

        {/* API Keys Table */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading API keys...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      API Key
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Name & Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {apiKeys.map((apiKey) => (
                    <tr key={apiKey._id} className="hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-mono text-gray-300">
                                {showKey[apiKey._id] ? apiKey.key : `${apiKey.key.substring(0, 12)}...`}
                              </span>
                              <button
                                onClick={() => setShowKey(prev => ({ ...prev, [apiKey._id]: !prev[apiKey._id] }))}
                                className="text-gray-400 hover:text-white"
                              >
                                {showKey[apiKey._id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(apiKey.key)}
                                className="text-gray-400 hover:text-white"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(apiKey.type)}
                          <div>
                            <div className="text-sm font-medium text-white">{apiKey.name}</div>
                            <div className="text-sm text-gray-400 capitalize">{apiKey.type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {apiKey.entityId ? (
                            <span>
                              {apiKey.entityId.name || apiKey.entityId.firstName} {apiKey.entityId.lastName}
                            </span>
                          ) : (
                            <span className="text-gray-500">No entity</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(apiKey)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          <div>Used {apiKey.usageCount} times</div>
                          {apiKey.lastUsed && (
                            <div className="text-xs text-gray-400">
                              Last: {new Date(apiKey.lastUsed).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingKey(apiKey);
                              setShowEditModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRegenerateApiKey(apiKey._id)}
                            className="text-yellow-400 hover:text-yellow-300"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteApiKey(apiKey._id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-white/10 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create New API Key</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newApiKey.name}
                  onChange={(e) => setNewApiKey(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter API key name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={newApiKey.description}
                  onChange={(e) => setNewApiKey(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                  <select
                    value={newApiKey.type}
                    onChange={(e) => setNewApiKey(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="internal">Internal</option>
                    <option value="customer">Customer</option>
                    <option value="dealer">Dealer</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Entity Type</label>
                  <select
                    value={newApiKey.entityType}
                    onChange={(e) => setNewApiKey(prev => ({ ...prev, entityType: e.target.value, entityId: '' }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="User">User</option>
                    <option value="Dealer">Dealer</option>
                    <option value="Deal">Deal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Entity</label>
                <select
                  value={newApiKey.entityId}
                  onChange={(e) => setNewApiKey(prev => ({ ...prev, entityId: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select entity</option>
                  {getEntityOptions(newApiKey.entityType).map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={newApiKey.expiresAt}
                  onChange={(e) => setNewApiKey(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Permissions</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newApiKey.permissions.signAgreements}
                      onChange={(e) => setNewApiKey(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, signAgreements: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-300">Sign Agreements</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newApiKey.permissions.viewDocuments}
                      onChange={(e) => setNewApiKey(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, viewDocuments: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-300">View Documents</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newApiKey.permissions.createSignatures}
                      onChange={(e) => setNewApiKey(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, createSignatures: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-300">Create Signatures</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-white/10">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateApiKey}
                disabled={saving || !newApiKey.name || !newApiKey.entityId}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create API Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit API Key Modal */}
      {showEditModal && editingKey && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-white/10 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Edit API Key</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingKey(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editingKey.name || ''}
                  onChange={(e) => setEditingKey(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={editingKey.description || ''}
                  onChange={(e) => setEditingKey(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={editingKey.expiresAt ? new Date(editingKey.expiresAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditingKey(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Permissions</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingKey.permissions?.signAgreements || false}
                      onChange={(e) => setEditingKey(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, signAgreements: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-300">Sign Agreements</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingKey.permissions?.viewDocuments || false}
                      onChange={(e) => setEditingKey(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, viewDocuments: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-300">View Documents</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingKey.permissions?.createSignatures || false}
                      onChange={(e) => setEditingKey(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, createSignatures: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-300">Create Signatures</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingKey.isActive}
                    onChange={(e) => setEditingKey(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-300">Active</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-white/10">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingKey(null);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateApiKey}
                disabled={saving || !editingKey.name}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Edit className="h-4 w-4 mr-2" />}
                Update API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeyManagement; 