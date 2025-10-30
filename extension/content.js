// content.js - Runs in the context of web pages

// ===== URLFeatureExtractor Class =====
class URLFeatureExtractor {
    constructor(url, document = null) {
        try {
            this.url = url;
            this.urlObj = new URL(url);
            this.domain = this.urlObj.hostname;
            this.protocol = this.urlObj.protocol;
            this.pathname = this.urlObj.pathname;
            this.search = this.urlObj.search;
            this.document = document || (typeof window !== 'undefined' ? window.document : null);
        } catch (e) {
            console.error("Invalid URL:", url, e);
            throw new Error("Invalid URL provided");
        }
    }

    /**
     * Extract all features required by the model
     * @returns {Object} Feature dictionary matching Python model input
     */
    extractFeatures() {
        return {
            URLLength: this.getURLLength(),
            DomainLength: this.getDomainLength(),
            IsDomainIP: this.isDomainIP(),
            TLD: this.getTLD(),
            TLDLength: this.getTLDLength(),
            NoOfSubDomain: this.getNumberOfSubdomains(),
            NoOfLettersInURL: this.getNumberOfLetters(),
            NoOfDegitsInURL: this.getNumberOfDigits(),
            NoOfEqualsInURL: this.getNumberOfEquals(),
            NoOfQMarkInURL: this.getNumberOfQuestionMarks(),
            NoOfAmpersandInURL: this.getNumberOfAmpersands(),
            IsHTTPS: this.isHTTPS(),
            HasTitle: this.hasTitle(),
            HasFavicon: this.hasFavicon(),
            HasSubmitButton: this.hasSubmitButton(),
            HasHiddenFields: this.hasHiddenFields(),
            HasPasswordField: this.hasPasswordField(),
            Bank: this.hasBankKeywords(),
            Pay: this.hasPayKeywords(),
            Crypto: this.hasCryptoKeywords()
        };
    }

    /**
     * 1. URLLength - Total length of the URL
     */
    getURLLength() {
        return this.url.length;
    }

    /**
     * 2. DomainLength - Length of the domain name
     */
    getDomainLength() {
        return this.domain.length;
    }

    /**
     * 3. NoOfSubDomain - Number of subdomains
     * Example: www.mail.google.com has 2 subdomains (www, mail)
     */
    getNumberOfSubdomains() {
        const parts = this.domain.split('.');
        // If we have more than 2 parts (domain.tld), the extras are subdomains
        // e.g., "www.example.com" = ["www", "example", "com"] -> 1 subdomain
        return Math.max(0, parts.length - 2);
    }

    /**
     * 4. TLD - Top Level Domain
     */
    getTLD() {
        const parts = this.domain.split('.');
        return parts.length > 0 ? parts[parts.length - 1] : '';
    }

    /**
     * 5. TLDLength - Length of the TLD
     */
    getTLDLength() {
        return this.getTLD().length;
    }

    /**
     * 3. IsDomainIP - Whether the domain is an IP address
     */
    isDomainIP() {
        // Check if domain is IPv4 address
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        
        // Check if domain is IPv6 address (simplified check)
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^\[.*\]$/;
        
        return (ipv4Regex.test(this.domain) || ipv6Regex.test(this.domain)) ? 1 : 0;
    }

    /**
     * 10. IsHTTPS - Whether the URL uses HTTPS
     */
    isHTTPS() {
        return this.protocol === 'https:' ? 1 : 0;
    }

    /**
     * NEW: HasPasswordField - Detect password input fields
     */
    hasPasswordField() {
        if (!this.document) return 0;
        
        const passwordFields = this.document.querySelectorAll('input[type="password"]');
        return passwordFields.length > 0 ? 1 : 0;
    }

    /**
     * NEW: HasHiddenFields - Detect hidden form inputs
     */
    hasHiddenFields() {
        if (!this.document) return 0;
        
        const hiddenFields = this.document.querySelectorAll('input[type="hidden"]');
        return hiddenFields.length;
    }

    /**
     * Bank - Check for banking-related keywords in HTML content
     */
    hasBankKeywords() {
        if (!this.document) return 0;
        
        const htmlContent = this.document.body ? this.document.body.textContent.toLowerCase() : '';
        const bankKeywords = ['bank', 'banking', 'account', 'credit', 'debit'];
        
        return bankKeywords.some(keyword => htmlContent.includes(keyword)) ? 1 : 0;
    }

    /**
     * Pay - Check for payment-related keywords in HTML content
     */
    hasPayKeywords() {
        if (!this.document) return 0;
        
        const htmlContent = this.document.body ? this.document.body.textContent.toLowerCase() : '';
        const payKeywords = ['pay', 'payment', 'checkout', 'purchase', 'billing'];
        
        return payKeywords.some(keyword => htmlContent.includes(keyword)) ? 1 : 0;
    }

    /**
     * Crypto - Check for cryptocurrency-related keywords in HTML content
     */
    hasCryptoKeywords() {
        if (!this.document) return 0;
        
        const htmlContent = this.document.body ? this.document.body.textContent.toLowerCase() : '';
        const cryptoKeywords = ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'wallet', 'btc', 'eth'];
        
        return cryptoKeywords.some(keyword => htmlContent.includes(keyword)) ? 1 : 0;
    }

    /**
     * NoOfLettersInURL - Count alphabetic characters
     */
    getNumberOfLetters() {
        return (this.url.match(/[a-zA-Z]/g) || []).length;
    }

    /**
     * NoOfDegitsInURL - Count numeric digits
     */
    getNumberOfDigits() {
        return (this.url.match(/[0-9]/g) || []).length;
    }

    /**
     * NoOfEqualsInURL - Count equals signs
     */
    getNumberOfEquals() {
        return (this.url.match(/=/g) || []).length;
    }

    /**
     * NoOfQMarkInURL - Count question marks
     */
    getNumberOfQuestionMarks() {
        return (this.url.match(/\?/g) || []).length;
    }

    /**
     * NoOfAmpersandInURL - Count ampersands
     */
    getNumberOfAmpersands() {
        return (this.url.match(/&/g) || []).length;
    }

    /**
     * HasTitle - Check if document has a title tag
     */
    hasTitle() {
        if (!this.document) return 0;
        const title = this.document.querySelector('title');
        return (title && title.textContent.trim().length > 0) ? 1 : 0;
    }

    /**
     * HasFavicon - Check if page has a favicon link
     */
    hasFavicon() {
        if (!this.document) return 0;
        const favicon = this.document.querySelector('link[rel*="icon"]');
        return favicon ? 1 : 0;
    }

    /**
     * HasSubmitButton - Check for submit buttons or inputs
     */
    hasSubmitButton() {
        if (!this.document) return 0;
        const submitButtons = this.document.querySelectorAll(
            'button[type="submit"], input[type="submit"]'
        );
        return submitButtons.length > 0 ? 1 : 0;
    }
}

// ===== Content Script Logic =====

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractFeatures') {
    console.log('Content script: Extracting features for', window.location.href);
    const features = extractFeaturesFromPage();
    console.log('Content script: Features extracted:', features);
    sendResponse({ features: features });
    return true;
  }

  if (request.action === 'showWarning') {
    showPhishingWarning(request.result);
  }
});

function extractFeaturesFromPage() {
  try {
    console.log('Content script: Creating URLFeatureExtractor');
    const extractor = new URLFeatureExtractor(window.location.href, document);
    const features = extractor.extractFeatures();
    console.log('Content script: Extracted features:', {
      URLLength: features.URLLength,
      DomainLength: features.DomainLength,
      IsHTTPS: features.IsHTTPS,
      HasPasswordField: features.HasPasswordField,
      // ... showing sample features
    });
    return features;
  } catch (error) {
    console.error('Content script: Error extracting features:', error);
    return null;
  }
}

function showPhishingWarning(result) {
  // Create a warning banner at the top of the page
  const existingWarning = document.getElementById('phishing-detector-warning');
  if (existingWarning) {
    existingWarning.remove();
  }

  const warning = document.createElement('div');
  warning.id = 'phishing-detector-warning';
  warning.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: ${result.verdict === 'PHISHING' ? '#F44336' : '#FF9800'};
    color: white;
    padding: 15px;
    text-align: center;
    font-family: Arial, sans-serif;
    font-size: 16px;
    z-index: 999999;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  `;

  const message = result.verdict === 'PHISHING' 
    ? '⚠️ WARNING: This site may be a phishing attempt!'
    : '⚠ CAUTION: This site shows suspicious characteristics.';

  warning.innerHTML = `
    <strong>${message}</strong>
    <br>
    <small>Similar to: ${result.bestMatch} (Score: ${result.usiScore})</small>
    <button id="dismiss-warning" style="
      margin-left: 20px;
      padding: 5px 15px;
      background: white;
      color: #333;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    ">Dismiss</button>
  `;

  document.body.insertBefore(warning, document.body.firstChild);

  // Add dismiss functionality
  document.getElementById('dismiss-warning').addEventListener('click', () => {
    warning.remove();
  });

  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (warning.parentNode) {
      warning.remove();
    }
  }, 30000);
}