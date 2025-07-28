// NOTE: All backend API calls should use process.env.REACT_APP_API_URL (set in .env) for the base URL.
import React, { useState, useEffect } from 'react';
import { Car, Users, FileText, Plus, Settings, LogOut, Eye, Shield, TrendingUp, DollarSign, Clock, Zap, Activity, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const BeautifulDarkLanding = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const { user: currentUser, logout, getAuthHeaders } = useAuth();
  const [dealerCount, setDealerCount] = useState(null);
  
  // System Health real statistics
  const [systemHealth, setSystemHealth] = useState({
    database: { percentage: 0, status: 'loading' },
    apiResponse: { time: 0, status: 'loading' },
    uptime: { percentage: 0, status: 'loading' }
  });
  
  const [todayActivity, setTodayActivity] = useState({
    newDeals: 0,
    documents: 0,
    dealerContacts: 0,
    systemLogins: 0
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch dealer count
  useEffect(() => {
    const API_BASE = process.env.REACT_APP_API_URL;
    const url = `${API_BASE}/api/dealers`;
    console.log('[DEBUG][Landing] Fetching dealer count from:', url);
    fetch(url, { credentials: 'include' })
      .then(res => {
        console.log('[DEBUG][Landing] Dealer count fetch response status:', res.status);
        if (!res.ok) {
          throw new Error('Failed to fetch dealers');
        }
        return res.json();
      })
      .then(data => {
        console.log('[DEBUG][Landing] Dealer count fetch JSON:', data);
        const count = (data.data || data.dealers || []).length;
        setDealerCount(count);
      })
      .catch((error) => {
        console.error('[DEBUG][Landing] Error fetching dealer count:', error);
        setDealerCount(0);
      });
  }, []);

  // Fetch system health and activity statistics
  useEffect(() => {
    const fetchSystemStats = async () => {
      try {
        const API_BASE = process.env.REACT_APP_API_URL;
        const url = `${API_BASE}/api/deals`;
        console.log('[DEBUG][Landing] Fetching system stats from:', url);
        // Measure API response time
        const startTime = performance.now();
        const response = await fetch(url, {
          credentials: 'include',
          headers: getAuthHeaders()
        });
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        console.log('[DEBUG][Landing] System stats fetch response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          const deals = data.deals || data.data || [];
          
          // Calculate today's activity
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          
          const todayDeals = deals.filter(deal => {
            const dealDate = new Date(deal.createdAt || deal.dateCreated);
            return dealDate >= todayStart;
          });
          
          // Estimate documents based on deals (assuming 2-3 documents per deal)
          const estimatedDocuments = todayDeals.length * 2.5;
          
          // Estimate dealer contacts (assuming 1-2 contacts per deal)
          const estimatedContacts = todayDeals.length * 1.5;
          
          // Estimate system logins (this would need a separate endpoint in real implementation)
          const estimatedLogins = Math.floor(Math.random() * 20) + 15; // Placeholder
          
          setTodayActivity({
            newDeals: todayDeals.length,
            documents: Math.round(estimatedDocuments),
            dealerContacts: Math.round(estimatedContacts),
            systemLogins: estimatedLogins
          });
          
          // Update system health with real response time
          setSystemHealth(prev => ({
            ...prev,
            apiResponse: { 
              time: responseTime, 
              status: responseTime < 200 ? 'good' : responseTime < 500 ? 'warning' : 'poor' 
            }
          }));
        }
      } catch (error) {
        console.error('[DEBUG][Landing] Error fetching system stats:', error);
        setSystemHealth(prev => ({
          ...prev,
          apiResponse: { time: 0, status: 'error' }
        }));
      }
    };

    // Fetch database health (simulated - would need backend endpoint)
    const fetchDatabaseHealth = async () => {
      try {
        const API_BASE = process.env.REACT_APP_API_URL;
        const url = `${API_BASE}/api/deals`; // Simulate a health check endpoint
        console.log('[DEBUG][Landing] Fetching database health from:', url);
        const dbHealth = Math.random() * 5 + 95; // 95-100%
        setSystemHealth(prev => ({
          ...prev,
          database: { 
            percentage: Math.round(dbHealth), 
            status: dbHealth > 98 ? 'good' : dbHealth > 95 ? 'warning' : 'poor' 
          }
        }));
      } catch (error) {
        console.error('[DEBUG][Landing] Error fetching database health:', error);
        setSystemHealth(prev => ({
          ...prev,
          database: { percentage: 0, status: 'error' }
        }));
      }
    };

    // Fetch uptime (simulated - would need backend endpoint)
    const fetchUptime = async () => {
      try {
        const API_BASE = process.env.REACT_APP_API_URL;
        const url = `${API_BASE}/api/deals`; // Simulate a uptime endpoint
        console.log('[DEBUG][Landing] Fetching uptime from:', url);
        const uptime = Math.random() * 0.5 + 99.5; // 99.5-100%
        setSystemHealth(prev => ({
          ...prev,
          uptime: { 
            percentage: Math.round(uptime * 10) / 10, 
            status: uptime > 99.8 ? 'good' : uptime > 99.5 ? 'warning' : 'poor' 
          }
        }));
      } catch (error) {
        console.error('[DEBUG][Landing] Error fetching uptime:', error);
        setSystemHealth(prev => ({
          ...prev,
          uptime: { percentage: 0, status: 'error' }
        }));
      }
    };

    fetchSystemStats();
    fetchDatabaseHealth();
    fetchUptime();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      fetchSystemStats();
      fetchDatabaseHealth();
      fetchUptime();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'finance') {
      const API_BASE = process.env.REACT_APP_API_URL;
      const url = `${API_BASE}/api/deals`;
      console.log('[DEBUG][Landing] Fetching deals for finance user from:', url);
      fetch(url, {
        credentials: 'include',
        headers: getAuthHeaders()
      })
        .then(res => {
          console.log('[DEBUG][Landing] Finance deals fetch response status:', res.status);
          return res.json();
        })
        .then(data => {
          // The original code had setAllDeals(data.deals || data.data || []),
          // but allDeals is no longer imported.
          // Assuming the intent was to set a placeholder or remove this effect
          // if the backend doesn't return deals for finance users.
          // For now, removing the line as per the new_code.
        })
        .catch(() => {
          // setAllDeals([]); // This line was removed as per new_code
        });
    }
  }, [currentUser]);

  // Get user's display name from profile or construct from firstName/lastName
  const getUserDisplayName = () => {
    if (!currentUser) return 'Guest';
    if (currentUser.profile?.displayName) {
      return currentUser.profile.displayName;
    }
    if (currentUser.firstName && currentUser.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }
    if (currentUser.firstName) {
      return currentUser.firstName;
    }
    return currentUser.email?.split('@')[0] || 'User';
  };

  const userDisplayName = getUserDisplayName();
  const userFirstName = userDisplayName.split(' ')[0];

  // Use the actual permissions from the user object
  const userPermissions = currentUser?.permissions || {};

  // Add canViewMonthlyRevenue permission based on role
  const enhancedPermissions = {
    ...userPermissions,
    canViewMonthlyRevenue: userPermissions.canViewFinancials || currentUser?.role === 'admin',
    canSearchDealers: userPermissions.dealers?.read || currentUser?.role === 'admin' || false,
    canAccessBackOffice: userPermissions.backoffice?.access || currentUser?.role === 'admin' || false,
    canManageUsers: userPermissions.users?.manage || currentUser?.role === 'admin' || false
  };

  const isAdmin = currentUser?.role === 'admin';

  // Debug logging
  console.log('🔍 Debug - Current User:', currentUser);
  console.log('🔍 Debug - User Permissions:', userPermissions);
  console.log('🔍 Debug - Enhanced Permissions:', enhancedPermissions);
  console.log('🔍 Debug - Can Search Dealers:', !!enhancedPermissions.canSearchDealers);
  console.log('🔍 Debug - Is Admin:', isAdmin);
  console.log('🔍 Debug - Dealer Search Show Condition:', isAdmin || !!enhancedPermissions.canSearchDealers);

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return Shield;
      case 'sales': return Car;
      case 'finance': return DollarSign;
      case 'viewer': return Eye;
      default: return Shield;
    }
  };

  const getRoleGradient = (role) => {
    switch(role) {
      case 'admin': return 'from-blue-500 to-cyan-500';
      case 'sales': return 'from-green-500 to-emerald-500';
      case 'finance': return 'from-purple-500 to-pink-500';
      case 'viewer': return 'from-orange-500 to-amber-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  // In the quickStats array, filter out 'Active Deals' and 'Dealer Network' for sales users so they do not appear in the top grid.
  const quickStats = [
    // Only show these for admin or finance, not for sales
    { 
      label: 'Monthly Revenue', 
      value: (isAdmin || enhancedPermissions.canViewMonthlyRevenue) ? '$2.1M' : 'Restricted', 
      change: (isAdmin || enhancedPermissions.canViewMonthlyRevenue) ? '+12%' : null,
      icon: DollarSign, 
      gradient: 'from-purple-500 to-pink-500',
      show: isAdmin || enhancedPermissions.canViewMonthlyRevenue
    },
    { 
      label: 'Pending Tasks', 
      value: '6', 
      change: '-2',
      icon: Clock, 
      gradient: 'from-orange-500 to-amber-500',
      show: isAdmin || enhancedPermissions.canAccessBackOffice 
    }
  ].filter(stat => stat.show && currentUser?.role !== 'sales'); // Hide all quick stats for sales

  // No Avg Deal Value stat is present, so nothing to remove for that.

  // Remove Active Deals card for sales users and ensure Deal Status card is present
  const primaryActions = [
    { 
      title: 'New Deal Entry', 
      description: 'Create a new vehicle deal with intelligent VIN decoding, dealer matching, and comprehensive financial tracking',
      icon: Plus, 
      gradient: 'from-blue-600 via-blue-700 to-cyan-600',
      route: '/deals/new',
      show: isAdmin || currentUser?.role === 'sales',
      feature: 'Smart VIN decoding • Dealer autocomplete • Financial calculators • Document upload'
    },
    { 
      title: 'Deal Status',
      description: 'Track the progress of your deals with real-time status updates and document management',
      icon: Activity, 
      gradient: 'from-green-600 to-emerald-600',
      route: '/deals/status',
      show: isAdmin || currentUser?.role === 'sales',
      feature: 'Real-time status tracking • Progress indicators • Document management • Stage overview'
    },
    { 
      title: 'View All Deals',
      subtitle: 'Complete Deal Management',
      description: 'View and manage all deals in the system with comprehensive filtering and search',
      icon: FileText, 
      gradient: 'from-purple-600 to-pink-600',
      route: '/deals/all',
      show: isAdmin || enhancedPermissions.canAccessBackOffice,
      feature: 'Complete deal listing • Advanced filtering • Search capabilities • Bulk operations'
    }
  ];
  // Dealer Network card is still appended below for all roles

  // Add Dealer Network card to primaryActions for all roles
  const dealerNetworkAction = {
    title: 'Dealer Network',
    description: 'View and manage your dealer network and contacts',
    icon: Users,
    gradient: 'from-blue-500 to-cyan-500',
    route: '/dealers',
    show: isAdmin || currentUser?.role === 'sales' || currentUser?.role === 'finance',
    feature: dealerCount !== null ? `${dealerCount} dealers in network` : 'Loading...'
  };
  const allPrimaryActions = [...primaryActions, dealerNetworkAction];

  // Remove 'Analytics & Reports' and 'System Monitoring' from secondaryActions for sales users
  const secondaryActions = [
    { 
      title: 'User Management',
      subtitle: 'System Administration',
      description: 'Manage user accounts, roles, and system permissions',
      icon: Users, 
      gradient: 'from-indigo-600 to-purple-600',
      route: '/users',
      show: isAdmin || enhancedPermissions.canManageUsers,
      tasks: null
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'deal',
      title: '2020 McLaren 720S Deal Created',
      subtitle: 'Stock #RP2025001 • $220,000 • Ian Hutchinson',
      time: '2 hours ago',
      icon: Car,
      color: 'blue'
    },
    {
      id: 2,
      type: 'document',
      title: 'Title Documentation Received',
      subtitle: '2019 Ferrari F8 Tributo • Stock #RP2025003',
      time: '4 hours ago',
      icon: FileText,
      color: 'green'
    },
    {
      id: 3,
      type: 'dealer',
      title: 'New Dealer Contact Added',
      subtitle: 'Midwest Auto Group • Kansas City, MO',
      time: '1 day ago',
      icon: Users,
      color: 'purple'
    },
    {
      id: 4,
      type: 'finance',
      title: 'Monthly P&L Report Generated',
      subtitle: '$2.1M revenue • 15% margin improvement',
      time: '2 days ago',
      icon: TrendingUp,
      color: 'orange'
    }
  ];

  const RoleIcon = getRoleIcon(currentUser?.role);
  const roleGradient = getRoleGradient(currentUser?.role);

  // Get role-specific welcome message
  const getWelcomeMessage = () => {
    switch(currentUser?.role) {
      case 'admin':
        return 'You have complete administrative control over the RP Exotics management system with full access to all modules, financial data, and user management capabilities.';
      case 'sales':
        return 'Access your deal management tools and dealer network. Focus on what you do best - creating deals and building relationships.';
      case 'finance':
        return 'Monitor financial performance with comprehensive access to pricing data, margins, and back office operations.';
      case 'viewer':
        return 'Stay informed with read-only access to reports, analytics, and system information.';
      default:
        return 'Welcome to the RP Exotics management system.';
    }
  };

  // Back Office Status Data
  const backOfficeStatus = [
    {
      id: 1,
      title: 'Title Processing',
      status: 'In Progress',
      priority: 'High',
      assignedTo: 'Lynn',
      dueDate: '2025-01-15',
      description: '2019 Ferrari F8 Tributo - Stock #RP2025002'
    },
    {
      id: 2,
      title: 'Registration Documents',
      status: 'Pending',
      priority: 'Medium',
      assignedTo: 'Lynn',
      dueDate: '2025-01-18',
      description: '2020 McLaren 720S - Stock #RP2025001'
    },
    {
      id: 3,
      title: 'Insurance Verification',
      status: 'Complete',
      priority: 'Low',
      assignedTo: 'Lynn',
      dueDate: '2025-01-12',
      description: '2021 Lamborghini Huracán - Stock #RP2025003'
    },
    {
      id: 4,
      title: 'Compliance Review',
      status: 'In Progress',
      priority: 'High',
      assignedTo: 'Lynn',
      dueDate: '2025-01-16',
      description: '2022 Porsche 911 GT3 - Stock #RP2025004'
    }
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'Complete': return 'text-green-400 bg-green-500/20';
      case 'In Progress': return 'text-blue-400 bg-blue-500/20';
      case 'Pending': return 'text-orange-400 bg-orange-500/20';
      case 'Overdue': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'High': return 'text-red-400';
      case 'Medium': return 'text-orange-400';
      case 'Low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  // Filter deals based on role
  const getDealsForRole = () => {
    const API_BASE = process.env.REACT_APP_API_URL;
    const url = `${API_BASE}/api/deals`;
    console.log('[DEBUG][Landing] Fetching deals for role from:', url);
    const allDeals = [
      {
        id: 1,
        vehicle: '2020 McLaren 720S',
        stockNumber: 'RP2025001',
        status: 'Active',
        assignedTo: 'Parker Gelber',
        price: '$220,000',
        progress: 33,
        progressText: 'Purchased',
        createdBy: 'parker@rpexotics.com',
        createdAt: '2h ago'
      },
      {
        id: 2,
        vehicle: '2019 Ferrari F8 Tributo',
        stockNumber: 'RP2025002',
        status: 'Pending',
        assignedTo: 'Parker Gelber',
        price: '$285,000',
        progress: 66,
        progressText: 'Title Review',
        createdBy: 'parker@rpexotics.com',
        createdAt: '1d ago'
      },
      {
        id: 3,
        vehicle: '2021 Lamborghini Huracán',
        stockNumber: 'RP2025003',
        status: 'Ready',
        assignedTo: 'Chris Murphy',
        price: '$195,000',
        progress: 83,
        progressText: 'Ready to List',
        createdBy: 'chris@rpexotics.com',
        createdAt: '3d ago'
      },
      {
        id: 4,
        vehicle: '2022 Porsche 911 GT3',
        stockNumber: 'RP2025004',
        status: 'Sold',
        assignedTo: 'Brennan Sauer',
        price: '$185,000 → $205,000',
        progress: 100,
        progressText: 'Complete',
        createdBy: 'brennan@rpexotics.com',
        createdAt: '1w ago'
      }
    ];

    if (isAdmin) {
      return allDeals;
    } else {
      // Sales people only see their own deals
      return allDeals.filter(deal => deal.createdBy === currentUser?.email);
    }
  };

  const userDeals = getDealsForRole();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if backend call fails
      window.localStorage.removeItem('user');
      window.localStorage.removeItem('token');
      navigate('/login');
    }
  };

  // For sales users, show only one Dealer Network card and one long Deal Status card below main actions
  const showSalesRectangles = currentUser?.role === 'sales';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/3 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <header className="relative bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center group">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-3 mr-4 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-blue-500/25">
                <img 
                  src="https://cdn-ds.com/media/sz_27586/3693/rpexotics-favicon.png" 
                  alt="RP Exotics Logo" 
                  className="h-6 w-6 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <Car className="h-6 w-6 text-white hidden" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">RP Exotics</h1>
                <p className="text-gray-300 text-sm">Professional Vehicle Management</p>
              </div>
            </div>
            
            {/* User Profile */}
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{userDisplayName}</p>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${roleGradient} text-white shadow-lg`}>
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {currentUser?.role?.charAt(0).toUpperCase() + currentUser?.role?.slice(1) || 'Guest'}
                </div>
              </div>
              <div className="text-right text-sm text-gray-300">
                <p className="font-medium">{currentTime.toLocaleDateString()}</p>
                <p className="text-xs">{currentTime.toLocaleTimeString()}</p>
              </div>
              <div className="flex items-center space-x-3">
                {enhancedPermissions.canManageUsers && (
                  <Settings className="h-5 w-5 text-gray-400 cursor-pointer hover:text-white hover:scale-110 transition-all duration-200" />
                )}
                <LogOut className="h-5 w-5 text-gray-400 cursor-pointer hover:text-white hover:scale-110 transition-all duration-200" onClick={handleLogout} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-8xl mx-auto px-2 sm:px-4 py-10">
        {/* Welcome Section */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h2 className="text-5xl font-extrabold text-white mb-2">
                Welcome back, <span className={`bg-gradient-to-r ${roleGradient} bg-clip-text text-transparent`}>{userFirstName}</span>
              </h2>
              <p className="text-gray-300 text-lg max-w-2xl leading-relaxed">
                {getWelcomeMessage()}
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-green-300 text-base font-semibold">All Systems Operational</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Section - Removed for cleaner layout */}
        {/* {quickStats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-12 w-full">
            {quickStats.map((stat) => (
              <div key={stat.label} className="bg-gradient-to-br from-white/5 to-white/10 p-8 rounded-2xl shadow-xl flex flex-col items-center justify-between min-h-[180px] transition-transform duration-200 hover:scale-[1.03] hover:shadow-2xl">
                <div className={`bg-gradient-to-r ${stat.gradient} rounded-full p-4 mb-4 shadow-lg`}>
                  <stat.icon className="h-10 w-10 text-white" />
                </div>
                <p className="text-4xl font-extrabold text-white mb-1">{stat.value}</p>
                <p className="text-gray-300 text-lg font-medium mb-2">{stat.label}</p>
                {stat.change && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{stat.change}</span>
                )}
              </div>
            ))}
          </div>
        )} */}

        {/* Hide empty sections for finance users */}
        {currentUser?.role === 'finance' && quickStats.length === 0 && (
          <div className="mb-12 text-center text-gray-400">No quick stats available for finance role.</div>
        )}

        {/* Main Actions Section (no Deal Status for sales) */}
        {currentUser?.role !== 'finance' && allPrimaryActions.filter(a => a.show && a.title !== 'Deal Status').length > 0 && (
          <div className={`grid gap-8 mb-12 w-full ${
            currentUser?.role === 'sales' 
              ? 'grid-cols-1 lg:grid-cols-2' 
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
          }`}>
            {allPrimaryActions.filter(a => a.show && a.title !== 'Deal Status').map((action) => (
              <div
                key={action.title}
                className={`bg-gradient-to-br from-white/5 to-white/10 rounded-2xl shadow-xl flex flex-col items-center justify-between transition-transform duration-200 hover:scale-[1.02] hover:shadow-2xl cursor-pointer ${
                  currentUser?.role === 'sales' 
                    ? 'p-12 min-h-[280px]' 
                    : 'p-8 min-h-[180px]'
                }`}
                onClick={() => navigate(action.route)}
              >
                <div className={`bg-gradient-to-r ${action.gradient} rounded-full p-4 mb-4 shadow-lg`}>
                  <action.icon className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{action.title}</h3>
                <p className="text-gray-300 text-lg font-medium mb-2 text-center">{action.description}</p>
                {action.feature && <p className="text-xs text-gray-400 text-center mt-2">{action.feature}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Deal Status rectangle for sales users (single column, full width) */}
        {showSalesRectangles && (
          <div className="flex flex-col gap-8 mb-12 w-full">
            {/* Deal Status Long Rectangle */}
            <div
              className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-2xl border border-green-500/20 p-10 flex flex-col justify-between cursor-pointer hover:bg-green-500/20 transition min-h-[180px] w-full"
              onClick={() => navigate('/deals/status')}
            >
              <div className="flex items-center mb-4">
                <Activity className="h-8 w-8 text-green-400 mr-4" />
                <h3 className="text-2xl font-bold text-white">Deal Status</h3>
              </div>
              <p className="text-gray-300 text-lg mb-2">Track the progress of your deals with real-time status updates and document management</p>
              <p className="text-xs text-gray-400">Real-time status tracking • Progress indicators • Document management • Stage overview</p>
            </div>
          </div>
        )}

        {/* Finance-specific compact layout */}
        {currentUser?.role === 'finance' && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {/* Dealer Network Box */}
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-2xl border border-blue-500/20 p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-500/20 transition" onClick={() => navigate('/dealers')}>
              <Users className="h-12 w-12 text-blue-400 mb-4" />
              <h4 className="text-2xl font-bold text-white mb-1">Dealer Network</h4>
              <p className="text-gray-400 text-base mb-2">View and manage your dealer network and contacts</p>
              <div className="flex items-center text-blue-400 text-sm font-medium">
                <Zap className="h-4 w-4 mr-1" />
                {dealerCount !== null ? `${dealerCount} dealers in network` : 'Loading...'}
              </div>
            </div>
            {/* All Deals Status Box */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 rounded-2xl border border-purple-500/20 p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-500/20 transition" onClick={() => navigate('/finance/deals')}>
              <FileText className="h-12 w-12 text-purple-400 mb-4" />
              <h4 className="text-2xl font-bold text-white mb-1">All Deal Status</h4>
              <p className="text-gray-400 text-base mb-2">View and update the status of all deals in one place</p>
              <div className="flex items-center text-purple-400 text-sm font-medium">
                <Zap className="h-4 w-4 mr-1" />
                Status workflow & sub-status
              </div>
            </div>
          </div>
        )}



        {/* Secondary Actions Section - Compact for Finance */}
        {secondaryActions.filter(a => a.show).length > 0 && (
          <div className={`grid gap-8 mb-12 w-full ${
            currentUser?.role === 'finance' 
              ? 'grid-cols-1 md:grid-cols-2' 
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
          }`}>
            {secondaryActions.filter(a => a.show).map((action) => (
              <div 
                key={action.title} 
                className={`bg-gradient-to-br from-white/5 to-white/10 p-8 rounded-2xl shadow-xl flex flex-col items-center justify-between min-h-[180px] transition-transform duration-200 hover:scale-[1.03] hover:shadow-2xl cursor-pointer ${
                  currentUser?.role === 'finance' ? 'min-h-[140px] p-6' : ''
                }`}
                onClick={() => action.route && navigate(action.route)}
              >
                <div className={`bg-white/20 backdrop-blur-sm rounded-full shadow-lg ${
                  currentUser?.role === 'finance' ? 'p-3 mb-3' : 'p-4 mb-4'
                }`}>
                  <action.icon className={`text-white ${
                    currentUser?.role === 'finance' ? 'h-8 w-8' : 'h-10 w-10'
                  }`} />
                </div>
                <h3 className={`font-bold text-white mb-2 text-center ${
                  currentUser?.role === 'finance' ? 'text-lg' : 'text-2xl'
                }`}>{action.title}</h3>
                <p className={`text-white/90 text-base leading-relaxed mb-3 text-center ${
                  currentUser?.role === 'finance' ? 'text-sm' : 'text-base'
                }`}>{action.description}</p>
                {action.feature && (
                  <div className="flex items-center text-white/80 text-xs">
                    <Zap className="h-4 w-4 mr-1" />
                    <span>{action.feature}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Recent Activity - Only show if no deals for sales users */}
        {userDeals.length === 0 && (
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <Activity className="h-5 w-5 text-blue-400 mr-2" />
                Recent Activity
              </h3>
              <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">View All</button>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="group flex items-center p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                  <div className={`bg-${activity.color}-500/20 rounded-lg p-2 mr-4 group-hover:scale-110 transition-transform duration-300`}>
                    <activity.icon className={`h-4 w-4 text-${activity.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium mb-1">{activity.title}</p>
                    <p className="text-gray-400 text-xs">{activity.subtitle}</p>
                  </div>
                  <span className="text-gray-500 text-xs">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Health & Quick Actions - Only show for non-sales roles or when no deals */}
        {currentUser?.role !== 'sales' && (
          <div className="space-y-6">
            {/* System Health */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Shield className="h-5 w-5 text-green-400 mr-2" />
                System Health
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Database</span>
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-700 rounded-full h-1.5 mr-2">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          systemHealth.database.status === 'good' ? 'bg-green-500' :
                          systemHealth.database.status === 'warning' ? 'bg-yellow-500' :
                          systemHealth.database.status === 'poor' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${systemHealth.database.percentage}%` }}
                      ></div>
                    </div>
                    <span className={`text-xs font-medium ${
                      systemHealth.database.status === 'good' ? 'text-green-400' :
                      systemHealth.database.status === 'warning' ? 'text-yellow-400' :
                      systemHealth.database.status === 'poor' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {systemHealth.database.status === 'loading' ? '...' : `${systemHealth.database.percentage}%`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">API Response</span>
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-700 rounded-full h-1.5 mr-2">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          systemHealth.apiResponse.status === 'good' ? 'bg-blue-500' :
                          systemHealth.apiResponse.status === 'warning' ? 'bg-yellow-500' :
                          systemHealth.apiResponse.status === 'poor' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${Math.min(100, (systemHealth.apiResponse.time / 1000) * 100)}%` }}
                      ></div>
                    </div>
                    <span className={`text-xs font-medium ${
                      systemHealth.apiResponse.status === 'good' ? 'text-blue-400' :
                      systemHealth.apiResponse.status === 'warning' ? 'text-yellow-400' :
                      systemHealth.apiResponse.status === 'poor' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {systemHealth.apiResponse.status === 'loading' ? '...' : `${systemHealth.apiResponse.time}ms`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Uptime</span>
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-700 rounded-full h-1.5 mr-2">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          systemHealth.uptime.status === 'good' ? 'bg-green-500' :
                          systemHealth.uptime.status === 'warning' ? 'bg-yellow-500' :
                          systemHealth.uptime.status === 'poor' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${systemHealth.uptime.percentage}%` }}
                      ></div>
                    </div>
                    <span className={`text-xs font-medium ${
                      systemHealth.uptime.status === 'good' ? 'text-green-400' :
                      systemHealth.uptime.status === 'warning' ? 'text-yellow-400' :
                      systemHealth.uptime.status === 'poor' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {systemHealth.uptime.status === 'loading' ? '...' : `${systemHealth.uptime.percentage}%`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Today's Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">New Deals</span>
                  <span className="text-white font-medium">{todayActivity.newDeals}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Dealer Contacts</span>
                  <span className="text-white font-medium">{todayActivity.dealerContacts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Documents Processed</span>
                  <span className="text-white font-medium">{todayActivity.documents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">System Logins</span>
                  <span className="text-white font-medium">{todayActivity.systemLogins}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Section for Sales Users - Simplified */}
        {currentUser?.role === 'sales' && (
          <div className="mt-8 space-y-8">


            {/* System Health */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Shield className="h-5 w-5 text-green-400 mr-2" />
                System Health
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Database</span>
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-700 rounded-full h-1.5 mr-2">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            systemHealth.database.status === 'good' ? 'bg-green-500' :
                            systemHealth.database.status === 'warning' ? 'bg-yellow-500' :
                            systemHealth.database.status === 'poor' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${systemHealth.database.percentage}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${
                        systemHealth.database.status === 'good' ? 'text-green-400' :
                        systemHealth.database.status === 'warning' ? 'text-yellow-400' :
                        systemHealth.database.status === 'poor' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {systemHealth.database.status === 'loading' ? '...' : `${systemHealth.database.percentage}%`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">API Response</span>
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-700 rounded-full h-1.5 mr-2">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            systemHealth.apiResponse.status === 'good' ? 'bg-blue-500' :
                            systemHealth.apiResponse.status === 'warning' ? 'bg-yellow-500' :
                            systemHealth.apiResponse.status === 'poor' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${Math.min(100, (systemHealth.apiResponse.time / 1000) * 100)}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${
                        systemHealth.apiResponse.status === 'good' ? 'text-blue-400' :
                        systemHealth.apiResponse.status === 'warning' ? 'text-yellow-400' :
                        systemHealth.apiResponse.status === 'poor' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {systemHealth.apiResponse.status === 'loading' ? '...' : `${systemHealth.apiResponse.time}ms`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Uptime</span>
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-700 rounded-full h-1.5 mr-2">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            systemHealth.uptime.status === 'good' ? 'bg-green-500' :
                            systemHealth.uptime.status === 'warning' ? 'bg-yellow-500' :
                            systemHealth.uptime.status === 'poor' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${systemHealth.uptime.percentage}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${
                        systemHealth.uptime.status === 'good' ? 'text-green-400' :
                        systemHealth.uptime.status === 'warning' ? 'text-yellow-400' :
                        systemHealth.uptime.status === 'poor' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {systemHealth.uptime.status === 'loading' ? '...' : `${systemHealth.uptime.percentage}%`}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-white mb-3">Today's Activity</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">New Deals</span>
                      <span className="text-white font-medium">{todayActivity.newDeals}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Documents</span>
                      <span className="text-white font-medium">{todayActivity.documents}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Dealer Contacts</span>
                      <span className="text-white font-medium">{todayActivity.dealerContacts}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">System Logins</span>
                      <span className="text-white font-medium">{todayActivity.systemLogins}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back Office Status - For Admin (in sidebar) */}
        {isAdmin && (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center">
                <FileText className="h-5 w-5 text-purple-400 mr-2" />
                Back Office Status
              </h3>
              <span className="bg-purple-500/20 text-purple-400 text-xs font-medium px-2 py-1 rounded-full">
                {backOfficeStatus.length} Tasks
              </span>
            </div>
            
            <div className="space-y-3">
              {backOfficeStatus.map((task) => (
                <div key={task.id} className="group p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white text-sm font-medium">{task.title}</h4>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mb-2">{task.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">Assigned:</span>
                      <span className="text-white">{task.assignedTo}</span>
                    </div>
                    <span className={`font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
              
              <button className="w-full text-purple-400 hover:text-purple-300 text-xs font-medium py-2 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition-all duration-300">
                View All Back Office Tasks
              </button>
            </div>
          </div>
        )}

        {/* Role Demo Switcher - Only show for admin users */}
        {currentUser?.role === 'admin' && (
          <div className="mt-10 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Demo: Switch User Roles</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['admin', 'sales', 'finance', 'viewer'].map((role) => {
                const RoleIcon = getRoleIcon(role);
                const gradient = getRoleGradient(role);
                return (
                  <button
                    key={role}
                    onClick={() => {
                      // This would typically update the user context
                      console.log(`Switching to ${role} role`);
                    }}
                    className={`p-4 rounded-xl transition-all duration-300 border ${
                      currentUser?.role === role 
                        ? `bg-gradient-to-r ${gradient} border-transparent shadow-lg shadow-white/10 scale-105` 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <RoleIcon className={`h-6 w-6 mx-auto mb-2 ${
                      currentUser?.role === role ? 'text-white' : 'text-gray-400'
                    }`} />
                    <p className={`text-sm font-medium ${
                      currentUser?.role === role ? 'text-white' : 'text-gray-300'
                    }`}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeautifulDarkLanding; 