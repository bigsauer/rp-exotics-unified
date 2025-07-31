import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Clock, 
  TrendingUp, 
  Search, 
  Filter, 
  Download, 
  Plus,
  ChevronDown,
  Eye,
  CheckCircle,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const TransportManagementPage = () => {
  const { user: currentUser, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [vendorFilter, setVendorFilter] = useState('All Vendors');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Mock data for demonstration - replace with actual API calls
  const mockTransports = [
    {
      id: 'W-07-010',
      vehicle: {
        year: '2024',
        make: 'Cadillac',
        model: 'Escalade ESV',
        vin: '1GYS4RKL2RR116683',
        type: 'Big SUV'
      },
      status: 'Provide Quote',
      type: 'Delivery to RP',
      location: {
        city: 'San Antonio, TX',
        address: '9711 Plymouth Rd'
      },
      requestedDate: 'Jul 29',
      contact: {
        name: 'Prestige',
        phone: '(210) 900-2014',
        email: 'Brennan Sauer'
      },
      quotes: [
        { vendor: 'NTS Best', price: '$925' },
        { vendor: 'Formula', price: 'Pending' }
      ]
    },
    {
      id: 'W-07-009',
      vehicle: {
        year: '2024',
        make: 'Mercedes-Benz',
        model: 'GLS 450',
        vin: '4JGFF5KEXRB221729',
        type: 'Open Transport'
      },
      status: 'Provide Quote',
      type: 'Delivery to RP',
      location: {
        city: 'New Rochelle, NY',
        address: '77 E Main St'
      },
      requestedDate: 'Jul 28',
      contact: {
        name: 'Unassigned',
        phone: 'Contact TBD',
        email: 'Adiana Palic'
      },
      quotes: [
        { vendor: 'NTS', price: 'Pending' },
        { vendor: 'Formula Best', price: '$1,100' }
      ]
    },
    {
      id: 'W-07-002',
      vehicle: {
        year: '2025',
        make: 'BMW',
        model: 'M5',
        vin: 'WBS83FK06SCT42170',
        type: 'Sedan'
      },
      status: 'Delivered',
      type: 'Delivery to RP',
      location: {
        city: 'San Antonio, TX',
        address: '9711 Plymouth Rd'
      },
      requestedDate: 'Jul 21',
      contact: {
        name: 'Prestige',
        phone: '(210) 900-2014',
        email: 'Brennan Sauer'
      },
      quotes: [
        { vendor: 'NTS Best', price: '$850' },
        { vendor: 'Formula', price: null }
      ]
    },
    {
      id: 'W-06-002',
      vehicle: {
        year: '2018',
        make: 'Mercedes-Benz',
        model: 'E 63 S',
        vin: 'WDDZH8KB6JA473612',
        type: 'Best Value'
      },
      status: 'Provide Quote',
      type: 'Delivery to RP',
      location: {
        city: 'Bonita Springs, FL',
        address: '28701 Trails Edge Blvd'
      },
      requestedDate: 'Jun 25',
      contact: {
        name: 'Adam',
        phone: '(239) 530-8212',
        email: 'Brennan Sauer'
      },
      quotes: [
        { vendor: 'NTS', price: '$1,575' },
        { vendor: 'Formula Best', price: '$1,200' }
      ]
    },
    {
      id: 'W-07-007',
      vehicle: {
        year: '2018',
        make: 'Mercedes-Benz',
        model: 'GLE 43 Coupe',
        vin: '4JGED6EB1JA094632',
        type: 'Open Transport'
      },
      status: 'In Transit',
      type: 'Delivery to RP',
      location: {
        city: 'Boerne, TX',
        address: '31805 IH 10 W'
      },
      requestedDate: 'Jul 25',
      contact: {
        name: 'Brian',
        phone: '(210) 233-6700',
        email: 'Adiana Palic'
      },
      quotes: [
        { vendor: 'NTS Best', price: '$875' },
        { vendor: 'Formula', price: null }
      ]
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTransports(mockTransports);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-500 text-white';
      case 'In Transit':
        return 'bg-blue-500 text-white';
      case 'Provide Quote':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'In Transit':
        return <Truck className="h-4 w-4" />;
      case 'Provide Quote':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredTransports = transports.filter(transport => {
    const matchesSearch = 
      transport.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transport.vehicle.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transport.vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transport.vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All Status' || transport.status === statusFilter;
    const matchesVendor = vendorFilter === 'All Vendors' || 
      transport.quotes.some(quote => quote.vendor.includes(vendorFilter));
    
    return matchesSearch && matchesStatus && matchesVendor;
  });

  const totalPages = Math.ceil(filteredTransports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransports = filteredTransports.slice(startIndex, endIndex);

  const activeTransports = transports.filter(t => t.status !== 'Delivered').length;
  const pendingQuotes = transports.filter(t => t.status === 'Provide Quote').length;
  const monthlyCosts = '$18.2K'; // This would be calculated from actual data

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
            <div className="bg-orange-500 p-2 rounded-lg">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Transport Management</h1>
              <p className="text-gray-400">Vehicle Transportation & Logistics</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/transport/new')}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Transport</span>
            </button>
            <div className="text-right">
              <p className="font-medium">{currentUser?.profile?.displayName || 'User'}</p>
              <p className="text-sm text-gray-400 capitalize">{currentUser?.role || 'User'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Transports</p>
                <p className="text-3xl font-bold">{activeTransports}</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-lg">
                <Truck className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-green-400 text-sm">
              <span className="bg-green-500/20 px-2 py-1 rounded text-xs">+3</span>
              <span className="ml-2">from last week</span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Quotes</p>
                <p className="text-3xl font-bold">{pendingQuotes}</p>
              </div>
              <div className="bg-orange-500 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-red-400 text-sm">
              <span className="bg-red-500/20 px-2 py-1 rounded text-xs">-2</span>
              <span className="ml-2">from yesterday</span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Monthly Costs</p>
                <p className="text-3xl font-bold">{monthlyCosts}</p>
              </div>
              <div className="bg-green-500 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-green-400 text-sm">
              <span className="bg-green-500/20 px-2 py-1 rounded text-xs">+12%</span>
              <span className="ml-2">vs last month</span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by VIN, transport ID, or vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option>All Status</option>
              <option>Provide Quote</option>
              <option>In Transit</option>
              <option>Delivered</option>
            </select>
            
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option>All Vendors</option>
              <option>NTS</option>
              <option>Formula</option>
            </select>
            
            <button className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Advanced Filters</span>
            </button>
            
            <button className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Transport Bookings Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Transport Bookings</h2>
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                {activeTransports} Active
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading transport bookings...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Transport ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Vehicle Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Type & Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Location & Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Quotes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {currentTransports.map((transport) => (
                      <tr key={transport.id} className="hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-blue-400">{transport.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium">
                              {transport.vehicle.year} {transport.vehicle.make} {transport.vehicle.model}
                            </div>
                            <div className="text-sm text-gray-400">
                              VIN: {transport.vehicle.vin}
                            </div>
                            <div className="text-sm text-gray-400">
                              {transport.vehicle.type}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transport.status)}`}>
                              {getStatusIcon(transport.status)}
                              <span className="ml-1">{transport.status}</span>
                            </span>
                            <div className="text-sm text-gray-400">
                              {transport.type}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                              {transport.location.city}
                            </div>
                            <div className="text-sm text-gray-400">
                              {transport.location.address}
                            </div>
                            <div className="flex items-center text-sm text-gray-400">
                              <Calendar className="h-4 w-4 mr-1" />
                              Requested: {transport.requestedDate}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="font-medium">{transport.contact.name}</div>
                            <div className="flex items-center text-sm text-gray-400">
                              <Phone className="h-4 w-4 mr-1" />
                              {transport.contact.phone}
                            </div>
                            <div className="flex items-center text-sm text-gray-400">
                              <Mail className="h-4 w-4 mr-1" />
                              {transport.contact.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            {transport.quotes.map((quote, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <span className="text-sm font-medium">{quote.vendor}</span>
                                <span className="text-sm text-gray-400">
                                  {quote.price || <DollarSign className="h-4 w-4" />}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors">
                              Details
                            </button>
                            {transport.status === 'Provide Quote' && (
                              <button className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors">
                                Accept
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTransports.length)} of {filteredTransports.length} transport bookings
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded transition-colors ${
                        currentPage === page
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransportManagementPage; 