import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  ArrowLeft, 
  Save, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  User,
  Car,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const NewTransportPage = () => {
  const { user: currentUser, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleVin: '',
    vehicleType: '',
    transportType: 'Delivery to RP',
    shippingMethod: '',
    status: 'Provide Quote',
    originCity: '',
    originAddress: '',
    destinationCity: '',
    destinationAddress: '',
    requestedDate: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    notes: '',
    priority: 'normal'
  });
  const [errors, setErrors] = useState({});

  const vehicleTypes = [
    'Sedan',
    'Coupe',
    'SUV',
    'Truck',
    'Sports Car',
    'Luxury Vehicle',
    'Wagon',
    'Hatchback',
    'Convertible',
    'Van',
    'Motorcycle',
    'Other'
  ];

  const transportTypes = [
    'Delivery to RP',
    'Delivery from RP'
  ];

  const shippingMethods = [
    'Open',
    'Enclosed'
  ];

  const priorities = [
    { value: 'low', label: 'Low Priority', color: 'text-green-500' },
    { value: 'normal', label: 'Normal Priority', color: 'text-yellow-500' },
    { value: 'high', label: 'High Priority', color: 'text-red-500' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600 font-bold' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.vehicleYear) newErrors.vehicleYear = 'Vehicle year is required';
    if (!formData.vehicleMake) newErrors.vehicleMake = 'Vehicle make is required';
    if (!formData.vehicleModel) newErrors.vehicleModel = 'Vehicle model is required';
    if (!formData.vehicleVin) newErrors.vehicleVin = 'VIN is required';
    if (!formData.originCity) newErrors.originCity = 'Origin city is required';
    if (!formData.originAddress) newErrors.originAddress = 'Origin address is required';
    if (!formData.requestedDate) newErrors.requestedDate = 'Requested date is required';
    if (!formData.contactName) newErrors.contactName = 'Contact name is required';
    if (!formData.contactPhone) newErrors.contactPhone = 'Contact phone is required';
    
    // VIN validation
    if (formData.vehicleVin && formData.vehicleVin.length !== 17) {
      newErrors.vehicleVin = 'VIN must be exactly 17 characters';
    }
    
    // Year validation
    if (formData.vehicleYear && (formData.vehicleYear < 1900 || formData.vehicleYear > new Date().getFullYear() + 1)) {
      newErrors.vehicleYear = 'Please enter a valid year';
    }
    
    // Phone validation
    if (formData.contactPhone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.contactPhone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.contactPhone = 'Please enter a valid phone number';
    }
    
    // Email validation
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Generate a unique transport ID
      const transportId = `W-${new Date().getFullYear().toString().slice(-2)}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`;
      
      const transportData = {
        ...formData,
        id: transportId,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.username || 'Unknown',
        quotes: [
          { vendor: 'NTS', price: null },
          { vendor: 'Formula', price: null }
        ]
      };
      
      // For now, we'll just show a success message
      // In a real implementation, you'd send this to your backend API
      console.log('Transport data to be saved:', transportData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Transport booking created successfully!');
      navigate('/transport');
      
    } catch (error) {
      console.error('Error creating transport:', error);
      alert('Error creating transport booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (label, field, type = 'text', options = null, required = false, placeholder = '') => {
    const hasError = errors[field];
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        
        {type === 'select' ? (
          <select
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:border-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-600'
            }`}
          >
            <option value="">Select {label}</option>
            {options?.map((option, index) => (
              <option key={index} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={placeholder}
            rows={3}
            className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-600'
            }`}
          />
        ) : (
          <input
            type={type}
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-600'
            }`}
          />
        )}
        
        {hasError && (
          <p className="mt-1 text-sm text-red-400 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {hasError}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/transport')}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="bg-orange-500 p-2 rounded-lg">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">New Transport Booking</h1>
              <p className="text-gray-400">Create a new vehicle transport request</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vehicle Information */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <Car className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold">Vehicle Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderField('Vehicle Year', 'vehicleYear', 'number', null, true, '2024')}
              {renderField('Vehicle Make', 'vehicleMake', 'text', null, true, 'BMW')}
              {renderField('Vehicle Model', 'vehicleModel', 'text', null, true, 'M5')}
              {renderField('VIN', 'vehicleVin', 'text', null, true, 'WBS83FK06SCT42170')}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {renderField('Vehicle Type', 'vehicleType', 'select', vehicleTypes, false)}
              {renderField('Transport Type', 'transportType', 'select', transportTypes, false)}
              {renderField('Shipping Method', 'shippingMethod', 'select', shippingMethods, false)}
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="h-5 w-5 text-green-400" />
              <h2 className="text-lg font-semibold">Location Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-medium text-gray-300 mb-3">Origin</h3>
                <div className="space-y-4">
                  {renderField('City', 'originCity', 'text', null, true, 'San Antonio, TX')}
                  {renderField('Address', 'originAddress', 'textarea', null, true, '9711 Plymouth Rd')}
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-gray-300 mb-3">Destination</h3>
                <div className="space-y-4">
                  {renderField('City', 'destinationCity', 'text', null, false, 'Saint Louis, MO')}
                  {renderField('Address', 'destinationAddress', 'textarea', null, false, '1155 N Warson Rd')}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-semibold">Contact Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderField('Contact Name', 'contactName', 'text', null, true, 'John Doe')}
              {renderField('Phone', 'contactPhone', 'tel', null, true, '(555) 123-4567')}
              {renderField('Email', 'contactEmail', 'email', null, false, 'john@example.com')}
            </div>
          </div>

          {/* Transport Details */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-5 w-5 text-orange-400" />
              <h2 className="text-lg font-semibold">Transport Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Requested Date', 'requestedDate', 'date', null, true)}
              {renderField('Priority', 'priority', 'select', priorities, false)}
            </div>
            
            <div className="mt-4">
              {renderField('Notes', 'notes', 'textarea', null, false, 'Additional notes or special instructions...')}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/transport')}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Create Transport</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTransportPage; 