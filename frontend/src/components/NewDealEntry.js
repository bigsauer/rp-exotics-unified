// NOTE: All backend API calls should use process.env.REACT_APP_API_URL (set in .env) for the base URL.
import React, { useState, useEffect } from 'react';
import { 
  Car, ArrowLeft, Save, Send, CheckCircle, Loader2, 
  Calendar, DollarSign, User, 
  MapPin, Phone, Mail, Hash, Palette, Gauge, 
  Info, Plus, AlertCircle, Shield, FileText, X
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LienPayoffDatePicker from './LienPayoffDatePicker';

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
    

    documents: [], // For uploaded files
    salesperson: '',
    
    // Lien Information (for wholesale flip with private seller)
    lienStatus: 'none',
    lienEta: ''
  });

  const [vinDecoding, setVinDecoding] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);
  const [dealerSuggestions, setDealerSuggestions] = useState([]);
  const [dealerBuyerSuggestions, setDealerBuyerSuggestions] = useState([]); // For Dealer Info (Buyer)
  const [dealerSearch, setDealerSearch] = useState('');
  const [brokerSuggestions, setBrokerSuggestions] = useState([]);
  const [brokerSearch, setBrokerSearch] = useState('');
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

  // Helper function to identify wholesale buy deals
  const isWholesaleBuyDeal = () => {
    return (
      (formData.dealType === 'wholesale-d2d' && formData.dealType2SubType === 'buy') ||
      (formData.dealType === 'wholesale-pp') ||
      (formData.dealType === 'wholesale-flip' && formData.dealType2SubType === 'buy')
    );
  };

  // Get dynamic labels based on deal type
  const getDynamicLabels = () => {
    const dealType2 = formData.dealType2SubType;
    const isRetailPP = formData.dealType === 'retail-pp';
    const isRetailD2D = formData.dealType === 'retail-d2d';
    const isWholesaleD2DSale = formData.dealType === 'wholesale-d2d' && dealType2 === 'sale';
    const isWholesaleD2DBuy = formData.dealType === 'wholesale-d2d' && dealType2 === 'buy';
    
    return {
      purchasePriceLabel: dealType2 === 'sale' ? 'Sale Price' : 'Purchase Price',
      sellerLabel: dealType2 === 'sale' ? 'Sold To' : 'Purchased From',
      sellerSectionTitle: isWholesaleD2DSale ? 'Seller Information' : (dealType2 === 'sale' ? 'Buyer Information' : 'Seller Information'),
      // For retail PP and retail D2D deals, use more generic labels
      companyLabel: (isRetailPP || isRetailD2D) ? 'Company (if applicable)' : 'Company/Dealer',
      licenseLabel: (isRetailPP || isRetailD2D) ? 'License Number (if applicable)' : 'Dealer License Number',
      addressLabel: (isRetailPP || isRetailD2D) ? 'Address' : 'Seller Address',
      // Specific labels for wholesale D2D buy deals
      payoffBalanceLabel: 'Payoff Balance',
      amountDueToCustomerLabel: 'Amount Due to Customer',
      amountDueToRPExoticsLabel: 'Amount Due to RP Exotics'
    };
  };

  const dynamicLabels = getDynamicLabels();

  // Remove Deal Type 2 from main dealTypes
  const dealTypes = [
    { value: 'wholesale-d2d', label: 'Wholesale - D2D' },
    { value: 'wholesale-flip', label: 'Wholesale - Flip' },
    { value: 'retail-pp', label: 'Retail - PP' },
    { value: 'retail-d2d', label: 'Retail - D2D' },
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
        'wholesale-d2d', 'wholesale-flip',
        'retail-pp', 'retail-d2d', 'auction'
      ].includes(dealType),
      showSellerInfo: true,
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

  // Broker search for brokerage fee paid to
  const searchBrokers = async (query) => {
    if (query.length < 2) {
      setBrokerSuggestions([]);
      return;
    }
    try {
      const url = `${API_BASE}/api/brokers?search=${encodeURIComponent(query)}`;
      console.log('[DEBUG][NewDealEntry] Broker search fetch from:', url);
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setBrokerSuggestions(data.data || []);
      }
    } catch (error) {
      console.error('Broker search error:', error);
      setBrokerSuggestions([]);
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

  // Autofill broker info when a suggestion is selected
  const handleBrokerSuggestionClick = (broker) => {
    setFormData(prev => ({
      ...prev,
      brokerageFeePaidTo: broker.name || ''
    }));
    setBrokerSuggestions([]);
    setBrokerSearch('');
    console.log('[BROKER AUTOFILL] Selected broker:', broker);
  };

  // Create new broker if one doesn't exist
  const createNewBroker = async (brokerName) => {
    try {
      const response = await fetch(`${API_BASE}/api/brokers`, {
        method: 'POST',
        credentials: 'include',
        headers: buildHeaders(),
        body: JSON.stringify({
          name: brokerName,
          email: 'temp@example.com', // Placeholder email
          phone: '', // Empty phone
          company: '', // Empty company
          status: 'Active'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('[BROKER CREATE] ✅ New broker created:', data.data);
          toast.success(`New broker "${brokerName}" created successfully`);
          return data.data;
        }
      }
    } catch (error) {
      console.error('[BROKER CREATE] ❌ Error creating broker:', error);
      toast.error('Failed to create new broker');
    }
    return null;
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
    
    // Convert VIN to uppercase
    if (field === 'vin') {
      processedValue = value.toUpperCase();
    }
    
    // Handle currency formatting for financial fields
    if (['purchasePrice', 'listPrice', 'killPrice', 'wholesalePrice', 'brokerageFee', 'payoffBalance', 'amountDueToCustomer', 'amountDueToRP'].includes(field)) {
      processedValue = formatCurrency(value);
    }
    
    // If changing dealType, reset dealType2SubType unless still deal-type-2
    if (field === 'dealType') {
      console.log('[DEAL TYPE CHANGE] 🔍 Field:', field, 'Value:', processedValue);
      
      setFormData(prev => {
        console.log('[DEAL TYPE CHANGE] 🔍 Previous formData:', prev);
        
        const newDealType2SubType = processedValue === 'deal-type-2' ? prev.dealType2SubType : 
                                    processedValue === 'wholesale-flip' ? 'buy-sell' : 
                                    processedValue === 'wholesale-d2d' ? '' : '';
        
        console.log('[DEAL TYPE CHANGE] 🔍 New dealType2SubType:', newDealType2SubType);
        
        const newFormData = {
          ...prev,
          dealType: processedValue,
          dealType2SubType: newDealType2SubType,
          // Set default buyer/seller types for wholesale flip deals
          buyerType: processedValue === 'wholesale-flip' ? 'dealer' : prev.buyerType,
          sellerType: processedValue === 'wholesale-flip' ? 'private' : prev.sellerType
        };
        
        console.log('[DEAL TYPE CHANGE] 🔍 Updated formData:', newFormData);
        return newFormData;
      });
      
      if (currentStep > 1) setCurrentStep(1);
      return;
    }
    
    setFormData(prev => {
      // Add debugging for dealType2SubType changes
      if (field === 'dealType2SubType') {
        console.log('[DEAL TYPE 2 CHANGE] 🔍 Field:', field, 'Value:', processedValue);
        console.log('[DEAL TYPE 2 CHANGE] 🔍 Previous formData:', prev);
      }
      
      const newFormData = { ...prev, [field]: processedValue };
      
      if (field === 'dealType2SubType') {
        console.log('[DEAL TYPE 2 CHANGE] 🔍 Updated formData:', newFormData);
      }
      
      return newFormData;
    });
    
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

    // Search brokers when typing in brokerage fee paid to field
    if (field === 'brokerageFeePaidTo') {
      searchBrokers(processedValue);
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
    console.log('[DOCUMENT UPLOAD] Files selected:', files.length, 'files');
    files.forEach((file, index) => {
      console.log(`[DOCUMENT UPLOAD] File ${index + 1}:`, file.name, 'Size:', file.size, 'Type:', file.type);
    });
    
    setFormData(prev => {
      const newDocuments = [...(prev.documents || []), ...files];
      console.log('[DOCUMENT UPLOAD] Total documents after upload:', newDocuments.length);
      return {
        ...prev,
        documents: newDocuments
      };
    });
    
    setDocumentNotes(prev => {
      const newNotes = [
        ...prev,
        ...files.map((_, i) => ({ fileIndex: (prev.length + i), note: '' }))
      ];
      console.log('[DOCUMENT UPLOAD] Total document notes after upload:', newNotes.length);
      return newNotes;
    });
    
    // Clear the file input value to allow re-selection of the same files
    e.target.value = '';
  };
  const handleRemoveDocument = (index) => {
    console.log('[DOCUMENT REMOVE] Removing document at index:', index);
    setFormData(prev => {
      const newDocuments = prev.documents.filter((_, i) => i !== index);
      console.log('[DOCUMENT REMOVE] Documents after removal:', newDocuments.length);
      return {
        ...prev,
        documents: newDocuments
      };
    });
    setDocumentNotes(prev => {
      const newNotes = prev.filter(sel => sel.fileIndex !== index).map(sel => ({ ...sel, fileIndex: sel.fileIndex > index ? sel.fileIndex - 1 : sel.fileIndex }));
      console.log('[DOCUMENT REMOVE] Notes after removal:', newNotes.length);
      return newNotes;
    });
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

  const validateForm = (dataToValidate = formData) => {
    console.log('[VALIDATION] Starting form validation...');
    console.log('[VALIDATION] Data to validate:', dataToValidate);
    
    const errors = {};
    let requiredFields = dealTypeFields.requiredFields || ['vin', 'dealType', 'dealType2SubType', 'year', 'make', 'model', 'sellerName'];
    
    console.log('[VALIDATION] Required fields:', requiredFields);
    
    // Add buyer fields for wholesale flip deals
    if (dataToValidate.dealType === 'wholesale-flip') {
      requiredFields = [...requiredFields, 'buyerName'];
      console.log('[VALIDATION] Added buyerName for wholesale flip deal');
    }
    

    
    console.log('[VALIDATION] Final required fields:', requiredFields);
    
    requiredFields.forEach(field => {
      const value = dataToValidate[field];
      console.log(`[VALIDATION] Checking field '${field}':`, value);
      
      if (!value || value.toString().trim() === '') {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        console.log(`[VALIDATION] ❌ Field '${field}' is missing or empty`);
      } else {
        console.log(`[VALIDATION] ✅ Field '${field}' is valid:`, value);
      }
    });

    // Additional validation for specific fields
    // REMOVE strict VIN length check
    // if (dataToValidate.vin && dataToValidate.vin.length !== 17) {
    //   errors.vin = 'VIN must be exactly 17 characters';
    // }

    if (dataToValidate.year && (dataToValidate.year < 1900 || dataToValidate.year > new Date().getFullYear() + 1)) {
      errors.year = 'Please enter a valid year';
      console.log('[VALIDATION] ❌ Invalid year:', dataToValidate.year);
    }

    if (dataToValidate.mileage && dataToValidate.mileage < 0) {
      errors.mileage = 'Mileage cannot be negative';
      console.log('[VALIDATION] ❌ Negative mileage:', dataToValidate.mileage);
    }

    if (dealTypeFields.showFinancials && dataToValidate.purchasePrice && dataToValidate.purchasePrice <= 0) {
      errors.purchasePrice = 'Purchase price must be greater than 0';
      console.log('[VALIDATION] ❌ Invalid purchase price:', dataToValidate.purchasePrice);
    }

    // Validate wholesale d2d deals have dealType2SubType selected
    if (dataToValidate.dealType === 'wholesale-d2d' && (!dataToValidate.dealType2SubType || dataToValidate.dealType2SubType.trim() === '')) {
      errors.dealType2SubType = 'Please select "Buy" or "Sale" for wholesale dealer-to-dealer deals.';
      console.log('[VALIDATION] ❌ Wholesale d2d deal missing dealType2SubType');
    }
    
    // Validate wholesale d2d sale deals have correct dealType2SubType
    if (dataToValidate.dealType === 'wholesale-d2d' && dataToValidate.dealType2SubType === 'buy') {
      // Check if this looks like it should be a sale deal (has buyer information)
      if (dataToValidate.buyerName && dataToValidate.buyerName.trim() !== '') {
        errors.dealType2SubType = 'This appears to be a sale deal (has buyer info). Please select "Sale" as Deal Type 2.';
        console.log('[VALIDATION] ❌ Wholesale d2d deal has buyer info but dealType2SubType is "buy"');
      }
    }
    
    // Additional validation for wholesale d2d sale deals
    if (dataToValidate.dealType === 'wholesale-d2d' && dataToValidate.dealType2SubType === 'sale') {
      // For sale deals, ensure buyer information is provided
      if (!dataToValidate.buyerName || dataToValidate.buyerName.trim() === '') {
        errors.buyerName = 'Buyer information is required for wholesale dealer-to-dealer sale deals.';
        console.log('[VALIDATION] ❌ Wholesale d2d sale deal missing buyer info');
      }
    }

    console.log('[VALIDATION] Final validation errors:', errors);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- Optimistic Rendering for Deal Submission ---
  // Assume setDeals is available via props or context. If not, add a callback prop or context usage as needed.
  // Add a new prop: setDeals (function to update deals list)

  const handleSave = async (isDraft = false) => {
    return handleSaveWithData(formData, isDraft);
  };

  const handleSaveWithData = async (dataToUse, isDraft = false) => {
    console.log('[HANDLE SAVE] Starting deal submission...');
    console.log('[HANDLE SAVE] isDraft:', isDraft);
    console.log('[HANDLE SAVE] currentUser:', currentUser);
    console.log('[HANDLE SAVE] Using data:', dataToUse);
    console.log('[HANDLE SAVE] 🔍 dealType:', dataToUse.dealType);
    console.log('[HANDLE SAVE] 🔍 dealType2SubType:', dataToUse.dealType2SubType);
    console.log('[HANDLE SAVE] 🔍 dealType2:', dataToUse.dealType2);
    
    if (!currentUser) {
      console.log('[HANDLE SAVE] No user logged in');
      alert('You must be logged in to submit a deal.');
      navigate('/login');
      return;
    }
    
    if (!isDraft && !validateForm(dataToUse)) {
      console.log('[HANDLE SAVE] Validation failed');
      console.log('[HANDLE SAVE] Validation errors:', formErrors);
      alert('Please fill in all required fields: ' + Object.keys(formErrors).join(', '));
      return;
    }
    
    console.log('[HANDLE SAVE] Setting saving state to true');
    setSaving(true);

    try {
      console.log('[HANDLE SAVE] Building deal data...');
      // Debug: log dataToUse before building dealData
      console.log('[DEAL SUBMIT] dataToUse:', dataToUse);
      console.log('[DEBUG] handleSave - sellerType in dataToUse:', dataToUse.sellerType);
      console.log('[DEBUG] handleSave - dealType2SubType in dataToUse:', dataToUse.dealType2SubType);
      // Log all financial fields from dataToUse
      console.log('[DEAL SUBMIT] Financial fields:', {
        brokerageFee: dataToUse.brokerageFee,
        brokerageFeePaidTo: dataToUse.brokerageFeePaidTo,
        payoffBalance: dataToUse.payoffBalance,
        amountDueToCustomer: dataToUse.amountDueToCustomer,
        amountDueToRP: dataToUse.amountDueToRP,
        commissionRate: dataToUse.commissionRate
      });
      const currentStage = 'contract-received';
      // First, create the deal in the backend
      const dealData = {
        vehicle: `${dataToUse.year} ${dataToUse.make} ${dataToUse.model}`,
        vin: dataToUse.vin,
        year: parseInt(dataToUse.year),
        make: dataToUse.make,
        model: dataToUse.model,
        rpStockNumber: dataToUse.rpStockNumber,
        color: dataToUse.exteriorColor,
        exteriorColor: dataToUse.exteriorColor, // Add this field
        interiorColor: dataToUse.interiorColor, // Add this field
        mileage: parseInt(dataToUse.mileage) || 0,
        purchasePrice: parseFloat(dataToUse.purchasePrice) || 0,
        listPrice: parseFloat(dataToUse.listPrice) || 0,
        killPrice: parseFloat(dataToUse.killPrice) || 0,
        wholesalePrice: parseFloat(dataToUse.wholesalePrice) || 0,
        dealType: dataToUse.dealType,
        dealType2SubType: dataToUse.dealType2SubType, // <-- Ensure this is sent
        dealType2: (() => {
          // Convert dealType2SubType to proper dealType2 format
          const mapping = {
            'buy': 'Buy',
            'sale': 'Sale',
            'buy-sell': 'Buy/Sell',
            'consign-a': 'Consign-A',
            'consign-b': 'Consign-B',
            'consign-c': 'Consign-C',
            'consign-rdnc': 'Consign-RDNC'
          };
          
          console.log('[DEAL TYPE 2 MAPPING] 🔍 Input dealType2SubType:', dataToUse.dealType2SubType);
          console.log('[DEAL TYPE 2 MAPPING] 🔍 Mapping table:', mapping);
          const result = mapping[dataToUse.dealType2SubType] || 'Buy';
          console.log('[DEAL TYPE 2 MAPPING] 🔍 Mapped result:', result);
          
          return result;
        })(),
        seller: {
          name: dataToUse.sellerName,
          type: dataToUse.sellerType || (dataToUse.dealType === 'wholesale-flip' ? 'private' : dataToUse.dealType.includes('private') ? 'private' : 'dealer'),
          email: dataToUse.sellerEmail, // Add at top level for backend validation
          phone: dataToUse.sellerPhone, // Add at top level for backend validation
          contact: {
            address: parseAddress(dataToUse.sellerAddress), // Use parsed address
            phone: dataToUse.sellerPhone,
            email: dataToUse.sellerEmail
          },
          licenseNumber: dataToUse.sellerLicenseNumber,
          tier: dataToUse.sellerTier
        },
        // Always include buyer info if present
        buyer: {
          name: dataToUse.buyerName,
          type: dataToUse.buyerType,
          contact: {
            address: parseAddress(dataToUse.buyerAddress),
            phone: dataToUse.buyerPhone,
            email: dataToUse.buyerEmail
          },
          licenseNumber: dataToUse.buyerLicenseNumber,
          tier: dataToUse.buyerTier
        },
        fundingSource: dataToUse.fundingSource,
        paymentMethod: dataToUse.paymentMethod,
        purchaseDate: dataToUse.purchaseDate ? new Date(dataToUse.purchaseDate) : new Date(),
        currentStage: currentStage || 'contract-received',
        salesperson: currentUser.name || 'Unknown', // Use current user's name as salesperson
        // --- Add all financial fields below ---
        brokerFee: parseFloat(dataToUse.brokerageFee) || 0,
        brokerFeePaidTo: dataToUse.brokerageFeePaidTo || '',
        payoffBalance: parseFloat(dataToUse.payoffBalance) || 0,
        amountDueToCustomer: parseFloat(dataToUse.amountDueToCustomer) || 0,
        amountDueToRP: parseFloat(dataToUse.amountDueToRP) || 0,
        commissionRate: parseFloat(dataToUse.commissionRate) || 0,
        generalNotes: dataToUse.generalNotes, // <-- Ensure this is sent
        
        // Add lien status information for wholesale flip deals with private sellers
        titleInfo: {
          lienStatus: dataToUse.lienStatus || 'none',
          lienEta: dataToUse.lienEta ? new Date(dataToUse.lienEta) : null
        }
      };
      
      // Debug: log the final dealData being sent
      console.log('[DEAL SUBMIT] Final dealData being sent:', {
        dealType: dealData.dealType,
        dealType2: dealData.dealType2,
        dealType2SubType: dealData.dealType2SubType,
        buyer: dealData.buyer?.name,
        seller: dealData.seller?.name
      });
      
      // ENHANCED DEBUGGING FOR WHOLESALE D2D SALE
      if (dealData.dealType === 'wholesale-d2d') {
        console.log('[DEAL SUBMIT] 🔍 WHOLESALE D2D DEAL DEBUGGING:');
        console.log('[DEAL SUBMIT] 🔍 - dealType:', dealData.dealType);
        console.log('[DEAL SUBMIT] 🔍 - dealType2:', dealData.dealType2);
        console.log('[DEAL SUBMIT] 🔍 - dealType2SubType:', dealData.dealType2SubType);
        console.log('[DEAL SUBMIT] 🔍 - Is this a sale deal?', dealData.dealType2SubType === 'sale' || dealData.dealType2 === 'Sale');
        console.log('[DEAL SUBMIT] 🔍 - Full dealData object:', JSON.stringify(dealData, null, 2));
      }
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
      
      console.log('[HANDLE SAVE] Making API call to create deal...');
      console.log('[HANDLE SAVE] API URL:', `${API_BASE}/api/deals`);
      console.log('[HANDLE SAVE] Headers:', buildHeaders());
      console.log('[HANDLE SAVE] Deal data:', dealData);
      
      // Add detailed validation logging before sending
      console.log('[DEAL SUBMIT] 🔍 VALIDATION CHECK - Required fields being sent:');
      console.log('[DEAL SUBMIT] 🔍 - vin:', dealData.vin);
      console.log('[DEAL SUBMIT] 🔍 - year:', dealData.year);
      console.log('[DEAL SUBMIT] 🔍 - make:', dealData.make);
      console.log('[DEAL SUBMIT] 🔍 - model:', dealData.model);
      console.log('[DEAL SUBMIT] 🔍 - mileage:', dealData.mileage);
      console.log('[DEAL SUBMIT] 🔍 - exteriorColor:', dealData.exteriorColor);
      console.log('[DEAL SUBMIT] 🔍 - interiorColor:', dealData.interiorColor);
      console.log('[DEAL SUBMIT] 🔍 - seller.name:', dealData.seller?.name);
      console.log('[DEAL SUBMIT] 🔍 - seller.email:', dealData.seller?.email);
      console.log('[DEAL SUBMIT] 🔍 - seller.phone:', dealData.seller?.phone);
      console.log('[DEAL SUBMIT] 🔍 - seller.contact.email:', dealData.seller?.contact?.email);
      console.log('[DEAL SUBMIT] 🔍 - seller.contact.phone:', dealData.seller?.contact?.phone);
      console.log('[DEAL SUBMIT] 🔍 - salesperson:', dealData.salesperson);
      console.log('[DEAL SUBMIT] 🔍 - dealType:', dealData.dealType);
      console.log('[DEAL SUBMIT] 🔍 - dealType2SubType:', dealData.dealType2SubType);
      
      // Check for missing required fields
      const missingFields = [];
      if (!dealData.vin) missingFields.push('vin');
      if (!dealData.year) missingFields.push('year');
      if (!dealData.make) missingFields.push('make');
      if (!dealData.model) missingFields.push('model');
      if (!dealData.mileage) missingFields.push('mileage');
      if (!dealData.exteriorColor && !dealData.color) missingFields.push('exteriorColor/color');
      if (!dealData.interiorColor) missingFields.push('interiorColor');
      if (!dealData.seller?.name) missingFields.push('seller.name');
      if (!dealData.seller?.email && !(dealData.seller?.contact?.email)) missingFields.push('seller.email');
      if (!dealData.seller?.phone && !(dealData.seller?.contact?.phone)) missingFields.push('seller.phone');
      if (!dealData.salesperson) missingFields.push('salesperson');
      if (!dealData.dealType) missingFields.push('dealType');
      if (!dealData.dealType2SubType) missingFields.push('dealType2SubType');
      
      if (missingFields.length > 0) {
        console.error('[DEAL SUBMIT] ❌ MISSING REQUIRED FIELDS:', missingFields);
      } else {
        console.log('[DEAL SUBMIT] ✅ All required fields present');
      }

      // Create broker if brokerage fee is present and broker doesn't exist
      if (dealData.brokerFee && dealData.brokerFee > 0 && dealData.brokerFeePaidTo) {
        console.log('[BROKER CHECK] Checking if broker exists:', dealData.brokerFeePaidTo);
        
        // Check if broker exists
        const brokerCheckResponse = await fetch(`${API_BASE}/api/brokers?search=${encodeURIComponent(dealData.brokerFeePaidTo)}`, {
          credentials: 'include',
          headers: getAuthHeaders()
        });
        
        if (brokerCheckResponse.ok) {
          const brokerData = await brokerCheckResponse.json();
          const existingBroker = brokerData.data?.find(broker => 
            broker.name.toLowerCase() === dealData.brokerFeePaidTo.toLowerCase()
          );
          
          if (!existingBroker) {
            console.log('[BROKER CREATE] Creating new broker:', dealData.brokerFeePaidTo);
            const newBroker = await createNewBroker(dealData.brokerFeePaidTo);
            if (newBroker) {
              console.log('[BROKER CREATE] ✅ New broker created successfully');
            }
          } else {
            console.log('[BROKER CHECK] ✅ Broker already exists:', existingBroker.name);
          }
        }
      }
      
      // Create deal (this would be your existing deal creation endpoint)
      const dealResponse = await fetch(`${API_BASE}/api/deals`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(dealData),
        credentials: 'include'
      });
      
      // Debug: log backend response status
      console.log('[DEAL SUBMIT] Backend response status:', dealResponse.status);
      console.log('[DEAL SUBMIT] Backend response headers:', dealResponse.headers);
      
      let dealResult = {};
      let errorText = '';
      
      // Try to parse JSON response, but also capture raw text for debugging
      try {
        dealResult = await dealResponse.json();
        console.log('[DEAL SUBMIT] Backend response JSON:', dealResult);
      } catch (jsonError) {
        console.error('[DEAL SUBMIT] Error parsing JSON response:', jsonError);
        // If JSON parsing fails, try to get the raw text
        try {
          errorText = await dealResponse.text();
          console.error('[DEAL SUBMIT] Raw error response:', errorText);
        } catch (textError) {
          console.error('[DEAL SUBMIT] Could not read response as text either:', textError);
        }
        dealResult = {};
      }
      
      if (!dealResponse.ok) {
        console.error('[DEAL SUBMIT] API call failed with status:', dealResponse.status);
        console.error('[DEAL SUBMIT] Error response:', dealResult);
        console.error('[DEAL SUBMIT] Raw error text:', errorText);
        
        // Create a more detailed error message
        let errorMessage = 'Validation failed';
        if (dealResult.error) {
          errorMessage = dealResult.error;
        } else if (dealResult.details && Array.isArray(dealResult.details)) {
          errorMessage = `Validation failed: ${dealResult.details.join(', ')}`;
        } else if (errorText) {
          errorMessage = `Server error: ${errorText}`;
        } else {
          errorMessage = `Failed to create deal (Status: ${dealResponse.status})`;
        }
        
        throw new Error(errorMessage);
      }
      
      if (!dealResult.success || !dealResult.deal) {
        console.error('[DEAL SUBMIT] API call succeeded but no deal returned');
        console.error('[DEAL SUBMIT] Response:', dealResult);
        throw new Error(dealResult.error || 'Failed to create deal - no deal data returned');
      }
      
      console.log('[DEAL SUBMIT] Deal created successfully!');
      console.log('[DEAL SUBMIT] Deal ID:', dealResult.deal._id);
      console.log('[DEAL SUBMIT] Stock number:', dealResult.stockNumber);
      
      // --- Optimistic UI: Replace temp deal with real deal ---
      if (setDeals) {
        setDeals(deals => [dealResult.deal, ...deals]);
      }
      
      // Upload any documents that were added during deal creation
      if (dataToUse.documents && dataToUse.documents.length > 0) {
        console.log('[DEAL SUBMIT] Uploading', dataToUse.documents.length, 'documents');
        console.log('[DEAL SUBMIT] Documents to upload:', dataToUse.documents.map(d => ({ name: d.name, size: d.size, type: d.type })));
        
        try {
          // Create a single FormData with all files for batch upload
          const formDataUpload = new FormData();
          
          // Add all files to the FormData
          dataToUse.documents.forEach((file, index) => {
            formDataUpload.append('documents', file);
            const note = documentNotes.find(n => n.fileIndex === index)?.note || '';
            if (note) {
              formDataUpload.append('notes', note);
            }
          });
          
          console.log('[DEAL SUBMIT] Batch uploading all documents to:', `${API_BASE}/api/backOffice/deals/${dealResult.deal._id}/documents/extra_doc/upload`);
          
          const uploadResponse = await fetch(`${API_BASE}/api/backOffice/deals/${dealResult.deal._id}/documents/extra_doc/upload`, {
            method: 'POST',
            headers: {
              ...getAuthHeaders(),
              // Don't set Content-Type for FormData, let browser set it
            },
            body: formDataUpload,
            credentials: 'include'
          });
          
          console.log('[DEAL SUBMIT] Upload response status:', uploadResponse.status);
          
          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            console.log('[DEAL SUBMIT] All documents uploaded successfully:', uploadResult);
            toast.success(`${uploadResult.data.length} document(s) uploaded successfully!`);
          } else {
            const errorText = await uploadResponse.text();
            console.warn('[DEAL SUBMIT] Failed to upload documents:', 'Status:', uploadResponse.status, 'Error:', errorText);
            toast.error('Failed to upload some documents. Please try again.');
          }
        } catch (uploadError) {
          console.error('[DEAL SUBMIT] Error uploading documents:', uploadError);
          toast.error('Error uploading documents. Please try again.');
        }
      } else {
        console.log('[DEAL SUBMIT] No documents to upload');
      }

      // Automatically generate documents after successful deal creation
      try {
        console.log('[DEAL SUBMIT] Generating documents for deal:', dealResult.deal._id);
        console.log('[DEAL SUBMIT] Sending document generation data:', {
          dealType2SubType: dealData.dealType2SubType,
          dealType2: dealData.dealType2,
          sellerType: dealData.sellerType,
          buyerType: dealData.buyerType
        });
        
        try {
          const docResponse = await fetch(`${API_BASE}/api/documents/generate/${dealResult.deal._id}`, {
            method: 'POST',
            headers: {
              ...buildHeaders(),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              dealType2SubType: dealData.dealType2SubType,
              dealType2: dealData.dealType2,
              sellerType: dealData.sellerType,
              buyerType: dealData.buyerType
            }),
            credentials: 'include'
          });
          
          console.log('[DEAL SUBMIT] Document generation response status:', docResponse.status);
          
          if (docResponse.ok) {
            const docResult = await docResponse.json();
            console.log('[DEAL SUBMIT] Documents generated successfully:', docResult);
            toast.success(`Deal submitted and ${docResult.documentCount || 0} document(s) generated successfully!`);
          } else {
            const errorText = await docResponse.text();
            console.error('[DEAL SUBMIT] Document generation failed:', {
              status: docResponse.status,
              statusText: docResponse.statusText,
              error: errorText
            });
            toast.error('Deal submitted but document generation failed. Please contact support.');
          }
        } catch (docError) {
          console.error('[DEAL SUBMIT] Error generating documents:', docError);
          toast.error('Deal submitted but document generation failed. Please contact support.');
        }
      } catch (docGenError) {
        console.error('[DEAL SUBMIT] Error in document generation block:', docGenError);
        toast.error('Deal submitted but document generation failed. Please contact support.');
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

          documents: [],
          salesperson: '',
          
          // Lien Information (for wholesale flip with private seller)
          lienStatus: 'none',
          lienEta: ''
        });
        setDocumentNotes([]); // Clear document notes
        setCurrentStep(1);
      }
      
    } catch (error) {
      console.error('[HANDLE SAVE] Error occurred during deal submission:', error);
      console.error('[HANDLE SAVE] Error message:', error.message);
      console.error('[HANDLE SAVE] Error stack:', error.stack);
      
      // --- Optimistic UI: Remove temp deal on failure ---
      // Note: dealResult is not available in catch scope, so we can't remove specific deal
      // The optimistic UI will be handled by the finally block setting saving to false
      
      if (error.message.includes('401') || error.message.includes('not authorized')) {
        console.error('[HANDLE SAVE] Authentication error detected');
        alert('Session expired or not authorized. Please log in again.');
        navigate('/login');
      } else if (error.message.includes('400')) {
        console.error('[HANDLE SAVE] Bad request error detected');
        alert(`Validation error: ${error.message}`);
      } else if (error.message.includes('403')) {
        console.error('[HANDLE SAVE] Forbidden error detected');
        alert('Access denied. Please check your permissions.');
      } else if (error.message.includes('500')) {
        console.error('[HANDLE SAVE] Server error detected');
        alert('Server error occurred. Please try again later.');
      } else {
        console.error('[HANDLE SAVE] Unknown error occurred');
        alert(`Error saving deal: ${error.message}`);
      }
    } finally {
      console.log('[HANDLE SAVE] Setting saving state to false');
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
                          stepTitle = (formData.dealType === 'wholesale-flip' && formData.dealType2SubType === 'buy-sell') ? 'Buyer & Seller Information' : 
                          (formData.dealType === 'wholesale-d2d' && formData.dealType2SubType === 'sale') ? 'Buyer Information' : 'Seller Information';
              stepDescription = (formData.dealType === 'wholesale-flip' && formData.dealType2SubType === 'buy-sell') ? 'Add buyer and seller contact information' : 
                               (formData.dealType === 'wholesale-d2d' && formData.dealType2SubType === 'sale') ? 'Add purchasing dealer information' : 'Add seller contact information';
          } else if ((stepNumber === 4 && !dealTypeFields.showFinancials && !dealTypeFields.showSellerInfo) || 
                     (stepNumber === 5 && (dealTypeFields.showFinancials || dealTypeFields.showSellerInfo))) {
            stepTitle = 'Comments & Files';
            stepDescription = 'Add vehicle description, notes, and upload documents';
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
              pattern={type === 'tel' ? '[0-9+\-\(\)\s]*' : undefined}
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

            {/* Broker Autocomplete for brokerage fee paid to */}
            {field === 'brokerageFeePaidTo' && brokerSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-xl z-10 max-h-40 overflow-y-auto">
                {brokerSuggestions.map(broker => (
                  <div
                    key={broker._id}
                    className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0"
                    onClick={() => {
                      handleBrokerSuggestionClick(broker);
                    }}
                  >
                    <div className="font-medium text-white">{broker.name}</div>
                    <div className="text-sm text-gray-400">
                      {broker.company && `${broker.company} • `}
                      {broker.email} • {broker.phone}
                    </div>
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
                <div className={formData.dealType === 'wholesale-d2d' && (!formData.dealType2SubType || formData.dealType2SubType.trim() === '') ? 'ring-2 ring-yellow-500/50 rounded-lg p-1' : ''}>
                  {renderFormField('Deal Type 2', 'dealType2SubType', 'select', dealType2SubOptions, true)}
                </div>
                {formData.dealType === 'wholesale-d2d' && (
                  <div className={`mt-2 p-3 border rounded-lg ${(!formData.dealType2SubType || formData.dealType2SubType.trim() === '') ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-blue-500/10 border-blue-500/20'}`}>
                    <p className={`text-sm ${(!formData.dealType2SubType || formData.dealType2SubType.trim() === '') ? 'text-yellow-300' : 'text-blue-300'}`}>
                      {(!formData.dealType2SubType || formData.dealType2SubType.trim() === '') ? (
                        <>
                          ⚠️ <strong>Required:</strong> Please select "Buy" or "Sale" for wholesale dealer-to-dealer deals:
                          <br />• Select <strong>"Buy"</strong> if RP Exotics is purchasing from another dealer
                          <br />• Select <strong>"Sale"</strong> if RP Exotics is selling to another dealer
                        </>
                      ) : formData.dealType2SubType === 'buy' ? (
                        <>
                          ✅ <strong>Buy Deal:</strong> RP Exotics is purchasing from another dealer
                          <br />• <strong>Seller:</strong> Another dealer (you'll enter their info)
                          <br />• <strong>Buyer:</strong> RP Exotics (no buyer info needed)
                        </>
                      ) : formData.dealType2SubType === 'sale' ? (
                        <>
                          ✅ <strong>Sale Deal:</strong> RP Exotics is selling to another dealer
                          <br />• <strong>Seller:</strong> RP Exotics (no seller info needed)
                          <br />• <strong>Buyer:</strong> Another dealer (you'll enter their info)
                        </>
                      ) : (
                        <>
                          💡 <strong>Important:</strong> Please select the correct option for wholesale dealer-to-dealer deals:
                          <br />• Select <strong>"Buy"</strong> if RP Exotics is purchasing from another dealer
                          <br />• Select <strong>"Sale"</strong> if RP Exotics is selling to another dealer
                        </>
                      )}
                    </p>
                  </div>
                )}
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
                {renderFormField('RP Exotics Stock Number', 'rpStockNumber', 'text', null, false, Hash)}
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
                {renderFormField(dynamicLabels.amountDueToCustomerLabel, 'amountDueToCustomer', 'number')}
                {renderFormField(dynamicLabels.amountDueToRPExoticsLabel, 'amountDueToRP', 'number')}
              </div>
            ) : formData.dealType === 'retail-pp' ? (
              // Financial info for retail-pp buy deals - same layout as others
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-6">
                  {renderFormField(dynamicLabels.purchasePriceLabel, 'purchasePrice', 'number', null, true, DollarSign)}
                  {renderFormField('List Price', 'listPrice', 'number')}
                  {renderFormField(dynamicLabels.payoffBalanceLabel, 'payoffBalance', 'number')}
                </div>
                {/* Right column */}
                <div className="space-y-6">
                  {renderFormField('Brokerage Fee', 'brokerageFee', 'number')}
                  {renderFormField('Brokerage Fee Paid To', 'brokerageFeePaidTo', 'text')}
                  {renderFormField(dynamicLabels.amountDueToCustomerLabel, 'amountDueToCustomer', 'number')}
                  {renderFormField(dynamicLabels.amountDueToRPExoticsLabel, 'amountDueToRP', 'number')}
                </div>
              </div>
            ) : formData.dealType === 'retail-d2d' ? (
              // Financial info for retail-d2d deals - similar to retail-pp but with different layout
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-6">
                  {renderFormField(dynamicLabels.purchasePriceLabel, 'purchasePrice', 'number', null, true, DollarSign)}
                  {renderFormField('List Price', 'listPrice', 'number')}
                  {renderFormField(dynamicLabels.payoffBalanceLabel, 'payoffBalance', 'number')}
                </div>
                {/* Right column */}
                <div className="space-y-6">
                  {renderFormField('Brokerage Fee', 'brokerageFee', 'number')}
                  {renderFormField('Brokerage Fee Paid To', 'brokerageFeePaidTo', 'text')}
                  {renderFormField(dynamicLabels.amountDueToCustomerLabel, 'amountDueToCustomer', 'number')}
                  {renderFormField(dynamicLabels.amountDueToRPExoticsLabel, 'amountDueToRP', 'number')}
                </div>
              </div>
            ) : formData.dealType === 'wholesale-d2d' && formData.dealType2SubType === 'buy' ? (
              // Financial info for wholesale D2D buy deals - exclude List Price
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-6">
                  {renderFormField(dynamicLabels.purchasePriceLabel, 'purchasePrice', 'number', null, true, DollarSign)}
                  {renderFormField('Kill Price', 'killPrice', 'number')}
                  {renderFormField('Wholesale Price', 'wholesalePrice', 'number')}
                  {/* List Price excluded for wholesale D2D buy deals */}
                  {/* Only show Commission Rate for consign deals, otherwise keep layout clean */}
                  {['consign-a','consign-b','consign-c','consign-rdnc'].includes(formData.dealType2SubType)
                    ? renderFormField('Commission Rate (%)', 'commissionRate', 'number')
                    : null}
                </div>
                {/* Right column */}
                <div className="space-y-6">
                  {renderFormField('Brokerage Fee', 'brokerageFee', 'number')}
                  {renderFormField('Brokerage Fee Paid To', 'brokerageFeePaidTo', 'text')}
                  {renderFormField(dynamicLabels.payoffBalanceLabel, 'payoffBalance', 'number')}
                  {renderFormField(dynamicLabels.amountDueToCustomerLabel, 'amountDueToCustomer', 'number')}
                  {renderFormField(dynamicLabels.amountDueToRPExoticsLabel, 'amountDueToRP', 'number')}
                </div>
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
                  {renderFormField(dynamicLabels.payoffBalanceLabel, 'payoffBalance', 'number')}
                  {renderFormField(dynamicLabels.amountDueToCustomerLabel, 'amountDueToCustomer', 'number')}
                  {renderFormField(dynamicLabels.amountDueToRPExoticsLabel, 'amountDueToRP', 'number')}
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
        if (formData.dealType === 'wholesale-flip' && formData.dealType2SubType === 'buy-sell') {
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
                  {formData.buyerType === 'dealer' && !isWholesaleBuyDeal() && renderFormField('Dealer Tier', 'buyerTier', 'select', [
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
                  {formData.sellerType === 'dealer' && !(formData.dealType === 'wholesale-flip' && formData.dealType2SubType === 'buy-sell') && !isWholesaleBuyDeal() && renderFormField('Dealer Tier', 'sellerTier', 'select', [
                    { value: 'Tier 1', label: 'Tier 1: Pay Upon Title' },
                    { value: 'Tier 2', label: 'Tier 2: Pay Prior to Release' }
                  ])}
                </div>
              </div>
            </div>
          );
        } else if (formData.dealType === 'wholesale-d2d' && formData.dealType2SubType === 'sale') {
          // For wholesale d2d sale, only show buyer information (RP Exotics is the seller)
          return (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white mb-4">Buyer Information</h3>
                              <p className="text-gray-400 mb-6">Enter the purchasing dealer information (RP Exotics is the seller)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderFormField('Dealer Name', 'buyerName', 'text', null, true, User)}
                {renderFormField('Phone', 'buyerPhone', 'tel', null, false, Phone)}
                {renderFormField('Email', 'buyerEmail', 'email', null, false, Mail)}
                {renderFormField('Address', 'buyerAddress', 'text', null, false, MapPin)}
                {renderFormField('Dealer License Number', 'buyerLicenseNumber', 'text')}
                {!isWholesaleBuyDeal() && renderFormField('Dealer Tier', 'buyerTier', 'select', [
                  { value: 'Tier 1', label: 'Tier 1: Pay Upon Title' },
                  { value: 'Tier 2', label: 'Tier 2: Pay Prior to Release' }
                ])}
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
                  {!isRetailPP && formData.dealType !== 'retail-d2d' && !(formData.dealType === 'wholesale-d2d' && formData.dealType2SubType === 'buy') && renderFormField(dynamicLabels.companyLabel, 'sellerCompany', 'text')}
                  {renderFormField('Phone', 'sellerPhone', 'tel', null, false, Phone)}
                  {renderFormField('Email', 'sellerEmail', 'email', null, false, Mail)}
                  {renderFormField(dynamicLabels.addressLabel, 'sellerAddress', 'text', null, false, MapPin)}
                  
                  {/* Show license number for retail-d2d and wholesale d2d deals */}
                  {(formData.dealType === 'retail-d2d' || formData.dealType === 'wholesale-d2d') && (
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
                        
                        {/* Dealer Tier for retail-d2d deals */}
                        {formData.dealType === 'retail-d2d' && (
                          <div>
                            <label htmlFor="seller-tier" className="block text-sm font-medium text-gray-300 mb-1">Dealer Tier</label>
                            <select
                              id="seller-tier"
                              value={formData.sellerTier || 'Tier 1'}
                              onChange={e => handleInputChange('sellerTier', e.target.value)}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="Tier 1">Tier 1: Pay Upon Title</option>
                              <option value="Tier 2">Tier 2: Pay Prior to Release</option>
                            </select>
                          </div>
                        )}
                      
                      {/* Tier Selection - only for sale deals, not buy deals */}
                      {formData.dealType2SubType === 'sale' && formData.dealType === 'wholesale-d2d' && (
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
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* Buyer Section for Wholesale D2D Deals */}
              {formData.dealType === 'wholesale-d2d' && formData.dealType2SubType === 'sale' && (
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
                    {!isWholesaleBuyDeal() && (
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
                    )}
                  </div>
                </div>
              )}
      
              {/* Lien Status Section for Wholesale Flip with Private Seller */}
              {formData.dealType === 'wholesale-flip' && formData.sellerType === 'private' && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-6">
                  <h4 className="text-blue-300 font-semibold mb-2 flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-blue-400" />
                    Title Lien Status
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-300 text-sm">Lien Status</span>
                      <select 
                        value={formData.lienStatus} 
                        onChange={e => handleInputChange('lienStatus', e.target.value)} 
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="none">No Lien</option>
                        <option value="lien_on_title">Lien on Title</option>
                      </select>
                    </div>
                    {formData.lienStatus === 'lien_on_title' && (
                      <div>
                        <span className="text-gray-300 text-sm">Lien Payoff Completion ETA</span>
                        <LienPayoffDatePicker
                          value={formData.lienEta ? new Date(formData.lienEta) : null}
                          onChange={(date) => handleInputChange('lienEta', date ? date.toISOString() : '')}
                          placeholder="Select lien payoff date..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
                                {/* Document Upload Section - Hide for retail-pp deals, retail-d2d deals, and wholesale d2d buy deals */}
                  {formData.dealType !== 'retail-pp' && formData.dealType !== 'retail-d2d' && !(formData.dealType === 'wholesale-d2d' && formData.dealType2SubType === 'buy') && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 mt-6">
                <h3 className="text-lg font-medium text-white mb-4">Additional Information</h3>
                <div className="space-y-6">
                  {renderFormField('Vehicle Description', 'vehicleDescription', 'textarea', null, false, Info)}
                  {renderFormField('General Notes', 'generalNotes', 'textarea', null, false, Info)}
                  
                  {/* File upload area */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Upload Documents/Photos</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf,.doc,.docx"
                      onChange={handleDocumentUpload}
                      className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                      style={{ display: 'block' }}
                      key={`file-input-step4-${formData.documents?.length || 0}`}
                    />
                    <p className="text-gray-400 text-xs mt-1">You can select multiple files at once</p>
                    {formData.documents && formData.documents.length > 0 && (
                      <p className="text-blue-400 text-xs mt-1">
                        Currently uploaded: {formData.documents.length} file{formData.documents.length !== 1 ? 's' : ''}
                      </p>
                    )}
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
              )}
            </div>
          );
        }
      
      case 5:
        return (
          <div className="space-y-6">
            {/* Comments, Description & Files */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white mb-4">Comments, Description & Files</h3>
              
              {/* Vehicle Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vehicle Description
                </label>
                <textarea
                  value={formData.vehicleDescription || ''}
                  onChange={(e) => handleInputChange('vehicleDescription', e.target.value)}
                  placeholder="Enter detailed vehicle description..."
                  rows={4}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>

              {/* General Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  General Notes
                </label>
                <textarea
                  value={formData.generalNotes || ''}
                  onChange={(e) => handleInputChange('generalNotes', e.target.value)}
                  placeholder="Enter any additional notes or comments..."
                  rows={4}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>

              {/* Document Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload Documents
                </label>
                <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/30 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleDocumentUpload}
                    className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    style={{ display: 'block' }}
                    key={`file-input-${formData.documents?.length || 0}`}
                  />
                  <div className="mt-3 text-center">
                    <p className="text-gray-400 text-sm">PDF, DOC, DOCX, JPG, PNG (Max 10MB each)</p>
                    <p className="text-gray-400 text-xs mt-1">You can select multiple files at once</p>
                    {formData.documents && formData.documents.length > 0 && (
                      <p className="text-blue-400 text-xs mt-1">
                        Currently uploaded: {formData.documents.length} file{formData.documents.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {formData.documents && formData.documents.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Uploaded Documents</h4>
                  <div className="space-y-3">
                    {formData.documents.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-500/20 rounded p-2">
                            <FileText className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                            <p className="text-white text-sm font-medium">{file.name}</p>
                            <p className="text-gray-400 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="Add note..."
                            value={documentNotes.find(note => note.fileIndex === index)?.note || ''}
                            onChange={(e) => handleDocumentNoteChange(index, e.target.value)}
                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleRemoveDocument(index)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
          </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
    steps++; // Add step for comments, description, and files
    return steps;
  };

  const totalSteps = getTotalSteps();

  // Add a constant for the unified status options
  const STATUS_OPTIONS = [
    { value: 'contract-received', label: 'Contract Received' },
    { value: 'docs-signed', label: 'Docs Signed' },
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
    'docs-signed',
    'title-processing',
    'payment-approved',
    'funds-disbursed',
    'title-received',
    'deal-complete'
  ];

  // Helper function to identify wholesale buy deals
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
                  onClick={() => {
                    console.log('[SUBMIT] Submit button clicked');
                    console.log('[SUBMIT] Current form data:', formData);
                    console.log('[SUBMIT] Current user:', currentUser);
                    console.log('[SUBMIT] Validation errors:', formErrors);
                    
                    // Check if user is logged in
                    if (!currentUser) {
                      console.log('[SUBMIT] No user logged in');
                      alert('You must be logged in to submit a deal.');
                      navigate('/login');
                      return;
                    }
                    
                    // Auto-set seller for wholesale-d2d sale deals (RP Exotics is always the seller)
                    if (formData.dealType === 'wholesale-d2d' && formData.dealType2SubType === 'sale' && !formData.sellerName) {
                      console.log('[SUBMIT] Auto-setting seller for wholesale-d2d sale deal');
                      
                      // Create updated form data with seller info
                      const updatedFormData = {
                        ...formData,
                        sellerName: 'RP Exotics',
                        sellerType: 'dealer',
                        sellerPhone: '(314) 970-2427',
                        sellerEmail: 'titling@rpexotics.com',
                        sellerAddress: '1155 N Warson Rd, Saint Louis, MO 63132',
                        sellerLicenseNumber: 'D4865',
                        sellerTier: 'Tier 1'
                      };
                      
                      // Update state
                      setFormData(updatedFormData);
                      
                      // Validate with updated data immediately
                      const errors = {};
                      let requiredFields = ['vin', 'dealType', 'dealType2SubType', 'year', 'make', 'model', 'sellerName'];
                      
                      requiredFields.forEach(field => {
                        const value = updatedFormData[field];
                        console.log(`[SUBMIT] Checking field '${field}':`, value);
                        
                        if (!value || value.toString().trim() === '') {
                          errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
                          console.log(`[SUBMIT] ❌ Field '${field}' is missing or empty`);
                        } else {
                          console.log(`[SUBMIT] ✅ Field '${field}' is valid:`, value);
                        }
                      });
                      
                      // Additional validation checks
                      if (updatedFormData.year && (updatedFormData.year < 1900 || updatedFormData.year > new Date().getFullYear() + 1)) {
                        errors.year = 'Please enter a valid year';
                        console.log('[SUBMIT] ❌ Invalid year:', updatedFormData.year);
                      }
                      
                      if (updatedFormData.mileage && updatedFormData.mileage < 0) {
                        errors.mileage = 'Mileage cannot be negative';
                        console.log('[SUBMIT] ❌ Negative mileage:', updatedFormData.mileage);
                      }
                      
                      const dealTypeFields = getDealTypeFields();
                      if (dealTypeFields.showFinancials && updatedFormData.purchasePrice && updatedFormData.purchasePrice <= 0) {
                        errors.purchasePrice = 'Purchase price must be greater than 0';
                        console.log('[SUBMIT] ❌ Invalid purchase price:', updatedFormData.purchasePrice);
                      }
                      
                      console.log('[SUBMIT] Validation errors:', errors);
                      setFormErrors(errors);
                      
                      const isValid = Object.keys(errors).length === 0;
                      console.log('[SUBMIT] Form validation result:', isValid);
                      
                      if (!isValid) {
                        console.log('[SUBMIT] Form validation failed');
                        console.log('[SUBMIT] Form errors:', errors);
                        alert('Please fill in all required fields: ' + Object.keys(errors).join(', '));
                        return;
                      }
                      
                      console.log('[SUBMIT] Calling handleSave with updated form data...');
                      // Call handleSave with the updated form data
                      handleSaveWithData(updatedFormData, false);
                      return;
                    }
                    
                    // Check validation
                    const isValid = validateForm();
                    console.log('[SUBMIT] Form validation result:', isValid);
                    
                    if (!isValid) {
                      console.log('[SUBMIT] Form validation failed');
                      console.log('[SUBMIT] Form errors:', formErrors);
                      alert('Please fill in all required fields: ' + Object.keys(formErrors).join(', '));
                      return;
                    }
                    
                    console.log('[SUBMIT] Calling handleSave...');
                    handleSave(false);
                  }}
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