/* global gtag */
// Analytics service for Google Analytics tracking
class AnalyticsService {
  constructor() {
    this.isEnabled = typeof window !== 'undefined' && window.gtag;
  }

  // Helper function to safely call gtag
  callGtag(...args) {
    if (this.isEnabled && typeof window.gtag === 'function') {
      window.gtag(...args);
    }
  }

  // Track page views
  trackPageView(pageTitle, pagePath) {
    if (!this.isEnabled) return;
    
    this.callGtag('config', 'G-Y0TPG2F3LK', {
      page_title: pageTitle,
      page_location: window.location.href,
      page_path: pagePath
    });
  }

  // Track signature events
  trackSignatureEvent(eventName, data = {}) {
    if (!this.isEnabled) return;
    
    this.callGtag('event', eventName, {
      event_category: 'signature',
      event_label: data.documentType || 'unknown',
      value: data.step || 0,
      custom_parameters: {
        signature_id: data.signatureId || 'unknown',
        document_type: data.documentType || 'unknown',
        step: data.step || 0,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Track signature flow steps
  trackSignatureStep(step, documentType, signatureId) {
    this.trackSignatureEvent('signature_step', {
      step,
      documentType,
      signatureId
    });
  }

  // Track consent events
  trackConsentEvent(consentType, documentType, signatureId) {
    this.trackSignatureEvent('consent_given', {
      step: consentType === 'intent' ? 1 : 2,
      documentType,
      signatureId,
      consent_type: consentType
    });
  }

  // Track signature completion
  trackSignatureCompletion(documentType, signatureId, signatureMethod) {
    this.trackSignatureEvent('signature_completed', {
      step: 4,
      documentType,
      signatureId,
      signature_method: signatureMethod
    });
  }

  // Track errors
  trackError(errorType, errorMessage, context = {}) {
    if (!this.isEnabled) return;
    
    this.callGtag('event', 'signature_error', {
      event_category: 'signature',
      event_label: errorType,
      value: 1,
      custom_parameters: {
        error_type: errorType,
        error_message: errorMessage,
        context: JSON.stringify(context),
        timestamp: new Date().toISOString()
      }
    });
  }

  // Track user interactions
  trackUserInteraction(action, element, context = {}) {
    if (!this.isEnabled) return;
    
    this.callGtag('event', 'user_interaction', {
      event_category: 'signature',
      event_label: action,
      custom_parameters: {
        action,
        element,
        context: JSON.stringify(context),
        timestamp: new Date().toISOString()
      }
    });
  }

  // Track deal-related events
  trackDealEvent(eventName, dealData = {}) {
    if (!this.isEnabled) return;
    
    this.callGtag('event', eventName, {
      event_category: 'deal',
      event_label: dealData.dealType || 'unknown',
      value: dealData.purchasePrice || 0,
      custom_parameters: {
        deal_type: dealData.dealType || 'unknown',
        vehicle_year: dealData.year || 'unknown',
        vehicle_make: dealData.make || 'unknown',
        vehicle_model: dealData.model || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Create singleton instance
const analytics = new AnalyticsService();

export default analytics; 