// NOTE: All backend API calls should use process.env.REACT_APP_API_URL (set in .env) for the base URL.
import React, { useState, useEffect } from 'react';
import { 
  Car, ArrowLeft, Save, Send, CheckCircle, Loader2, 
  Calendar, DollarSign, User, 
  MapPin, Phone, Mail, Hash, Palette, Gauge, 
  Info, Plus, AlertCircle 
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Optimistic Rendering for Deal Submission ---
// Assume setDeals is available via props or context. If not, add a callback prop or context usage as needed.
// Add a new prop: setDeals (function to update deals list)

const NewDealEntry = ({ setDeals }) => {
  const { user: currentUser, getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  // Utility to get backend API URL
  const API_BASE = process.env.REACT_APP_API_URL || '';

  // Utility to merge auth headers
  const buildHeaders = (extra = {}) => {
    const headers = {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
      ...extra
    };
    // Debug: log token presence
    if (!headers['Authorization']) {
      console.warn('[DEAL SUBMIT] No Authorization token in headers!');
    } else {
      console.log('[DEAL SUBMIT] Using Authorization header:', headers['Authorization']);
    }
    return headers;
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const [formData, setFormData] = useState({
    // Vehicle Information
    vin: '',
    year: '',
    make: '',
    model: '',
    mileage: '',
    exteriorColor: '',
    interiorColor: '',
    
    // Deal Information
    dealType: '',
    dealType2SubType: '', // <-- Add this for Deal Type 2 sub-options
    fundingSource: '',
    purchaseDate: todayStr,
    paymentMethod: 'check', // Default to 'check'
    currentStage: 'contract-received',
    
    // Financial Information
    purchasePrice: '',
    listPrice: '',
    killPrice: '',
    wholesalePrice: '',
    commissionRate: '',
    brokerageFee: '',
    brokerageFeePaidTo: '',
    payoffBalance: '',
    amountDueToCustomer: '',
    amountDueToRP: '',
    
    // Seller Information
    sellerName: '',
    sellerAddress: '',
    sellerPhone: '',
    sellerEmail: '',
    sellerLicenseNumber: '',
    sellerTier: 'Tier 1',
    
    // Buyer Information (for buy/sell deals)
    buyerName: '',
    buyerAddress: '',
    buyerPhone: '',
    buyerEmail: '',
    buyerLicenseNumber: '',
    buyerTier: 'Tier 1',
    
    // Buy/Sell Configuration
    buyerType: 'dealer', // 'private' or 'dealer' - default to dealer for buy/sell
    sellerType: 'private', // 'private' or 'dealer'
    
    // RP Information
    rpStockNumber: '',
    vehicleDescription: '',
    generalNotes: '',
    
    // Documentation
    contractRequired: false,
    titlePresent: false,
    driverLicensePresent: false,
    odometerPresent: false,
    dealerLicensePresent: false,
    documents: [], // For uploaded files
    salesperson: ''
  });

  const [vinDecoding, setVinDecoding] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);
  const [dealerSuggestions, setDealerSuggestions] = useState([]);
  const [dealerBuyerSuggestions, setDealerBuyerSuggestions] = useState([]); // For Dealer Info (Buyer)
  const [dealerSearch, setDealerSearch] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  // Remove documentTypes and documentTypeSelections state
  // Add notes state for each file
  const [documentNotes, setDocumentNotes] = useState([]); // Array of {fileIndex, note}

  useEffect(() => {
    // Fetch document types from backend
    const url = `${API_BASE}/api/backoffice/document-types`;
    console.log('[DEBUG][NewDealEntry] Fetching document types from:', url);
    fetch(url, {
      credentials: 'include',
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          // setDocumentTypes(data.data); // This line was removed
        }
      })
      .catch(() => {
        // setDocumentTypes([]); // This line was removed
      });
  }, [getAuthHeaders]);

  // Helper function to format currency input
  const formatCurrency = (value) => {
    if (!value) return '';
    // Remove all non-numeric characters except decimal point
    const numericValue = value.toString().replace(/[^\d.]/g, '');
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return numericValue;
  };

  // Add a helper to join address parts into a single line
  function joinAddress(address) {
    if (!address) return '';
    const { street, city, state, zip } = address;
    return [street, city, state, zip].filter(Boolean).join(', ');
  }
  // Add a helper to parse a single line address into parts
  function parseAddress(full) {
    if (!full) return { street: '', city: '', state: '', zip: '' };
    const parts = full.split(',').map(s => s.trim());
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      zip: parts[3] || ''
    };
  }


  // Get dynamic labels based on deal type
  const getDynamicLabels = () => {
    const dealType2 = formData.dealType2SubType;
    const isRetailPP = formData.dealType === 'retail-pp';
    
    return {
      purchasePriceLabel: dealType2 === 'sale' ? 'Sale Price' : 'Purchase Price',
      sellerLabel: dealType2 === 'sale' ? 'Sold To' : 'Purchased From',
      sellerSectionTitle: dealType2 === 'sale' ? 'Buyer Information' : 'Seller Information',
      // For retail PP deals, use more generic labels
      companyLabel: isRetailPP ? 'Company (if applicable)' : 'Company/Dealer',
      licenseLabel: isRetailPP ? 'License Number (if applicable)' : 'Dealer License Number',
      addressLabel: isRetailPP ? 'Address' : 'Seller Address'
    };
  };

  const dynamicLabels = getDynamicLabels();

  // Remove Deal Type 2 from main dealTypes
  const dealTypes = [
    { value: 'wholesale-d2d', label: 'Wholesale - D2D' },
    { value: 'wholesale-private', label: 'Wholesale - Private Party' },
    { value: 'wholesale-flip', label: 'Wholesale - Flip' },
    { value: 'retail-pp', label: 'Retail - PP' },
    { value: 'retail-auction', label: 'Retail - Auction' },
    { value: 'retail-dtod', label: 'Retail - DtoD' },
    { value: 'auction', label: 'Auction' }
  ];

  const fundingSources = [
    { value: 'flpn-retail', label: 'FLPN - Retail' },
    { value: 'flpn-wholesale', label: 'FLPN - Wholesale' },
    { value: 'cash', label: 'Cash' },
    { value: 'flooring-line', label: 'Flooring Line' },
    { value: 'consignment', label: 'Consignment' }
  ];

  const paymentMethods = [
    { value: 'check', label: 'Check' },
    { value: 'wire', label: 'Wire Transfer' },
    { value: 'ach', label: 'ACH' },
    { value: 'cash', label: 'Cash' },
    { value: 'financed', label: 'Financed' }
  ];

  const dealType2SubOptions = [
    { value: 'buy', label: 'Buy' },
    { value: 'sale', label: 'Sale' },
    { value: 'buy-sell', label: 'Buy/Sell' },
    { value: 'consign-a', label: 'Consign-A' },
    { value: 'consign-b', label: 'Consign-B' },
    { value: 'consign-c', label: 'Consign-C' },
    { value: 'consign-rdnc', label: 'Consign-RDNC' }
  ];

  // Add to formData initial state
  // This block is removed as per the edit hint.

  // Add salesperson options
  const salespersonOptions = [
    { value: 'Brennan S', label: 'Brennan S' },
    { value: 'Parker G', label: 'Parker G' },
    { value: 'Dan M', label: 'Dan M' },
    { value: 'Adiana P', label: 'Adiana P' },
    { value: 'Brett M', label: 'Brett M' },
    { value: 'Other', label: 'Other' }
  ];

  // Get deal type specific fields
  const getDealTypeFields = () => {
    // Both dealType and dealType2SubType are always required
    const dealType = formData.dealType;
    return {
      showFinancials: [
        'wholesale-d2d', 'wholesale-private', 'wholesale-flip',
        'retail-pp', 'retail-auction', 'retail-dtod', 'auction'
      ].includes(dealType),
      showSellerInfo: true,
      showDocumentation: [
        'wholesale-d2d', 'wholesale-private', 'wholesale-flip',
        'retail-pp', 'retail-auction', 'retail-dtod', 'auction'
      ].includes(dealType),
      requiredFields: ['vin', 'dealType', 'dealType2SubType', 'year', 'make', 'model', 'sellerName']
    };
  };

  const dealTypeFields = getDealTypeFields();

  // Real VIN decode function using backend API
  const decodeVIN = async (vin) => {
    setVinDecoding(true);
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const url = `${API_BASE}/api/deals/vin/decode`;
      console.log('[DEBUG][NewDealEntry] VIN decode fetch from:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ vin }),
        credentials: 'include'
      });
      console.log('[DEBUG][NewDealEntry] VIN decode response status:', response.status);
      const data = await response.json();
      console.log('[VIN DECODE] Response data:', data);
      if (data.success && data.data) {
        setFormData(prev => ({
          ...prev,
          year: data.data.year || '',
          make: data.data.make || '',
          model: data.data.model || ''
        }));
        setVinDecoded(true);
        setTimeout(() => setVinDecoded(false), 3000);
      } else {
        console.error('VIN decode failed:', data.error);
        alert(data.error || 'Unable to decode VIN. Please check the VIN and try again.');
      }
    } catch (error) {
      console.error('[VIN DECODE] Error:', error);
      alert('Unable to decode VIN. Please check your connection and try again.');
    } finally {
      setVinDecoding(false);
    }
  };

  // Real dealer search using backend API
  const searchDealers = async (query) => {
    if (query.length < 2) {
      setDealerSuggestions([]);
      return;
    }
    // setSearchingDealers(true); // Removed unused state
    try {
      const url = `${API_BASE}/api/dealers/search?q=${encodeURIComponent(query)}`;
      console.log('[DEBUG][NewDealEntry] Dealer search fetch from:', url);
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      setDealerSuggestions(data.dealers || []);
      console.log('[DEALER SEARCH] Suggestions:', data.dealers || []);
    } catch (error) {
      console.error('Dealer search error:', error);
      setDealerSuggestions([]);
    }
  };

  // Dealer search for Dealer Info (Buyer)
  const searchDealersBuyer = async (query) => {
    if (query.length < 2) {
      setDealerBuyerSuggestions([]);
      return;
    }
    try {
      const url = `${API_BASE}/api/dealers/search?q=${encodeURIComponent(query)}`;
      console.log('[DEBUG][NewDealEntry] Dealer buyer search fetch from:', url);
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      setDealerBuyerSuggestions(data.dealers || []);
    } catch (error) {
      console.error('Dealer search error:', error);
      setDealerBuyerSuggestions([]);
    }
  };

  // Autofill dealer info when a suggestion is selected
  const handleDealerSuggestionClick = (dealer) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        sellerName: dealer.name || '',
        sellerAddress: dealer.addressString || '',
        sellerPhone: dealer.phone || '',
        sellerEmail: dealer.email || '',
        sellerLicenseNumber: dealer.licenseNumber || '',
        sellerTier: dealer.tier || 'Tier 1',
        sellerType: 'dealer', // Set sellerType to dealer when a dealer is selected
      };
      console.log('[DEBUG] handleDealerSuggestionClick - sellerType set to:', updated.sellerType);
      return updated;
    });
    setDealerSuggestions([]);
    setDealerSearch('');
    console.log('[DEALER AUTOFILL] Selected dealer:', dealer);
    console.log('[DEALER AUTOFILL] Autofilled address:', dealer.addressString);
    console.log('[DEALER AUTOFILL] Autofilled license number:', dealer.licenseNumber);
  };

  // Auto-generate stock number
  // useEffect(() => {
  //   if (!formData.rpStockNumber && formData.year && formData.make) {
  //     const year = new Date().getFullYear();
  //     const stockNumber = `RP${year}${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
  //     setFormData(prev => ({ ...prev, rpStockNumber: stockNumber }));
  //   }
  // }, [formData.year, formData.make, formData.rpStockNumber]);

  const handleInputChange = (field, value) => {
    let processedValue = value;
    
    // Handle currency formatting for financial fields
    if (['purchasePrice', 'listPrice', 'killPrice', 'wholesalePrice', 'brokerageFee', 'payoffBalance', 'amountDueToCustomer', 'amountDueToRP'].includes(field)) {
      processedValue = formatCurrency(value);
    }
    
    // If changing dealType, reset dealType2SubType unless still deal-type-2
    if (field === 'dealType') {
      setFormData(prev => ({
        ...prev,
        dealType: processedValue,
        dealType2SubType: processedValue === 'deal-type-2' ? prev.dealType2SubType : 
                         processedValue === 'wholesale-flip' ? 'buy-sell' : '',
        // Set default buyer/seller types for wholesale flip deals
        buyerType: processedValue === 'wholesale-flip' ? 'dealer' : prev.buyerType,
        sellerType: processedValue === 'wholesale-flip' ? 'private' : prev.sellerType
      }));
      if (currentStep > 1) setCurrentStep(1);
      return;
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
    
    // Trigger VIN decode when VIN is 17 characters
    if (field === 'vin' && processedValue.length === 17 && !vinDecoded) {
      decodeVIN(processedValue);
    }
    
    // Search dealers when typing in seller field (only if seller type is dealer)
    if (field === 'sellerName') {
      if (formData.dealType === 'wholesale-flip' && formData.dealType2SubType === 'buy-sell') {
        // For buy/sell deals, only search if seller type is dealer
        if (formData.sellerType === 'dealer') {
          searchDealers(processedValue);
        } else {
          setDealerSuggestions([]); // Clear suggestions for private party
        }
      } else {
        // For other deals, always search
        searchDealers(processedValue);
      }
    }

    // Search dealers when typing in buyer field (only if buyer type is dealer)
    if (field === 'buyerName') {
      if (formData.buyerType === 'dealer') {
        searchDealersBuyer(processedValue);
      } else {
        setDealerBuyerSuggestions([]); // Clear suggestions for private party
      }
    }

    // Clear dealer suggestions when switching types
    if (field === 'sellerType' || field === 'buyerType') {
      if (field === 'sellerType' && processedValue === 'private') {
        setDealerSuggestions([]);
      }
      if (field === 'buyerType' && processedValue === 'private') {
        setDealerBuyerSuggestions([]);
      }
    }

    // Reset to step 1 when deal type changes
    if (field === 'dealType' && currentStep > 1) {
      setCurrentStep(1);
    }
  };

  // Handle file uploads for documentation
  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      documents: [...(prev.documents || []), ...files]
    }));
    setDocumentNotes(prev => ([
      ...prev,
      ...files.map((_, i) => ({ fileIndex: (prev.length + i), note: '' }))
    ]));
  };
  const handleRemoveDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
    setDocumentNotes(prev => prev.filter(sel => sel.fileIndex !== index).map(sel => ({ ...sel, fileIndex: sel.fileIndex > index ? sel.fileIndex - 1 : sel.fileIndex })));
  };
  const handleDocumentNoteChange = (fileIndex, note) => {
    setDocumentNotes(prev => {
      const found = prev.find(sel => sel.fileIndex === fileIndex);
      if (found) {
        return prev.map(sel => sel.fileIndex === fileIndex ? { ...sel, note } : sel);
      } else {
        return [...prev, { fileIndex, note }];
      }
    });
  };

  // When a dealer is selected for seller, autofill full address and license number
  const handleDealerSuggestionSelect = (dealer) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        sellerName: dealer.name || '',
        sellerCompany: dealer.company || '',
        sellerPhone: dealer.phone || '',
        sellerEmail: dealer.email || '',
        sellerAddress: dealer.addressString || '',
        sellerLicenseNumber: dealer.licenseNumber || '',
        sellerTier: dealer.tier || 'Tier 1',
        sellerType: 'dealer', // Set sellerType to dealer when a dealer is selected
      };
      console.log('[DEBUG] handleDealerSuggestionSelect - sellerType set to:', updated.sellerType);
      return updated;
    });
    setDealerSuggestions([]);
    setDealerSearch('');
  };

  // When a dealer is selected for buyer, autofill full address and license number
  const handleBuyerDealerSuggestionSelect = (dealer) => {
    setFormData(prev => ({
      ...prev,
      buyerName: dealer.name || '',
      buyerAddress: dealer.addressString || '',
      buyerPhone: dealer.phone || '',
      buyerEmail: dealer.email || '',
      buyerLicenseNumber: dealer.licenseNumber || '',
      buyerTier: dealer.tier || 'Tier 1'
    }));
    setDealerBuyerSuggestions([]);
    console.log('[BUYER DEALER AUTOFILL] Selected dealer:', dealer);
  };

  const validateForm = () => {
    const errors = {};
    let requiredFields = dealTypeFields.requiredFields || ['vin', 'dealType', 'dealType2SubType', 'year', 'make', 'model', 'sellerName'];
    
    // Add buyer fields for wholesale flip deals
    if (formData.dealType === 'wholesale-flip') {
      requiredFields = [...requiredFields, 'buyerName'];
    }
    
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].toString().trim() === '') {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });

    // Additional validation for specific fields
    // REMOVE strict VIN length check
    // if (formData.vin && formData.vin.length !== 17) {
    //   errors.vin = 'VIN must be exactly 17 characters';
    // }

    if (formData.year && (formData.year < 1900 || formData.year > new Date().getFullYear() + 1)) {
      errors.year = 'Please enter a valid year';
    }

    if (formData.mileage && formData.mileage < 0) {
      errors.mileage = 'Mileage cannot be negative';
    }

    if (dealTypeFields.showFinancials && formData.purchasePrice && formData.purchasePrice <= 0) {
      errors.purchasePrice = 'Purchase price must be greater than 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- Optimistic Rendering for Deal Submission ---
  // Assume setDeals is available via props or context. If not, add a callback prop or context usage as needed.
  // Add a new prop: setDeals (function to update deals list)

  const handleSave = async (isDraft = false) => {
    if (!currentUser) {
      alert('You must be logged in to submit a deal.');
      navigate('/login');
      return;
    }
    if (!isDraft && !validateForm()) {
      console.log('[DEAL SUBMIT] Validation errors:', formErrors);
      return;
    }
    setSaving(true);

    // --- Optimistic UI: Add temp deal to UI immediately ---
    const tempId = 'temp-' + Date.now();
    const optimisticDeal = {
      ...formData,
      id: tempId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Add any other fields your deals list expects
    };
    if (setDeals) {
      setDeals(deals => [optimisticDeal, ...deals]);
    }

    try {
      // Debug: log formData before building dealData
      console.log('[DEAL SUBMIT] formData:', formData);
      console.log('[DEBUG] handleSave - sellerType in formData:', formData.sellerType);
      // Log all financial fields from formData
      console.log('[DEAL SUBMIT] Financial fields:', {
        brokerageFee: formData.brokerageFee,
        brokerageFeePaidTo: formData.brokerageFeePaidTo,
        payoffBalance: formData.payoffBalance,
        amountDueToCustomer: formData.amountDueToCustomer,
        amountDueToRP: formData.amountDueToRP,
        commissionRate: formData.commissionRate
      });
      const currentStage = 'contract-received';
      // First, create the deal in the backend
      const dealData = {
        vehicle: `${formData.year} ${formData.make} ${formData.model}`,
        vin: formData.vin,
        year: parseInt(formData.year),
        make: formData.make,
        model: formData.model,
        rpStockNumber: formData.rpStockNumber,
        color: formData.exteriorColor,
        exteriorColor: formData.exteriorColor, // Add this field
        interiorColor: formData.interiorColor, // Add this field
        mileage: parseInt(formData.mileage) || 0,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        listPrice: parseFloat(formData.listPrice) || 0,
        killPrice: parseFloat(formData.killPrice) || 0,
        wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
        dealType: formData.dealType,
        dealType2SubType: formData.dealType2SubType, // <-- Ensure this is sent
        dealType2: formData.dealType2SubType, // <-- Add this for backend compatibility
        seller: {
          name: formData.sellerName,
          type: formData.sellerType || (formData.dealType === 'wholesale-flip' ? 'private' : formData.dealType.includes('private') ? 'private' : 'dealer'),
          contact: {
            address: parseAddress(formData.sellerAddress), // Use parsed address
            phone: formData.sellerPhone,
            email: formData.sellerEmail
          },
          licenseNumber: formData.sellerLicenseNumber,
          tier: formData.sellerTier
        },
        // Always include buyer info if present
        buyer: {
          name: formData.buyerName,
          type: formData.buyerType,
          contact: {
            address: parseAddress(formData.buyerAddress),
            phone: formData.buyerPhone,
            email: formData.buyerEmail
          },
          licenseNumber: formData.buyerLicenseNumber,
          tier: formData.buyerTier
        },
        fundingSource: formData.fundingSource,
        paymentMethod: formData.paymentMethod,
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : new Date(),
        currentStage: currentStage || 'contract-received',
        salesperson: currentUser.name || 'Unknown', // Use current user's name as salesperson
        // --- Add all financial fields below ---
        brokerFee: parseFloat(formData.brokerageFee) || 0,
        brokerFeePaidTo: formData.brokerageFeePaidTo || '',
        payoffBalance: parseFloat(formData.payoffBalance) || 0,
        amountDueToCustomer: parseFloat(formData.amountDueToCustomer) || 0,
        amountDueToRP: parseFloat(formData.amountDueToRP) || 0,
        commissionRate: parseFloat(formData.commissionRate) || 0,
        generalNotes: formData.generalNotes // <-- Ensure this is sent
      };
      console.log('[DEBUG] handleSave - dealData.seller.type:', dealData.seller.type);
      // Debug: log license numbers being sent
      console.log('[DEAL SUBMIT] SENDING seller license number:', formData.sellerLicenseNumber);
      console.log('[DEAL SUBMIT] SENDING buyer license number:', formData.buyerLicenseNumber);
      // Debug: log dealData before sending
      console.log('[DEAL SUBMIT] dealData to backend:', dealData);
      // Force as last resort
      dealData.currentStage = 'contract-received';
      console.log('[DEBUG] dealData.currentStage (final):', dealData.currentStage);
      console.log('[DEBUG] Full dealData:', dealData);
      // Create deal (this would be your existing deal creation endpoint)
      const dealResponse = await fetch(`${API_BASE}/api/deals`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(dealData),
        credentials: 'include'
      });
      // Debug: log backend response status
      console.log('[DEAL SUBMIT] Backend response status:', dealResponse.status);
      const dealResult = await dealResponse.json().catch(() => ({}));
      console.log('[DEAL SUBMIT] Backend response JSON:', dealResult);
      if (!dealResponse.ok || !dealResult.success || !dealResult.deal) {
        throw new Error(dealResult.error || 'Failed to create deal');
      }
      // --- Optimistic UI: Replace temp deal with real deal ---
      if (setDeals) {
        setDeals(deals => deals.map(d => d.id === tempId ? dealResult.deal : d));
      }
      
      // Automatically generate documents after successful deal creation
      try {
        console.log('[DEAL SUBMIT] Generating documents for deal:', dealResult.deal._id);
        const docResponse = await fetch(`${API_BASE}/api/documents/generate/${dealResult.deal._id}`, {
          method: 'POST',
          headers: buildHeaders(),
          credentials: 'include'
        });
        
        if (docResponse.ok) {
          const docResult = await docResponse.json();
          console.log('[DEAL SUBMIT] Documents generated successfully:', docResult);
          toast.success('Deal submitted and documents generated successfully!');
        } else {
          console.warn('[DEAL SUBMIT] Document generation failed, but deal was created');
          toast.success('Deal submitted successfully! (Documents will be generated later)');
        }
      } catch (docError) {
        console.error('[DEAL SUBMIT] Error generating documents:', docError);
        toast.success('Deal submitted successfully! (Documents will be generated later)');
      }
      
      // Optionally redirect to a success page or clear form
      if (!isDraft) {
        // Clear form or redirect
        setFormData({
          vin: '',
          year: '',
          make: '',
          model: '',
          mileage: '',
          exteriorColor: '',
          interiorColor: '',
          dealType: '',
          dealType2SubType: '',
          fundingSource: '',
          purchaseDate: todayStr,
          paymentMethod: 'check',
          currentStage: 'contract-received',
          purchasePrice: '',
          listPrice: '',
          killPrice: '',
          wholesalePrice: '',
          commissionRate: '',
          brokerageFee: '',
          brokerageFeePaidTo: '',
          payoffBalance: '',
          amountDueToCustomer: '',
          amountDueToRP: '',
          sellerName: '',
          sellerAddress: '',
          sellerPhone: '',
          sellerEmail: '',
          sellerLicenseNumber: '',
          sellerTier: 'Tier 1',
          buyerName: '',
          buyerAddress: '',
          buyerPhone: '',
          buyerEmail: '',
          buyerLicenseNumber: '',
          buyerTier: 'Tier 1',
          buyerType: 'dealer',
          sellerType: 'private',
          rpStockNumber: '',
          vehicleDescription: '',
          generalNotes: '',
          contractRequired: false,
          titlePresent: false,
          driverLicensePresent: false,
          odometerPresent: false,
          dealerLicensePresent: false,
          documents: [],
          salesperson: ''
        });
        setCurrentStep(1);
      }
      
    } catch (error) {
      // --- Optimistic UI: Remove temp deal on failure ---
      if (setDeals) {
        setDeals(deals => deals.filter(d => d.id !== tempId));
      }
      if (error.message.includes('401') || error.message.includes('not authorized')) {
        alert('Session expired or not authorized. Please log in again.');
        navigate('/login');
      } else {
        alert(`Error saving deal: ${error.message}`);
        console.log('[DEAL SUBMIT] Error:', error);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEmailToListingTeam = () => {
    const emailBody = `New Vehicle Ready for Listing

Vehicle: ${formData.year} ${formData.make} ${formData.model}
VIN: ${formData.vin}
Stock #: ${formData.rpStockNumber}
Mileage: ${formData.mileage}
Exterior: ${formData.exteriorColor}
Interior: ${formData.interiorColor}

Description:
${formData.vehicleDescription}

Please prepare listing materials for this vehicle.

Best regards,
${currentUser.name}`;

    const mailtoLink = `mailto:listing@rpexotics.com?subject=New Vehicle for Listing - ${formData.year} ${formData.make} ${formData.model}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoLink);
  };

  // Remove handleCompleteDeal and use handleSave for final submission
  // Update button text and alerts

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isCompleted = currentStep > stepNumber;
          
          let stepTitle = '';
          let stepDescription = '';
          
          if (stepNumber === 1) {
            stepTitle = 'Vehicle & Deal Type';
            stepDescription = 'Enter vehicle information and select deal type';
          } else if (stepNumber === 2) {
            stepTitle = 'Deal Configuration';
            stepDescription = 'Configure funding, payment, and timeline';
          } else if (stepNumber === 3 && dealTypeFields.showFinancials) {
            stepTitle = 'Financial Information';
            stepDescription = 'Set pricing and financial terms';
          } else if ((stepNumber === 3 && !dealTypeFields.showFinancials && dealTypeFields.showSellerInfo) || 
                     (stepNumber === 4 && dealTypeFields.showFinancials && dealTypeFields.showSellerInfo)) {
            stepTitle = formData.dealType === 'wholesale-flip' ? 'Buyer & Seller Information' : 'Seller Information';
            stepDescription = formData.dealType === 'wholesale-flip' ? 'Add buyer and seller contact information' : 'Add seller contact information';
          } else if ((stepNumber === 3 && !dealTypeFields.showFinancials && !dealTypeFields.showSellerInfo && dealTypeFields.showDocumentation) ||
                     (stepNumber === 4 && dealTypeFields.showFinancials && !dealTypeFields.showSellerInfo && dealTypeFields.showDocumentation) ||
                     (stepNumber === 5 && dealTypeFields.showFinancials && dealTypeFields.showSellerInfo && dealTypeFields.showDocumentation)) {
            stepTitle = 'Documentation & Notes';
            stepDescription = 'Document status and additional notes';
          }
          
          return (
            <div key={stepNumber} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                isActive 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : isCompleted 
                    ? 'bg-green-600 border-green-600 text-white' 
                    : 'bg-white/10 border-white/20 text-gray-400'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{stepNumber}</span>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {stepTitle}
                </p>
                <p className="text-xs text-gray-500">{stepDescription}</p>
              </div>
              {stepNumber < totalSteps && (
                <div className={`w-16 h-0.5 mx-4 ${isCompleted ? 'bg-green-600' : 'bg-white/20'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFormField = (label, field, type = 'text', options = null, required = false, icon = null, isDealerBuyer = false) => {
    return (
      <div className="space-y-2">
        <label className="flex items-center text-sm font-medium text-gray-300">
          {icon && React.createElement(icon, { className: "h-4 w-4 mr-2" })}
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        
        {type === 'select' ? (
          <select
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={`w-full bg-white/10 border rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              formErrors[field] ? 'border-red-500' : 'border-white/20 hover:border-white/30'
            }`}
          >
            <option value="">Select {label}</option>
            {options?.map(option => (
              <option key={option.value} value={option.value} className="bg-gray-800">
                {option.label}
              </option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            rows={4}
            placeholder={`Enter ${label.toLowerCase()}...`}
            className={`w-full bg-white/10 border rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none ${
              formErrors[field] ? 'border-red-500' : 'border-white/20 hover:border-white/30'
            }`}
          />
        ) : type === 'checkbox' ? (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!formData[field]}
              onChange={(e) => handleInputChange(field, e.target.checked)}
              className="rounded bg-white/10 border-white/20 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-gray-300">{label}</span>
          </label>
        ) : (
          <div className="relative">
            {['purchasePrice', 'listPrice', 'killPrice', 'wholesalePrice', 'brokerageFee', 'payoffBalance', 'amountDueToCustomer', 'amountDueToRP'].includes(field) && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">$</div>
            )}
            <input
              type={type}
              value={formData[field] || ''}
              onChange={(e) => {
                handleInputChange(field, e.target.value);
              }}
              placeholder={`Enter ${label.toLowerCase()}...`}
              className={`w-full bg-white/10 border rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                formErrors[field] ? 'border-red-500' : 'border-white/20 hover:border-white/30'
              } ${field === 'vin' ? 'pr-20' : ''} ${['purchasePrice', 'listPrice', 'killPrice', 'wholesalePrice', 'brokerageFee', 'payoffBalance', 'amountDueToCustomer', 'amountDueToRP'].includes(field) ? 'pl-8' : ''}`}
            />
            
            {field === 'vin' && formData.vin.length === 17 && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                {vinDecoding ? (
                  <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                ) : vinDecoded ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <button
                    onClick={() => decodeVIN(formData.vin)}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded transition-colors"
                  >
                    Decode
                  </button>
                )}
              </div>
            )}
            
            {/* Dealer Buyer Autocomplete */}
            {isDealerBuyer && field === 'dealerName' && dealerBuyerSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-xl z-10 max-h-40 overflow-y-auto">
                {dealerBuyerSuggestions.map(dealer => (
                  <div
                    key={dealer.id}
                    className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        dealerName: dealer.name,
                        dealerCompany: dealer.company,
                        dealerPhone: dealer.phone,
                        dealerEmail: dealer.contact?.email || dealer.email || '',
                        dealerAddress: dealer.location || dealer.address || ''
                      }));
                      setDealerBuyerSuggestions([]);
                    }}
                  >
                    <div className="font-medium text-white">{dealer.name}</div>
                    <div className="text-sm text-gray-400">{dealer.company} • {dealer.location}</div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Buyer Name Autocomplete for buy/sell deals */}
            {field === 'buyerName' && formData.buyerType === 'dealer' && dealerBuyerSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-xl z-10 max-h-40 overflow-y-auto">
                {dealerBuyerSuggestions.map(dealer => (
                  <div
                    key={dealer.id}
                    className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0"
                    onClick={() => {
                      handleBuyerDealerSuggestionSelect(dealer);
                    }}
                  >
                    <div className="font-medium text-white">{dealer.name}</div>
                    <div className="text-sm text-gray-400">{dealer.company} • {dealer.location}</div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Seller Autocomplete (only for non-retail deals and when seller type is dealer for buy/sell) */}
            {field === 'sellerName' && dealerSuggestions.length > 0 && (
              (formData.dealType === 'wholesale-flip' && formData.dealType2SubType === 'buy-sell' && formData.sellerType === 'dealer') ||
              (!['retail-pp','retail-auction','retail-dtod'].includes(formData.dealType) && 
               !(formData.dealType === 'wholesale-flip' && formData.dealType2SubType === 'buy-sell'))
            ) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-xl z-10 max-h-40 overflow-y-auto">
                {dealerSuggestions.map(dealer => (
                  <div
                    key={dealer.id}
                    className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0"
                    onClick={() => {
                      handleDealerSuggestionSelect(dealer);
                    }}
                  >
                    <div className="font-medium text-white">{dealer.name}</div>
                    <div className="text-sm text-gray-400">{dealer.company} • {dealer.location}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {formErrors[field] && (
          <div className="flex items-center text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            {formErrors[field]}
          </div>
        )}
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Deal Type Selection */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white mb-4">Deal Type Selection</h3>
              {renderFormField('Deal Type', 'dealType', 'select', dealTypes, true, Car)}
              <div className="mt-4">
                {renderFormField('Deal Type 2', 'dealType2SubType', 'select', dealType2SubOptions, true)}
              </div>
            </div>
            {/* Vehicle Information */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white mb-4">Vehicle Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  {renderFormField('VIN', 'vin', 'text', null, true, Hash)}
                </div>
                {renderFormField('Year', 'year', 'number', null, true, Calendar)}
                {renderFormField('Make', 'make', 'text', null, true)}
                {renderFormField('Model', 'model', 'text', null, true)}
                {renderFormField('Mileage', 'mileage', 'number', null, false, Gauge)}
                {renderFormField('Exterior Color', 'exteriorColor', 'text', null, false, Palette)}
                {renderFormField('Interior Color', 'interiorColor', 'text', null, false, Palette)}
                {/* Stock Number field removed for all deal types */}
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            {/* Deal Configuration */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white mb-4">Deal Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderFormField('Funding Source', 'fundingSource', 'select', fundingSources, true, DollarSign)}
                {renderFormField('Purchase/Sale Date', 'purchaseDate', 'date', null, true, Calendar)}
                {renderFormField('Payment Method', 'paymentMethod', 'select', paymentMethods, true)}
                {renderFormField('RP Stock Number', 'rpStockNumber', 'text', null, false, Hash)}
                {renderFormField('Salesperson', 'salesperson', 'select', salespersonOptions, true, User)}
              </div>
            </div>
          </div>
        );
      case 3:
        return dealTypeFields.showFinancials ? (
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-medium text-white mb-4">Financial Information</h3>
            {formData.dealType2SubType === 'sale' ? (
              <div className="space-y-6">
                {renderFormField(dynamicLabels.purchasePriceLabel, 'purchasePrice', 'number', null, true, DollarSign)}
                {renderFormField('Brokerage Fee', 'brokerageFee', 'number')}
                {renderFormField('Brokerage Fee Paid To', 'brokerageFeePaidTo', 'text')}
                {renderFormField('Amount Due to Customer', 'amountDueToCustomer', 'number')}
                {renderFormField('Amount Due to RP', 'amountDueToRP', 'number')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-6">
                  {renderFormField(dynamicLabels.purchasePriceLabel, 'purchasePrice', 'number', null, true, DollarSign)}
                  {renderFormField('Kill Price', 'killPrice', 'number')}
                  {renderFormField('Wholesale Price', 'wholesalePrice', 'number')}
                  {renderFormField('List Price', 'listPrice', 'number')}
                  {/* Only show Commission Rate for consign deals, otherwise keep layout clean */}
                  {['consign-a','consign-b','consign-c','consign-rdnc'].includes(formData.dealType2SubType)
                    ? renderFormField('Commission Rate (%)', 'commissionRate', 'number')
                    : null}
                </div>
                {/* Right column */}
                <div className="space-y-6">
                  {renderFormField('Brokerage Fee', 'brokerageFee', 'number')}
                  {renderFormField('Brokerage Fee Paid To', 'brokerageFeePaidTo', 'text')}
                  {renderFormField('Payoff Balance', 'payoffBalance', 'number')}
                  {renderFormField('Amount Due to Customer', 'amountDueToCustomer', 'number')}
                  {renderFormField('Amount Due to RP', 'amountDueToRP', 'number')}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Financial Information Not Required</h3>
            <p className="text-gray-400">This deal type does not require financial information.</p>
          </div>
        );
      
      case 4:
        // Seller/Dealer Info step
        if (formData.dealType === 'wholesale-flip') {
          return (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-10">
              {/* Buyer Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">Buyer Information</h3>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange('buyerType', 'private')}
                      className={`px-3 py-1 rounded-lg border transition-colors text-sm ${
                        formData.buyerType === 'private'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                      }`}
                    >
                      Private Party
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('buyerType', 'dealer')}
                      className={`px-3 py-1 rounded-lg border transition-colors text-sm ${
                        formData.buyerType === 'dealer'
                          ? 'bg-green-600 border-green-500 text-white'
                          : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                      }`}
                    >
                      Dealer
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderFormField(formData.buyerType === 'dealer' ? 'Dealer Name' : 'Buyer Name', 'buyerName', 'text', null, true, User)}
                  {renderFormField('Phone', 'buyerPhone', 'tel', null, false, Phone)}
                  {renderFormField('Email', 'buyerEmail', 'email', null, false, Mail)}
                  {renderFormField('Address', 'buyerAddress', 'text', null, false, MapPin)}
                  {formData.buyerType === 'dealer' && renderFormField('Dealer License Number', 'buyerLicenseNumber', 'text')}
                  {formData.buyerType === 'dealer' && !(formData.dealType === 'wholesale-d2d' && formData.dealType2SubType === 'buy') && renderFormField('Dealer Tier', 'buyerTier', 'select', [
                    { value: 'Tier 1', label: 'Tier 1: Pay Upon Title' },
                    { value: 'Tier 2', label: 'Tier 2: Pay Prior to Release' }
                  ])}
                </div>
              </div>
              
              {/* Seller Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">Seller Information</h3>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange('sellerType', 'private')}
                      className={`px-3 py-1 rounded-lg border transition-colors text-sm ${
                        formData.sellerType === 'private'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                      }`}
                    >
                      Private Party
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('sellerType', 'dealer')}
                      className={`px-3 py-1 rounded-lg border transition-colors text-sm ${
                        formData.sellerType === 'dealer'
                          ? 'bg-green-600 border-green-500 text-white'
                          : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                      }`}
                    >
                      Dealer
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderFormField(formData.sellerType === 'dealer' ? 'Dealer Name' : 'Seller Name', 'sellerName', 'text', null, true, User)}
                  {renderFormField('Phone', 'sellerPhone', 'tel', null, false, Phone)}
                  {renderFormField('Email', 'sellerEmail', 'email', null, false, Mail)}
                  {renderFormField('Address', 'sellerAddress', 'text', null, false, MapPin)}
                  {formData.sellerType === 'dealer' && renderFormField('Dealer License Number', 'sellerLicenseNumber', 'text')}
                  {formData.sellerType === 'dealer' && !(formData.dealType === 'wholesale-flip' && formData.dealType2SubType === 'buy-sell') && !(formData.dealType === 'wholesale-d2d' && formData.dealType2SubType === 'buy') && renderFormField('Dealer Tier', 'sellerTier', 'select', [
                    { value: 'Tier 1', label: 'Tier 1: Pay Upon Title' },
                    { value: 'Tier 2', label: 'Tier 2: Pay Prior to Release' }
                  ])}
                </div>
              </div>
            </div>
          );
        } else {
          const isRetailPP = formData.dealType === 'retail-pp';
          return (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white mb-4">{dynamicLabels.sellerSectionTitle}</h3>
              {isRetailPP ? (
                // Retail PP - 2x2 grid layout
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    {renderFormField(dynamicLabels.sellerLabel, 'sellerName', 'text', null, true, User)}
                  </div>
                  {renderFormField('Phone', 'sellerPhone', 'tel', null, false, Phone)}
                  {renderFormField('Email', 'sellerEmail', 'email', null, false, Mail)}
                  {renderFormField('Address', 'sellerAddress', 'text', null, false, MapPin)}
                </div>
              ) : (
                // Other deal types - original layout
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    {renderFormField(dynamicLabels.sellerLabel, 'sellerName', 'text', null, true, User)}
                  </div>
                  {!isRetailPP && renderFormField(dynamicLabels.companyLabel, 'sellerCompany', 'text')}
                  {renderFormField('Phone', 'sellerPhone', 'tel', null, false, Phone)}
                  {renderFormField('Email', 'sellerEmail', 'email', null, false, Mail)}
                  {renderFormField(dynamicLabels.addressLabel, 'sellerAddress', 'text', null, false, MapPin)}
                  
                  {/* Show license number and tier for wholesale d2d deals */}
                  {formData.dealType === 'wholesale-d2d' && (
                    <>
                      <div>
                        <label htmlFor="seller-license-number" className="block text-sm font-medium text-gray-300 mb-1">Dealer License Number</label>
                        <input
                          type="text"
                          id="seller-license-number"
                          value={formData.sellerLicenseNumber || ''}
                          onChange={e => handleInputChange('sellerLicenseNumber', e.target.value)}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      {/* Tier Selection */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-white mb-2">
                          Dealer Tier
                        </label>
                        <div className="flex space-x-4">
                          <button
                            type="button"
                            onClick={() => handleInputChange('sellerTier', 'Tier 1')}
                            className={`px-4 py-2 rounded-lg border transition-colors ${
                              formData.sellerTier === 'Tier 1'
                                ? 'bg-red-600 border-red-500 text-white'
                                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                            }`}
                          >
                            Tier 1 - Pay Upon Title
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange('sellerTier', 'Tier 2')}
                            className={`px-4 py-2 rounded-lg border transition-colors ${
                              formData.sellerTier === 'Tier 2'
                                ? 'bg-green-600 border-green-500 text-white'
                                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                            }`}
                          >
                            Tier 2 - Pay Prior to Release
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Tier 1: Pay Upon Title. Tier 2: Pay Prior to Release.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Buyer Section for Wholesale D2D Deals */}
              {formData.dealType === 'wholesale-d2d' && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 mt-6">
                  <h3 className="text-lg font-medium text-white mb-4">
                    {formData.dealType2SubType === 'buy' ? 'Purchasing Dealer Information' : 'Buyer Information'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      {renderFormField(
                        formData.dealType2SubType === 'buy' ? 'Purchasing Dealer Name' : 'Buyer Name', 
                        'buyerName', 
                        'text', 
                        null, 
                        true, 
                        User
                      )}
                    </div>
                    {renderFormField('Phone', 'buyerPhone', 'tel', null, false, Phone)}
                    {renderFormField('Email', 'buyerEmail', 'email', null, false, Mail)}
                    {renderFormField('Address', 'buyerAddress', 'text', null, false, MapPin)}
                    
                    {/* Dealer License Number for Buyer */}
                    <div>
                      <label htmlFor="buyer-license-number" className="block text-sm font-medium text-gray-300 mb-1">Dealer License Number</label>
                      <input
                        type="text"
                        id="buyer-license-number"
                        value={formData.buyerLicenseNumber || ''}
                        onChange={e => handleInputChange('buyerLicenseNumber', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    {/* Buyer Tier Selection */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        Dealer Tier
                      </label>
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={() => handleInputChange('buyerTier', 'Tier 1')}
                          className={`px-4 py-2 rounded-lg border transition-colors ${
                            formData.buyerTier === 'Tier 1'
                              ? 'bg-red-600 border-red-500 text-white'
                              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                          }`}
                        >
                          Tier 1 - Pay Upon Title
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('buyerTier', 'Tier 2')}
                          className={`px-4 py-2 rounded-lg border transition-colors ${
                            formData.buyerTier === 'Tier 2'
                              ? 'bg-green-600 border-green-500 text-white'
                              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                          }`}
                        >
                          Tier 2 - Pay Prior to Release
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Tier 1: Pay Upon Title. Tier 2: Pay Prior to Release.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }
      
      case 5:
        return dealTypeFields.showDocumentation ? (
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-medium text-white mb-4">Documentation & Notes</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-white mb-4">Documentation Status</h4>
                  {renderFormField('Contract Required', 'contractRequired', 'checkbox')}
                  {renderFormField('Title Present', 'titlePresent', 'checkbox')}
                  {renderFormField('Driver License Present', 'driverLicensePresent', 'checkbox')}
                  {renderFormField('Odometer Present', 'odometerPresent', 'checkbox')}
                  {renderFormField('Dealer License Present', 'dealerLicensePresent', 'checkbox')}
                </div>
                <div className="space-y-4">
                  {renderFormField('Vehicle Description', 'vehicleDescription', 'textarea', null, false, Info)}
                  {/* File upload area */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Upload Documents/Photos</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleDocumentUpload}
                      className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    {/* Preview uploaded files */}
                    {formData.documents && formData.documents.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {formData.documents.map((file, i) => (
                          <div key={i} className="flex items-center space-x-3 bg-white/10 rounded p-2">
                            {file.type && file.type.startsWith('image') ? (
                              <img src={URL.createObjectURL(file)} alt={file.name} className="h-12 w-12 object-cover rounded" />
                            ) : (
                              <span className="inline-block w-12 h-12 bg-gray-700 text-white flex items-center justify-center rounded">PDF</span>
                            )}
                            <span className="text-white text-sm truncate max-w-xs">{file.name}</span>
                            <input
                              type="text"
                              value={documentNotes.find(sel => sel.fileIndex === i)?.note || ''}
                              onChange={e => handleDocumentNoteChange(i, e.target.value)}
                              placeholder="Add a note (optional)"
                              className="bg-white/10 border rounded-lg px-2 py-1 text-white text-sm"
                            />
                            <button
                              type="button"
                              className="ml-auto text-red-400 hover:text-red-600 text-xs font-medium"
                              onClick={() => handleRemoveDocument(i)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                {renderFormField('General Notes', 'generalNotes', 'textarea', null, false, Info)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Documentation Not Required</h3>
            <p className="text-gray-400">This deal type does not require documentation tracking.</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Calculate total steps based on deal type
  const getTotalSteps = () => {
    let steps = 2; // Always have vehicle info and deal config
    if (dealTypeFields.showFinancials) steps++;
    if (dealTypeFields.showSellerInfo) steps++;
    if (dealTypeFields.showDocumentation) steps++;
    return steps;
  };

  const totalSteps = getTotalSteps();

  // Add a constant for the unified status options
  const STATUS_OPTIONS = [
    { value: 'contract-received', label: 'Contract Received' },
    { value: 'title-processing', label: 'Title Processing' },
    { value: 'payment-approved', label: 'Payment Approved' },
    { value: 'funds-disbursed', label: 'Funds Disbursed' },
    { value: 'title-received', label: 'Title Received' },
    { value: 'deal-complete', label: 'Deal Complete' }
  ];

  const statusCompatMap = {
    'initial-contact': 'contract-received',
    'documentation': 'title-processing',
    'finance': 'payment-approved',
    'completion': 'deal-complete'
  };

  // At the top, define the valid backend status values:
  const VALID_STATUSES = [
    'contract-received',
    'title-processing',
    'payment-approved',
    'funds-disbursed',
    'title-received',
    'deal-complete'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={() => window.history.back()}
                className="mr-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-3 mr-4 shadow-lg shadow-blue-500/25">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">New Deal Entry</h1>
                  <p className="text-gray-300 text-sm">Create a new vehicle deal</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Draft
              </button>
              
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg shadow-lg transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Create Deal
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-6xl mx-auto px-6 py-8">
        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form Content */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {currentStep === 1 && 'Vehicle Information & Deal Type'}
              {currentStep === 2 && 'Deal Configuration'}
              {currentStep === 3 && dealTypeFields.showFinancials && 'Financial Information'}
              {currentStep === 3 && !dealTypeFields.showFinancials && dealTypeFields.showSellerInfo && 'Seller Information'}
              {currentStep === 3 && !dealTypeFields.showFinancials && !dealTypeFields.showSellerInfo && dealTypeFields.showDocumentation && 'Documentation & Notes'}
              {currentStep === 4 && dealTypeFields.showFinancials && dealTypeFields.showSellerInfo && 'Seller Information'}
              {currentStep === 4 && dealTypeFields.showFinancials && !dealTypeFields.showSellerInfo && dealTypeFields.showDocumentation && 'Documentation & Notes'}
              {currentStep === 5 && 'Documentation & Notes'}
            </h2>
            <p className="text-gray-300">
              {currentStep === 1 && 'Enter basic vehicle information and select the deal type'}
              {currentStep === 2 && 'Configure deal type, funding, and timeline'}
              {currentStep === 3 && dealTypeFields.showFinancials && 'Set pricing and financial terms'}
              {currentStep === 3 && !dealTypeFields.showFinancials && dealTypeFields.showSellerInfo && 'Add seller contact information'}
              {currentStep === 3 && !dealTypeFields.showFinancials && !dealTypeFields.showSellerInfo && dealTypeFields.showDocumentation && 'Document status and additional notes'}
              {currentStep === 4 && dealTypeFields.showFinancials && dealTypeFields.showSellerInfo && 'Add seller contact information'}
              {currentStep === 4 && dealTypeFields.showFinancials && !dealTypeFields.showSellerInfo && dealTypeFields.showDocumentation && 'Document status and additional notes'}
              {currentStep === 5 && 'Document status and additional notes'}
            </p>
          </div>

          {renderStep()}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="flex items-center px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </button>

            <div className="flex items-center space-x-3">
              {currentStep === totalSteps && formData.vehicleDescription && (
                <button
                  onClick={handleEmailToListingTeam}
                  className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Email to Listing Team
                </button>
              )}
              
              {currentStep < totalSteps ? (
                <button
                  onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                  className="flex items-center px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-colors"
                >
                  Next
                  <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                </button>
              ) : (
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex items-center px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Submit Deal
                </button>
              )}
            </div>
          </div>
        </div>

        {/* VIN Decode Status */}
        {vinDecoding && (
          <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Decoding VIN...
          </div>
        )}
        
        {vinDecoded && (
          <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            VIN decoded successfully!
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
};

export default NewDealEntry; 