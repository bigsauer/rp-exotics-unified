import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  X,
  Car
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SellerUploadPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [uploadInfo, setUploadInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  
  // Form data for all the required fields from the Purchase Checklist
  const [formData, setFormData] = useState({
    // Consent agreement
    consentAgreement: false,
    
    // Document uploads
    photoId: null,
    titleFront: null,
    titleBack: null,
    registration: null,
    odometerPhoto: null,
    
    // Lien information
    hasLien: false,
    lienholderName: '',
    lienholderPhone: '',
    loanAccountNumber: '',
    lastFourSSN: '',
    
    // Address information
    mailingAddress: {
      street: '',
      city: '',
      state: '',
      zip: ''
    },
    emailAddress: '',
    
    // Pickup information
    pickupAddress: {
      street: '',
      city: '',
      state: '',
      zip: ''
    },
    pickupHours: ''
  });

  const API_BASE = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/seller-upload/verify/${token}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setUploadInfo(data.uploadInfo);
        setRemainingAttempts(data.uploadInfo.remainingAttempts);
        setExpiresAt(data.uploadInfo.expiresAt);
      } else {
        setError(data.message || 'Invalid upload link');
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      setError('Failed to verify upload link');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const processFiles = (files) => {
    // Validate file sizes
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`${file.name} is too large. Maximum file size is 10MB.`);
        return false;
      }
      return true;
    });
    
    // Limit to 10 files total
    const currentCount = selectedFiles.length;
    if (currentCount + validFiles.length > 10) {
      toast.error(`You can only upload up to 10 files. You have ${currentCount} selected and trying to add ${validFiles.length} more.`);
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      mailingAddress: {
        ...prev.mailingAddress,
        [field]: value
      }
    }));
  };

  const handlePickupAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      pickupAddress: {
        ...prev.pickupAddress,
        [field]: value
      }
    }));
  };

  const copyMailingToPickup = () => {
    setFormData(prev => ({
      ...prev,
      pickupAddress: {
        street: prev.mailingAddress.street,
        city: prev.mailingAddress.city,
        state: prev.mailingAddress.state,
        zip: prev.mailingAddress.zip
      }
    }));
    toast.success('Pickup address copied from mailing address');
  };

  const handleFileUpload = (field, file) => {
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} is too large. Maximum file size is 10MB.`);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const validateForm = () => {
    const errors = [];
    
    // Required consent agreement
    if (!formData.consentAgreement) errors.push('You must agree to sell your vehicle to RP Exotics');
    
    // Required document uploads
    if (!formData.photoId) errors.push('Photo ID is required');
    if (!formData.odometerPhoto) errors.push('Odometer photo is required');
    
    // Title photos are only required if there's no lien
    if (!formData.hasLien) {
      if (!formData.titleFront) errors.push('Front photo of title is required');
      if (!formData.titleBack) errors.push('Back photo of title is required');
    }
    
    // If there's a lien or no title photos, registration is required
    if (formData.hasLien && !formData.registration) {
      errors.push('Registration is required when there is a lien on the title');
    } else if (!formData.hasLien && !formData.titleFront && !formData.registration) {
      errors.push('Either title photos or registration is required');
    }
    
    // Lien information if applicable
    if (formData.hasLien) {
      if (!formData.lienholderName) errors.push('Lienholder name is required');
      if (!formData.lienholderPhone) errors.push('Lienholder phone is required');
      if (!formData.loanAccountNumber) errors.push('Loan account number is required');
      if (!formData.lastFourSSN) errors.push('Last four digits of SSN is required');
    }
    
    // Required address information
    if (!formData.mailingAddress.street) errors.push('Mailing address street is required');
    if (!formData.mailingAddress.city) errors.push('Mailing address city is required');
    if (!formData.mailingAddress.state) errors.push('Mailing address state is required');
    if (!formData.mailingAddress.zip) errors.push('Mailing address zip is required');
    
    // Required contact information
    if (!formData.emailAddress) errors.push('Email address is required');
    if (!formData.pickupAddress.street) errors.push('Pickup address street is required');
    if (!formData.pickupAddress.city) errors.push('Pickup address city is required');
    if (!formData.pickupAddress.state) errors.push('Pickup address state is required');
    if (!formData.pickupAddress.zip) errors.push('Pickup address zip is required');
    if (!formData.pickupHours) errors.push('Pickup hours are required');
    
    return errors;
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      toast.error(`Please fix the following errors: ${validationErrors.join(', ')}`);
      return;
    }

    setUploading(true);

    try {
      const formDataToSend = new FormData();
      
      // Add all the form data
      formDataToSend.append('formData', JSON.stringify(formData));
      
      // Add all uploaded files
      const allFiles = [
        formData.photoId,
        formData.titleFront,
        formData.titleBack,
        formData.registration,
        formData.odometerPhoto
      ].filter(Boolean);
      
      allFiles.forEach((file, index) => {
        formDataToSend.append('documents', file);
      });

      const response = await fetch(`${API_BASE}/api/seller-upload/upload/${token}`, {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setUploadedFiles(data.uploadedFiles);
        toast.success(data.message);
        
        // Show success message with more details
        setTimeout(() => {
          toast.success(
            `Purchase checklist completed successfully! ${data.documentsAdded} document(s) uploaded and automatically approved. The documents are now available in the deal file.`,
            { autoClose: 8000 }
          );
        }, 2000);
      } else {
        toast.error(data.message || 'Failed to submit purchase checklist');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to submit purchase checklist. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400 animate-spin mx-auto mb-3 sm:mb-4" />
          <p className="text-white text-sm sm:text-base">Verifying upload link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-6 sm:p-8 max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-400 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">Upload Link Error</h2>
            <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">{error}</p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
              Close Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-2 sm:p-3 mr-3 sm:mr-4">
                <Car className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">Document Upload</h1>
                <p className="text-gray-300 text-xs sm:text-sm">RP Exotics - Secure Document Upload</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Vehicle Information */}
        {uploadInfo && (
          <div className="bg-white/5 rounded-xl p-4 sm:p-6 border border-white/10 mb-6 sm:mb-8">
            <h2 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Vehicle Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">Vehicle</p>
                <p className="text-white font-medium text-sm sm:text-base">{uploadInfo.vehicleInfo}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">VIN</p>
                <p className="text-white font-medium text-sm sm:text-base break-all">{uploadInfo.vin}</p>
              </div>
            </div>
          </div>
        )}

        {/* Security Information */}
        {uploadInfo && (
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="bg-blue-500/20 rounded-lg p-2 mr-3">
                <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-base sm:text-lg font-medium text-white">Security Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div>
                <p className="text-blue-300 text-xs sm:text-sm">Remaining Upload Attempts</p>
                <p className="text-white font-medium">
                  {remainingAttempts !== null ? (
                    <span className={remainingAttempts > 1 ? 'text-green-400' : 'text-orange-400'}>
                      {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'}
                    </span>
                  ) : (
                    <span className="text-gray-400">Loading...</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-blue-300 text-xs sm:text-sm">Link Expires</p>
                <p className="text-white font-medium">
                  {expiresAt ? (
                    <span className="text-gray-300">
                      {new Date(expiresAt).toLocaleDateString()} at {new Date(expiresAt).toLocaleTimeString()}
                    </span>
                  ) : (
                    <span className="text-gray-400">Loading...</span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 p-3 bg-blue-900/30 rounded-lg">
              <p className="text-blue-200 text-xs">
                <strong>Security Notes:</strong> This is a secure, time-limited upload link. 
                Only upload documents related to this vehicle. 
                Supported formats: PDF, DOC, DOCX, JPG, PNG (max 10MB each).
              </p>
            </div>
          </div>
        )}

        {/* Purchase Checklist Form */}
        <div className="bg-white/5 rounded-xl p-4 sm:p-6 border border-white/10 mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Purchase Checklist</h2>
          
          <div className="space-y-6">
            {/* Consent Agreement */}
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 sm:p-6">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="consentAgreement"
                  checked={formData.consentAgreement}
                  onChange={(e) => handleInputChange('consentAgreement', e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                  required
                />
                <div className="flex-1">
                  <label htmlFor="consentAgreement" className="text-sm sm:text-base font-medium text-white cursor-pointer">
                    I agree to sell my vehicle to RP Exotics
                  </label>
                  <p className="text-gray-300 text-xs sm:text-sm mt-1">
                    By checking this box, I confirm that I am the legal owner of this vehicle and I agree to sell it to RP Exotics 
                    under the terms and conditions of our purchase agreement. I understand that this is a binding agreement to sell 
                    my vehicle and that RP Exotics will proceed with the purchase process based on the information and documents I provide.
                  </p>
                  <div className="mt-2 text-xs text-blue-300">
                    <strong>Important:</strong> This agreement is legally binding. Please ensure all information provided is accurate and complete.
                  </div>
                </div>
              </div>
            </div>
            {/* 1. Photo ID */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                1. Valid state-issued photo ID for all title holders *
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload('photoId', e.target.files[0])}
                className="block w-full text-xs sm:text-sm text-gray-300 file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
              {formData.photoId && (
                <p className="text-green-400 text-xs mt-1">✓ {formData.photoId.name}</p>
              )}
            </div>

            {/* 2. Title Photos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  2a. Front photo of the title in front of the vehicle {!formData.hasLien && '*'}
                  {formData.hasLien && <span className="text-gray-500">(Optional - lien on title)</span>}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload('titleFront', e.target.files[0])}
                  className="block w-full text-xs sm:text-sm text-gray-300 file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                {formData.titleFront && (
                  <p className="text-green-400 text-xs mt-1">✓ {formData.titleFront.name}</p>
                )}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  2b. Back photo of the title in front of the vehicle {!formData.hasLien && '*'}
                  {formData.hasLien && <span className="text-gray-500">(Optional - lien on title)</span>}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload('titleBack', e.target.files[0])}
                  className="block w-full text-xs sm:text-sm text-gray-300 file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                {formData.titleBack && (
                  <p className="text-green-400 text-xs mt-1">✓ {formData.titleBack.name}</p>
                )}
              </div>
            </div>

            {/* 3. Lien Information */}
            <div>
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="hasLien"
                  checked={formData.hasLien}
                  onChange={(e) => handleInputChange('hasLien', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="hasLien" className="text-xs sm:text-sm font-medium text-gray-300">
                  3. There is a lien on the title
                </label>
              </div>
              
              {formData.hasLien && (
                <div className="ml-6 space-y-3 bg-white/5 rounded-lg p-3">
                  <div className="mb-3 p-2 bg-blue-900/30 rounded text-xs text-blue-200">
                    <strong>Note:</strong> Since there is a lien on the title, title photos are now optional. 
                    However, registration is required to verify vehicle ownership.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                        Lienholder name *
                      </label>
                      <input
                        type="text"
                        value={formData.lienholderName}
                        onChange={(e) => handleInputChange('lienholderName', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter lienholder name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                        Contact phone number *
                      </label>
                      <input
                        type="tel"
                        value={formData.lienholderPhone}
                        onChange={(e) => handleInputChange('lienholderPhone', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                        Loan account number *
                      </label>
                      <input
                        type="text"
                        value={formData.loanAccountNumber}
                        onChange={(e) => handleInputChange('loanAccountNumber', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter loan account number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">
                        Last four digits of SSN *
                      </label>
                      <input
                        type="text"
                        value={formData.lastFourSSN}
                        onChange={(e) => handleInputChange('lastFourSSN', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="1234"
                        maxLength="4"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Registration (if no title) */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                4. Picture of Registration {formData.hasLien && '*'}
                {formData.hasLien && <span className="text-blue-400">(Required - lien on title)</span>}
                {!formData.hasLien && <span className="text-gray-500">(If you don't have a title)</span>}
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload('registration', e.target.files[0])}
                className="block w-full text-xs sm:text-sm text-gray-300 file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
              {formData.registration && (
                <p className="text-green-400 text-xs mt-1">✓ {formData.registration.name}</p>
              )}
            </div>

            {/* 5. Odometer Photo */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                5. Photo of the current odometer reading *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload('odometerPhoto', e.target.files[0])}
                className="block w-full text-xs sm:text-sm text-gray-300 file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
              />
              {formData.odometerPhoto && (
                <p className="text-green-400 text-xs mt-1">✓ {formData.odometerPhoto.name}</p>
              )}
            </div>

            {/* 6. Mailing Address */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                6. Mailing address for check *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={formData.mailingAddress.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Street Address"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.mailingAddress.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="City"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.mailingAddress.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="State"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.mailingAddress.zip}
                    onChange={(e) => handleAddressChange('zip', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="ZIP Code"
                  />
                </div>
              </div>
            </div>

            {/* 7. Email Address */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                7. Email address for the Bill of Sale *
              </label>
              <input
                type="email"
                value={formData.emailAddress}
                onChange={(e) => handleInputChange('emailAddress', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="your.email@example.com"
              />
            </div>

            {/* 8. Pickup Information */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-300">
                  8. Pick up address and pick up hours *
                </label>
                <button
                  type="button"
                  onClick={copyMailingToPickup}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                >
                  Same as mailing address
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={formData.pickupAddress.street}
                      onChange={(e) => handlePickupAddressChange('street', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Street Address"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.pickupAddress.city}
                      onChange={(e) => handlePickupAddressChange('city', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.pickupAddress.state}
                      onChange={(e) => handlePickupAddressChange('state', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.pickupAddress.zip}
                      onChange={(e) => handlePickupAddressChange('zip', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="ZIP Code"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={formData.pickupHours}
                  onChange={(e) => handleInputChange('pickupHours', e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Pick up hours (e.g., Mon-Fri 9AM-5PM)"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Submit Purchase Checklist
                </>
              )}
            </button>
          </div>
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-medium text-green-300 mb-3 sm:mb-4 flex items-center">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Successfully Uploaded
            </h2>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center space-x-2 sm:space-x-3 bg-white/5 rounded-lg p-2 sm:p-3">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs sm:text-sm font-medium truncate">{file.originalName}</p>
                    <p className="text-gray-400 text-xs">
                      Uploaded at {new Date(file.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-green-600/20 rounded-lg">
              <p className="text-green-300 text-xs sm:text-sm mb-2">
                ✅ Your documents have been successfully uploaded and will be reviewed by our team.
              </p>
              <p className="text-green-200 text-xs">
                <strong>What happens next:</strong>
              </p>
              <ul className="text-green-200 text-xs mt-1 space-y-1">
                <li>• Your documents are now saved securely in our system</li>
                <li>• Documents have been automatically approved</li>
                <li>• Documents are immediately available in the deal file</li>
                <li>• No further action is required from our team</li>
                <li>• You can now close this page - your upload is complete</li>
              </ul>
            </div>
          </div>
        )}

        {/* Information */}
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-medium text-blue-300 mb-2">ℹ️ Purchase Checklist Information</h3>
          <ul className="text-xs sm:text-sm text-gray-300 space-y-1">
            <li>• All fields marked with * are required</li>
            <li>• Photo ID must be a valid state-issued ID for all title holders</li>
            <li>• Title photos must be taken in front of the vehicle</li>
            <li>• If you have a lien, all lienholder information is required</li>
            <li>• If you don't have a title, registration is required</li>
            <li>• Odometer photo must show current mileage clearly</li>
            <li>• Mailing address is where your check will be sent</li>
            <li>• Email address will receive the Bill of Sale</li>
            <li>• Pickup information is for vehicle collection</li>
            <li>• This form will expire after 7 days</li>
          </ul>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
};

export default SellerUploadPage; 