import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Activity, 
  Database, 
  Server, 
  Code, 
  Bug, 
  RefreshCw, 
  Download, 
  Upload, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Wifi,
  HardDrive,
  Cpu,
  Network,
  FileText,
  Terminal,
  GitBranch,
  Package,
  Shield,
  Zap,
  Monitor,
  BarChart3,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Copy,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const ITPage = () => {
  const { user: currentUser, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState({
    backend: 'online',
    database: 'online',
    storage: 'online',
    performance: 'good'
  });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    documentGeneration: {
      averageTime: 0,
      totalDocuments: 0,
      browserReuses: 0,
      cacheHits: 0
    },
    apiResponse: {
      averageTime: 0,
      totalRequests: 0,
      errorRate: 0
    },
    system: {
      memoryUsage: 0,
      cpuUsage: 0,
      diskUsage: 0
    }
  });
  const [updates, setUpdates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [deploymentStatus, setDeploymentStatus] = useState({
    development: {
      status: 'online',
      lastDeploy: '2024-01-15T10:30:00Z',
      version: 'v1.2.3-dev',
      environment: 'development',
      url: 'https://dev-opis-frontend.vercel.app'
    },
    staging: {
      status: 'online',
      lastDeploy: '2024-01-14T12:00:00Z',
      version: 'v1.2.3-staging',
      environment: 'staging',
      url: 'https://staging-opis-frontend.vercel.app'
    },
    production: {
      status: 'online',
      lastDeploy: '2024-01-14T15:45:00Z',
      version: 'v1.2.2',
      environment: 'production',
      url: 'https://opis-frontend-dw442ltxo-bigsauers-projects.vercel.app'
    }
  });
  const [deploymentHistory, setDeploymentHistory] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [featureFlags, setFeatureFlags] = useState({
    enhancedSignatures: { enabled: true, environments: ['development', 'staging'] },
    newDashboard: { enabled: false, environments: ['development'] },
    advancedReporting: { enabled: false, environments: [] },
    betaFeatures: { enabled: true, environments: ['development', 'staging'] }
  });

  const [testingEnvironments, setTestingEnvironments] = useState({
    development: {
      status: 'active',
      users: ['clayton@rp-exotics.com', 'test@rp-exotics.com'],
      features: ['enhancedSignatures', 'betaFeatures'],
      lastTest: '2024-01-15T09:00:00Z'
    },
    staging: {
      status: 'active',
      users: ['clayton@rp-exotics.com'],
      features: ['enhancedSignatures'],
      lastTest: '2024-01-14T16:00:00Z'
    }
  });

  // Fetch real data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const API_BASE = process.env.REACT_APP_API_URL;
        
        // Fetch deployment status
        const deploymentResponse = await fetch(`${API_BASE}/api/it/deployment/status`, {
          credentials: 'include',
          headers: getAuthHeaders()
        });
        
        if (deploymentResponse.ok) {
          const deploymentData = await deploymentResponse.json();
          setDeploymentStatus(deploymentData.data);
        }
        
        // Fetch deployment history
        const historyResponse = await fetch(`${API_BASE}/api/it/deployment/history`, {
          credentials: 'include',
          headers: getAuthHeaders()
        });
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setDeploymentHistory(historyData.data);
        }
        
                       // Fetch system metrics
               const metricsResponse = await fetch(`${API_BASE}/api/stats/metrics`, {
                 credentials: 'include',
                 headers: getAuthHeaders()
               });

               if (metricsResponse.ok) {
                 const metricsData = await metricsResponse.json();
                 setPerformanceMetrics(prev => ({
                   ...prev,
                   system: {
                     memoryUsage: metricsData.data.system?.memoryUsage || 45,
                     cpuUsage: metricsData.data.system?.cpuUsage || 25,
                     diskUsage: metricsData.data.system?.diskUsage || 60
                   }
                 }));
               }
        
      } catch (error) {
        console.error('[IT PAGE] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [getAuthHeaders]);
  
  // Mock data for demonstration (fallback)
  const mockUpdates = [
    {
      id: 1,
      type: 'feature',
      title: 'Document Generation Performance Optimization',
      description: 'Implemented browser pooling, template caching, and parallel processing for 60-80% faster document generation',
      date: '2024-01-15',
      status: 'completed',
      priority: 'high',
      impact: 'Major performance improvement'
    },
    {
      id: 2,
      type: 'bugfix',
      title: 'Fixed API URL Issues in User Management',
      description: 'Resolved SyntaxError issues caused by incorrect API base URL configuration',
      date: '2024-01-14',
      status: 'completed',
      priority: 'high',
      impact: 'Fixed user management functionality'
    },
    {
      id: 3,
      type: 'feature',
      title: 'Transport Management System',
        description: 'Added new transport management interface with booking capabilities',
        date: '2024-01-13',
        status: 'completed',
        priority: 'medium',
        impact: 'New functionality added'
      },
      {
        id: 4,
        type: 'improvement',
        title: 'Enhanced Document Templates',
        description: 'Updated wholesale BOS and purchase agreement templates with improved formatting',
        date: '2024-01-12',
        status: 'completed',
        priority: 'medium',
        impact: 'Better document presentation'
      },
      {
        id: 5,
        type: 'bugfix',
        title: 'Fixed Deal Type 2 SubType Issues',
        description: 'Resolved issues with wholesale d2d sale deals being treated as buy deals',
        date: '2024-01-11',
        status: 'completed',
        priority: 'high',
        impact: 'Fixed document generation logic'
      }
    ];



  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
      case 'completed':
      case 'good':
        return 'text-green-400';
      case 'warning':
      case 'pending':
        return 'text-yellow-400';
      case 'error':
      case 'offline':
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
      case 'completed':
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
      case 'pending':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
      case 'offline':
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getUpdateTypeColor = (type) => {
    switch (type) {
      case 'feature':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'bugfix':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'improvement':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'security':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'info':
        return 'text-blue-400';
      case 'warn':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      case 'debug':
        return 'text-gray-400';
      default:
        return 'text-white';
    }
  };

  // Deployment control functions
  const triggerDeployment = async (environment) => {
    setIsDeploying(true);
    try {
      const API_BASE = process.env.REACT_APP_API_URL;
      const response = await fetch(`${API_BASE}/api/it/deploy`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          environment,
          action: 'deploy',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[IT PAGE] Deployment triggered for ${environment}:`, result);
        
        // Update deployment status
        setDeploymentStatus(prev => ({
          ...prev,
          [environment]: {
            ...prev[environment],
            status: 'deploying',
            lastDeploy: new Date().toISOString()
          }
        }));

        // Add to deployment history
        const newDeployment = {
          id: Date.now(),
          environment,
          action: 'deploy',
          status: 'in_progress',
          timestamp: new Date().toISOString(),
          user: currentUser?.email || 'Unknown'
        };
        setDeploymentHistory(prev => [newDeployment, ...prev]);
      } else {
        throw new Error(`Failed to trigger deployment: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[IT PAGE] Deployment error:`, error);
      alert(`Deployment failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const promoteToProduction = async () => {
    if (!window.confirm('Are you sure you want to promote the current development version to production? This will affect live users.')) {
      return;
    }
    
    setIsDeploying(true);
    try {
      const API_BASE = process.env.REACT_APP_API_URL;
      const response = await fetch(`${API_BASE}/api/it/promote`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'promote',
          fromEnvironment: 'development',
          toEnvironment: 'production',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[IT PAGE] Promotion to production successful:', result);
        
        // Update deployment status
        setDeploymentStatus(prev => ({
          ...prev,
          production: {
            ...prev.production,
            status: 'deploying',
            lastDeploy: new Date().toISOString(),
            version: prev.development.version.replace('-dev', '')
          }
        }));

        // Add to deployment history
        const newPromotion = {
          id: Date.now(),
          environment: 'production',
          action: 'promote',
          status: 'in_progress',
          timestamp: new Date().toISOString(),
          user: currentUser?.email || 'Unknown',
          fromVersion: deploymentStatus.development.version,
          toVersion: deploymentStatus.development.version.replace('-dev', '')
        };
        setDeploymentHistory(prev => [newPromotion, ...prev]);
      } else {
        throw new Error(`Failed to promote to production: ${response.statusText}`);
      }
    } catch (error) {
      console.error('[IT PAGE] Promotion error:', error);
      alert(`Promotion failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const promoteToStaging = async () => {
    if (!window.confirm('Are you sure you want to promote the current development version to staging? This will make it available for testing.')) {
      return;
    }
    
    setIsDeploying(true);
    try {
      const API_BASE = process.env.REACT_APP_API_URL;
      const response = await fetch(`${API_BASE}/api/it/promote`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'promote',
          fromEnvironment: 'development',
          toEnvironment: 'staging',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[IT PAGE] Promotion to staging successful:', result);
        
        // Update deployment status
        setDeploymentStatus(prev => ({
          ...prev,
          staging: {
            ...prev.staging,
            status: 'deploying',
            lastDeploy: new Date().toISOString(),
            version: prev.development.version.replace('-dev', '-staging')
          }
        }));

        // Add to deployment history
        const newPromotion = {
          id: Date.now(),
          environment: 'staging',
          action: 'promote',
          status: 'in_progress',
          timestamp: new Date().toISOString(),
          user: currentUser?.email || 'Unknown',
          fromVersion: deploymentStatus.development.version,
          toVersion: deploymentStatus.development.version.replace('-dev', '-staging')
        };
        setDeploymentHistory(prev => [newPromotion, ...prev]);
      } else {
        throw new Error(`Failed to promote to staging: ${response.statusText}`);
      }
    } catch (error) {
      console.error('[IT PAGE] Promotion to staging error:', error);
      alert(`Promotion to staging failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const promoteStagingToProduction = async () => {
    if (!window.confirm('Are you sure you want to promote the current staging version to production? This will affect live users.')) {
      return;
    }
    
    setIsDeploying(true);
    try {
      const API_BASE = process.env.REACT_APP_API_URL;
      const response = await fetch(`${API_BASE}/api/it/promote`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'promote',
          fromEnvironment: 'staging',
          toEnvironment: 'production',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[IT PAGE] Promotion to production successful:', result);
        
        // Update deployment status
        setDeploymentStatus(prev => ({
          ...prev,
          production: {
            ...prev.production,
            status: 'deploying',
            lastDeploy: new Date().toISOString(),
            version: prev.staging.version.replace('-staging', '')
          }
        }));

        // Add to deployment history
        const newPromotion = {
          id: Date.now(),
          environment: 'production',
          action: 'promote',
          status: 'in_progress',
          timestamp: new Date().toISOString(),
          user: currentUser?.email || 'Unknown',
          fromVersion: deploymentStatus.staging.version,
          toVersion: deploymentStatus.staging.version.replace('-staging', '')
        };
        setDeploymentHistory(prev => [newPromotion, ...prev]);
      } else {
        throw new Error(`Failed to promote to production: ${response.statusText}`);
      }
    } catch (error) {
      console.error('[IT PAGE] Promotion to production error:', error);
      alert(`Promotion to production failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const rollbackDeployment = async (environment) => {
    if (!window.confirm(`Are you sure you want to rollback ${environment} to the previous version?`)) {
      return;
    }
    
    setIsDeploying(true);
    try {
      const API_BASE = process.env.REACT_APP_API_URL;
      const response = await fetch(`${API_BASE}/api/it/rollback`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          environment,
          action: 'rollback',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[IT PAGE] Rollback successful for ${environment}:`, result);
        
        // Add to deployment history
        const newRollback = {
          id: Date.now(),
          environment,
          action: 'rollback',
          status: 'completed',
          timestamp: new Date().toISOString(),
          user: currentUser?.email || 'Unknown'
        };
        setDeploymentHistory(prev => [newRollback, ...prev]);
      } else {
        throw new Error(`Failed to rollback: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[IT PAGE] Rollback error:`, error);
      alert(`Rollback failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const toggleFeatureFlag = async (featureName, environment) => {
    try {
      const API_BASE = process.env.REACT_APP_API_URL;
      const response = await fetch(`${API_BASE}/api/it/feature-flags`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feature: featureName,
          environment,
          action: 'toggle',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setFeatureFlags(prev => ({
          ...prev,
          [featureName]: {
            ...prev[featureName],
            environments: prev[featureName].environments.includes(environment)
              ? prev[featureName].environments.filter(env => env !== environment)
              : [...prev[featureName].environments, environment]
          }
        }));
      }
    } catch (error) {
      console.error('[IT PAGE] Feature flag toggle error:', error);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Message for Clayton */}
      <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg p-6 border border-purple-500/20">
        <div className="flex items-center space-x-3 mb-3">
          <div className="bg-purple-500 p-2 rounded-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Welcome, Clayton!</h2>
        </div>
        <p className="text-gray-300">
          This is your dedicated IT Management dashboard. You have exclusive access to system monitoring, 
          debugging tools, and performance metrics. Use this page to monitor system health, track updates, 
          and troubleshoot any issues.
        </p>
      </div>

      {/* System Status */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold">System Status</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(systemStatus).map(([service, status]) => (
            <div key={service} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 capitalize">{service}</p>
                  <p className={`font-medium ${getStatusColor(status)}`}>{status}</p>
                </div>
                <div className={getStatusColor(status)}>
                  {getStatusIcon(status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm">Document Generation</p>
              <p className="text-2xl font-bold">{performanceMetrics.documentGeneration.averageTime}ms</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Documents:</span>
              <span>{performanceMetrics.documentGeneration.totalDocuments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Browser Reuses:</span>
              <span className="text-green-400">{performanceMetrics.documentGeneration.browserReuses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cache Hits:</span>
              <span className="text-blue-400">{performanceMetrics.documentGeneration.cacheHits}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm">API Response Time</p>
              <p className="text-2xl font-bold">{performanceMetrics.apiResponse.averageTime}ms</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Requests:</span>
              <span>{performanceMetrics.apiResponse.totalRequests.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Error Rate:</span>
              <span className="text-red-400">{performanceMetrics.apiResponse.errorRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm">System Resources</p>
              <p className="text-2xl font-bold">{performanceMetrics.system.memoryUsage}%</p>
            </div>
            <div className="bg-orange-500 p-3 rounded-lg">
              <Monitor className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">CPU Usage:</span>
              <span>{performanceMetrics.system.cpuUsage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Disk Usage:</span>
              <span>{performanceMetrics.system.diskUsage}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUpdates = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">System Updates</h2>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
          <Plus className="h-4 w-4" />
          <span>Add Update</span>
        </button>
      </div>
      
      <div className="space-y-4">
        {updates.map((update) => (
          <div key={update.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUpdateTypeColor(update.type)}`}>
                    {update.type}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(update.status)}`}>
                    {update.status}
                  </span>
                  <span className="text-sm text-gray-400">{update.date}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{update.title}</h3>
                <p className="text-gray-300 mb-3">{update.description}</p>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-gray-400">Priority: <span className="text-white">{update.priority}</span></span>
                  <span className="text-gray-400">Impact: <span className="text-white">{update.impact}</span></span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                  <Eye className="h-4 w-4" />
                </button>
                <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">System Logs</h2>
        <div className="flex items-center space-x-2">
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Level</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Component</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Message</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-gray-300">{log.timestamp}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLogLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{log.component}</td>
                  <td className="px-4 py-3 text-sm text-white max-w-md truncate">{log.message}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{log.userId}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <button className="p-1 hover:bg-gray-600 rounded transition-colors">
                        <Eye className="h-3 w-3" />
                      </button>
                      <button className="p-1 hover:bg-gray-600 rounded transition-colors">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDeployment = () => (
    <div className="space-y-6">
      {/* Environment Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Development Environment */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-500 p-2 rounded-lg">
                <GitBranch className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold">Development</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(deploymentStatus.development.status)}`}>
              {deploymentStatus.development.status}
            </span>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Version:</span>
              <span className="text-white font-mono">{deploymentStatus.development.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Last Deploy:</span>
              <span className="text-white">{new Date(deploymentStatus.development.lastDeploy).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">URL:</span>
              <a href={deploymentStatus.development.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                <ExternalLink className="h-3 w-3 inline" />
              </a>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => triggerDeployment('development')}
              disabled={isDeploying}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isDeploying ? 'animate-spin' : ''}`} />
              <span>{isDeploying ? 'Deploying...' : 'Deploy'}</span>
            </button>
            <button
              onClick={() => rollbackDeployment('development')}
              disabled={isDeploying}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              title="Rollback to previous version"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Staging Environment */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="bg-yellow-500 p-2 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold">Staging</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(deploymentStatus.staging.status)}`}>
              {deploymentStatus.staging.status}
            </span>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Version:</span>
              <span className="text-white font-mono">{deploymentStatus.staging.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Last Deploy:</span>
              <span className="text-white">{new Date(deploymentStatus.staging.lastDeploy).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">URL:</span>
              <a href={deploymentStatus.staging.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                <ExternalLink className="h-3 w-3 inline" />
              </a>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={promoteToStaging}
              disabled={isDeploying || deploymentStatus.development.status === 'deploying'}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Upload className={`h-4 w-4 ${isDeploying ? 'animate-spin' : ''}`} />
              <span>{isDeploying ? 'Promoting...' : 'Promote from Dev'}</span>
            </button>
            <button
              onClick={() => rollbackDeployment('staging')}
              disabled={isDeploying}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              title="Rollback to previous version"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Production Environment */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="bg-green-500 p-2 rounded-lg">
                <Server className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold">Production</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(deploymentStatus.production.status)}`}>
              {deploymentStatus.production.status}
            </span>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Version:</span>
              <span className="text-white font-mono">{deploymentStatus.production.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Last Deploy:</span>
              <span className="text-white">{new Date(deploymentStatus.production.lastDeploy).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">URL:</span>
              <a href={deploymentStatus.production.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                <ExternalLink className="h-3 w-3 inline" />
              </a>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={promoteStagingToProduction}
              disabled={isDeploying || deploymentStatus.staging.status === 'deploying'}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Upload className={`h-4 w-4 ${isDeploying ? 'animate-spin' : ''}`} />
              <span>{isDeploying ? 'Promoting...' : 'Promote from Staging'}</span>
            </button>
            <button
              onClick={() => rollbackDeployment('production')}
              disabled={isDeploying}
              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              title="Rollback to previous version"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Feature Flags Management */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Feature Flags</h2>
          <span className="text-sm text-gray-400">Control feature availability per environment</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(featureFlags).map(([featureName, config]) => (
            <div key={featureName} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white capitalize">{featureName.replace(/([A-Z])/g, ' $1').trim()}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  config.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {config.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Development:</span>
                  <button
                    onClick={() => toggleFeatureFlag(featureName, 'development')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      config.environments.includes('development')
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {config.environments.includes('development') ? 'ON' : 'OFF'}
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Staging:</span>
                  <button
                    onClick={() => toggleFeatureFlag(featureName, 'staging')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      config.environments.includes('staging')
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {config.environments.includes('staging') ? 'ON' : 'OFF'}
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Production:</span>
                  <button
                    onClick={() => toggleFeatureFlag(featureName, 'production')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      config.environments.includes('production')
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {config.environments.includes('production') ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Testing Environment Status */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Testing Environments</h2>
          <span className="text-sm text-gray-400">Current testing status and access</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(testingEnvironments).map(([env, config]) => (
            <div key={env} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white capitalize">{env}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  config.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {config.status}
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-400">Test Users:</span>
                  <div className="mt-1 space-y-1">
                    {config.users.map((user, index) => (
                      <div key={index} className="text-sm text-white bg-gray-600 px-2 py-1 rounded">
                        {user}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-400">Active Features:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {config.features.map((feature, index) => (
                      <span key={index} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="text-sm text-gray-400">
                  Last Test: {new Date(config.lastTest).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deployment History */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Deployment History</h2>
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Environment</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {deploymentHistory.map((deployment) => (
                <tr key={deployment.id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {new Date(deployment.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      deployment.environment === 'production' ? 'bg-green-500/20 text-green-400' : 
                      deployment.environment === 'staging' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {deployment.environment}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      deployment.action === 'deploy' ? 'bg-blue-500/20 text-blue-400' :
                      deployment.action === 'promote' ? 'bg-green-500/20 text-green-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {deployment.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      deployment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      deployment.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {deployment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{deployment.user}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {deployment.fromVersion && deployment.toVersion && (
                      <span>{deployment.fromVersion} → {deployment.toVersion}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {deploymentHistory.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No deployment history available</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderDebugging = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <Bug className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold">Debugging Tools</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-300">System Diagnostics</h3>
            <div className="space-y-3">
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg flex items-center justify-between transition-colors">
                <span>Run System Health Check</span>
                <Activity className="h-4 w-4" />
              </button>
              <button className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg flex items-center justify-between transition-colors">
                <span>Test Database Connection</span>
                <Database className="h-4 w-4" />
              </button>
              <button className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg flex items-center justify-between transition-colors">
                <span>Check API Endpoints</span>
                <Server className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-300">Performance Tests</h3>
            <div className="space-y-3">
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg flex items-center justify-between transition-colors">
                <span>Test Document Generation</span>
                <FileText className="h-4 w-4" />
              </button>
              <button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-3 rounded-lg flex items-center justify-between transition-colors">
                <span>Load Test API</span>
                <Zap className="h-4 w-4" />
              </button>
                             <button className="w-full bg-teal-500 hover:bg-teal-600 text-white px-4 py-3 rounded-lg flex items-center justify-between transition-colors">
                 <span>Memory Usage Analysis</span>
                 <HardDrive className="h-4 w-4" />
               </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <Terminal className="h-5 w-5 text-green-400" />
          <h2 className="text-lg font-semibold">Command Console</h2>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-green-400">$</span>
              <input 
                type="text" 
                placeholder="Enter command..."
                className="flex-1 bg-transparent text-white outline-none"
              />
            </div>
            <div className="text-sm text-gray-400">
              Available commands: health, logs, metrics, test, clear
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-600 min-h-[200px]">
            <div className="text-sm text-gray-300 font-mono">
              <div className="text-green-400">$ health</div>
              <div className="text-white">System health check completed</div>
              <div className="text-green-400">✓ Backend: Online</div>
              <div className="text-green-400">✓ Database: Online</div>
              <div className="text-green-400">✓ Storage: Online</div>
              <div className="text-yellow-400">⚠ Memory usage: 72%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'deployment', label: 'Deployment', icon: GitBranch },
    { id: 'updates', label: 'Updates', icon: Package },
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'debugging', label: 'Debugging', icon: Bug }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/')}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="bg-purple-500 p-2 rounded-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Clayton's IT Management</h1>
              <p className="text-gray-400">Dedicated System Monitoring & Debugging</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-medium">{currentUser?.profile?.displayName || 'User'}</p>
              <p className="text-sm text-gray-400 capitalize">{currentUser?.role || 'User'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'deployment' && renderDeployment()}
            {activeTab === 'updates' && renderUpdates()}
            {activeTab === 'logs' && renderLogs()}
            {activeTab === 'debugging' && renderDebugging()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ITPage; 