import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';

const SignatureComplianceReport = () => {
  const { signatureId } = useParams();
  const { getAuthHeaders } = useAuth();
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'https://astonishing-chicken-production.up.railway.app';

  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/signatures/${signatureId}/compliance`, {
          headers: getAuthHeaders(),
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setCompliance(data);
        } else {
          setError('Failed to fetch compliance report');
        }
      } catch (error) {
        console.error('Error fetching compliance:', error);
        setError('Error fetching compliance report');
      } finally {
        setLoading(false);
      }
    };

    if (signatureId) {
      fetchCompliance();
    }
  }, [signatureId, getAuthHeaders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading compliance report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-red-400 text-center">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!compliance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-center">
          <p>No compliance data found</p>
        </div>
      </div>
    );
  }

  const { compliance: complianceData, auditTrail } = compliance;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Legal Compliance Report</h1>
          
          {/* Overall Compliance Status */}
          <div className={`mb-8 p-6 rounded-lg border-2 ${
            complianceData.isCompliant 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                complianceData.isCompliant ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {complianceData.isCompliant ? (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <h2 className={`text-xl font-semibold ${
                  complianceData.isCompliant ? 'text-green-800' : 'text-red-800'
                }`}>
                  {complianceData.isCompliant ? '✅ LEGALLY COMPLIANT' : '❌ NOT COMPLIANT'}
                </h2>
                <p className={`text-sm ${
                  complianceData.isCompliant ? 'text-green-700' : 'text-red-700'
                }`}>
                  This signature meets {complianceData.isCompliant ? 'all' : 'some'} ESIGN and UETA requirements
                </p>
              </div>
            </div>
          </div>

          {/* Compliance Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Intent to Sign */}
            <div className={`p-6 rounded-lg border-2 ${
              complianceData.intentToSign ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center mb-3">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  complianceData.intentToSign ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {complianceData.intentToSign ? '✓' : '✗'}
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">1. Intent to Sign</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                User took clear affirmative action to sign electronically
              </p>
              {auditTrail.intentToSign.timestamp && (
                <div className="text-xs text-gray-500">
                  <p>Timestamp: {new Date(auditTrail.intentToSign.timestamp).toLocaleString()}</p>
                  <p>IP Address: {auditTrail.intentToSign.ipAddress}</p>
                </div>
              )}
            </div>

            {/* Consent to Electronic Business */}
            <div className={`p-6 rounded-lg border-2 ${
              complianceData.consentToElectronicBusiness ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center mb-3">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  complianceData.consentToElectronicBusiness ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {complianceData.consentToElectronicBusiness ? '✓' : '✗'}
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">2. Consent to Electronic Business</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                User agreed to conduct business electronically
              </p>
              {auditTrail.consentToElectronicBusiness.timestamp && (
                <div className="text-xs text-gray-500">
                  <p>Timestamp: {new Date(auditTrail.consentToElectronicBusiness.timestamp).toLocaleString()}</p>
                  <p>IP Address: {auditTrail.consentToElectronicBusiness.ipAddress}</p>
                </div>
              )}
            </div>

            {/* Signature Association */}
            <div className={`p-6 rounded-lg border-2 ${
              complianceData.signatureAssociation ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center mb-3">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  complianceData.signatureAssociation ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {complianceData.signatureAssociation ? '✓' : '✗'}
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">3. Clear Signature Association</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Signature is tied to a specific user identity
              </p>
              <div className="text-xs text-gray-500">
                <p>Verification Method: {auditTrail.signatureAssociation.identityVerificationMethod}</p>
                <p>Verified: {auditTrail.signatureAssociation.signerIdentityVerified ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {/* Document Integrity */}
            <div className={`p-6 rounded-lg border-2 ${
              complianceData.documentIntegrity ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center mb-3">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  complianceData.documentIntegrity ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {complianceData.documentIntegrity ? '✓' : '✗'}
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">4. Document Integrity</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Document is tamper-evident and verified
              </p>
              <div className="text-xs text-gray-500">
                <p>Document Hash: {auditTrail.documentIntegrity.documentHash?.substring(0, 16)}...</p>
                <p>Signature Verified: {auditTrail.documentIntegrity.isVerified ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>

          {/* Detailed Audit Trail */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Audit Trail</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Intent to Sign</h4>
                <div className="space-y-1 text-gray-600">
                  <p>Timestamp: {auditTrail.intentToSign.timestamp ? new Date(auditTrail.intentToSign.timestamp).toLocaleString() : 'Not recorded'}</p>
                  <p>IP Address: {auditTrail.intentToSign.ipAddress || 'Not recorded'}</p>
                  <p>User Agent: {auditTrail.intentToSign.userAgent ? auditTrail.intentToSign.userAgent.substring(0, 50) + '...' : 'Not recorded'}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Electronic Business Consent</h4>
                <div className="space-y-1 text-gray-600">
                  <p>Timestamp: {auditTrail.consentToElectronicBusiness.timestamp ? new Date(auditTrail.consentToElectronicBusiness.timestamp).toLocaleString() : 'Not recorded'}</p>
                  <p>IP Address: {auditTrail.consentToElectronicBusiness.ipAddress || 'Not recorded'}</p>
                  <p>User Agent: {auditTrail.consentToElectronicBusiness.userAgent ? auditTrail.consentToElectronicBusiness.userAgent.substring(0, 50) + '...' : 'Not recorded'}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Identity Verification</h4>
                <div className="space-y-1 text-gray-600">
                  <p>Method: {auditTrail.signatureAssociation.identityVerificationMethod}</p>
                  <p>Verified: {auditTrail.signatureAssociation.signerIdentityVerified ? 'Yes' : 'No'}</p>
                  <p>Timestamp: {auditTrail.signatureAssociation.identityVerificationTimestamp ? new Date(auditTrail.signatureAssociation.identityVerificationTimestamp).toLocaleString() : 'Not recorded'}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Document Integrity</h4>
                <div className="space-y-1 text-gray-600">
                  <p>Document Hash: {auditTrail.documentIntegrity.documentHash || 'Not generated'}</p>
                  <p>Signature Hash: {auditTrail.documentIntegrity.signatureHash || 'Not generated'}</p>
                  <p>Verified: {auditTrail.documentIntegrity.isVerified ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Legal Disclaimer</h4>
            <p className="text-sm text-blue-800">
              This compliance report is generated based on ESIGN Act and UETA requirements. 
              The signature system is designed to meet legal standards for electronic signatures 
              in the United States. For legal advice regarding specific compliance requirements, 
              please consult with qualified legal counsel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureComplianceReport; 