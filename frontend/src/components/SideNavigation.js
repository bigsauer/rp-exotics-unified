import React from 'react';
import { Users, FileText, Plus, Activity, Truck, Key, TrendingUp, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const SideNavigation = ({ isOpen, onClose, user }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Get role-specific navigation items
  const getNavigationItems = () => {
    const isAdmin = user?.role === 'admin';
    const isSales = user?.role === 'sales';
    const isFinance = user?.role === 'finance';
    const isIT = user?.role === 'it';

    // Base items that all roles can see
    const baseItems = [
      {
        title: 'Dashboard',
        icon: TrendingUp,
        route: '/'
      }
    ];

    // Role-specific items
    const roleItems = [];

    if (isAdmin || isSales) {
      roleItems.push(
        {
          title: 'New Deal',
          icon: Plus,
          route: '/deals/new'
        },
        {
          title: 'Deal Status',
          icon: FileText,
          route: '/deals/status'
        },
        {
          title: 'Dealers',
          icon: Users,
          route: '/dealers'
        },
        {
          title: 'Brokers',
          icon: Activity,
          route: '/brokers'
        },
        {
          title: 'Transport',
          icon: Truck,
          route: '/transport'
        }
      );
    }

    if (isAdmin || isFinance) {
      roleItems.push(
        {
          title: 'Dealers',
          icon: Users,
          route: '/dealers'
        },
        {
          title: 'All Deals',
          icon: FileText,
          route: '/finance/deals'
        }
      );
    }

    if (isAdmin) {
      roleItems.push(
        {
          title: 'Users',
          icon: Users,
          route: '/users'
        },
        {
          title: 'API Keys',
          icon: Key,
          route: '/apikeys'
        }
      );
    }

    if (isIT) {
      roleItems.push(
        {
          title: 'IT Dashboard',
          icon: Shield,
          route: '/it'
        }
      );
    }

    return [...baseItems, ...roleItems];
  };

  const navigationItems = getNavigationItems();

  return (
    <div className={`w-40 bg-gray-900 border-r border-gray-700 flex flex-col h-full transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-center space-x-2">
          <img 
            src="/rpexotics-logo.png" 
            alt="RP Exotics Logo" 
            className="h-5 w-5 object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div className="h-5 w-5 bg-blue-500 rounded hidden" />
          <h2 className="text-xs font-semibold text-white">Menu</h2>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => {
                navigate(item.route);
                if (onClose) onClose();
              }}
              className="w-full group flex flex-col items-center py-2 px-1 rounded-md hover:bg-gray-800 transition-colors duration-200"
            >
              <Icon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors mb-1" />
              <span className="text-xs text-gray-400 group-hover:text-white transition-colors text-center leading-tight">
                {item.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700">
        <div className="text-center mb-3">
          <div className="text-xs text-gray-400 mb-1">
            {user?.firstName} {user?.lastName}
          </div>
          <div className="text-xs text-gray-500">
            {user?.role}
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full group flex flex-col items-center py-2 px-1 rounded-md hover:bg-gray-800 transition-colors duration-200"
        >
          <LogOut className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors mb-1" />
          <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
            Logout
          </span>
        </button>
      </div>
    </div>
  );
};

export default SideNavigation; 