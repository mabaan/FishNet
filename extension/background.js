// background.js - Service worker for the extension
// This is the brain of our Chrome extension - handles all background processing

const BACKEND_URL = 'http://localhost:5000'; // Your Python Flask server running locally

// Listen for messages from content script or popup
// This allows communication between different parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkURL') {
    // When popup asks us to check a URL, we handle it and send results back
    handleURLCheck(request.url, request.features)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// Listen for tab updates to auto-check URLs - the magic happens here!
// Every time you navigate to a new page, we automatically scan it for phishing
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Skip chrome:// and extension URLs - only scan actual websites
    if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
      console.log('Auto-checking URL:', tab.url);
      checkTabURL(tabId, tab.url); // Kick off the phishing detection
    }
  }
});

async function handleURLCheck(url, features = null, tabId = null) {
  try {
    // Step 1: Check USI score first - compare URL against 1M known legitimate domains
    // USI (URL Similarity Index) is our fast first-pass filter
    const usiResult = await checkUSI(url);
    
    // Package up the initial results from USI analysis
    const result = {
      url: url,
      stage: 'USI', // We start with similarity detection
      usiScore: usiResult.best_usi, // How similar to known good domains (0-100)
      bestMatch: usiResult.best_domain, // The closest legitimate domain we found
      verdict: usiResult.verdict, // LEGITIMATE, PHISHING, or SEND_TO_MODEL
      mlPrediction: null,
      confidence: null
    };

    // Step 2: If USI is unsure, we bring in the big guns - our ML model!
    // This happens when the URL doesn't match any known patterns (USI score < 55)
    console.log(`USI verdict: ${usiResult.verdict}, Score: ${usiResult.best_usi}`);
    
    if (usiResult.verdict === 'SEND_TO_MODEL') {
      console.log('⚡ TRIGGERING ML MODEL - USI score too low, need feature-based analysis');
      if (!features) {
        // We need to extract 19 features from the webpage for ML analysis
        // Features include URL length, domain characteristics, page content keywords, etc.
        let targetTabId = tabId;
        if (!targetTabId) {
          // Find the active tab if we don't already have it
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]) {
            targetTabId = tabs[0].id;
          }
        }
        
        if (targetTabId) {
          try {
            console.log('Requesting features from content script, tab:', targetTabId);
            // Ask content script to analyze the page and extract features
            const response = await chrome.tabs.sendMessage(targetTabId, { action: 'extractFeatures' });
            features = response.features; // We now have our 19 ML features!
            console.log('Features extracted:', features);
          } catch (error) {
            console.error('Failed to extract features from content script:', error);
          }
        }
      }

      if (features) {
        console.log('Sending features to ML model...');
        // Send the 19 features to our trained Logistic Regression model
        const mlResult = await classifyWithML(features);
        console.log('ML result:', mlResult);
        result.stage = 'ML'; // We've upgraded to ML-based detection
        result.mlPrediction = mlResult.prediction; // 0 = legitimate, 1 = phishing
        result.confidence = mlResult.confidence; // How confident is the model? (0-1)
        result.verdict = mlResult.verdict || (mlResult.prediction === 1 ? 'PHISHING' : 'LEGITIMATE');
      } else {
        console.warn('No features available for ML classification');
      }
    }

    // Store result for popup - this is how popup.js gets the data
    await chrome.storage.local.set({ lastResult: result });
    
    // Update the extension icon badge (✓ for safe, ⚠️ for phishing)
    updateBadge(result.verdict);
    
    return result;

  } catch (error) {
    console.error('Error in handleURLCheck:', error);
    throw error;
  }
}

async function checkUSI(url) {
  console.log('Checking USI for:', url);
  // Call our Flask backend to check URL similarity against FAISS vector database
  try {
    const response = await fetch(`${BACKEND_URL}/check_usi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('USI check failed:', response.status, errorText);
      throw new Error(`USI check failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('USI result:', result);
    return result;
  } catch (error) {
    console.error('Backend connection failed:', error);
    throw new Error('Cannot connect to backend server. Make sure Flask is running on localhost:5000');
  }
}

async function classifyWithML(features) {
  console.log('Calling /classify endpoint with features:', Object.keys(features));
  // Send our 19 extracted features to the ML model for final verdict
  try {
    const response = await fetch(`${BACKEND_URL}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features: features })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ML classification failed:', response.status, errorText);
      throw new Error(`ML classification failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('ML classification result:', result);
    return result;
  } catch (error) {
    console.error('Backend connection failed:', error);
    throw new Error('Cannot connect to backend server. Make sure Flask is running on localhost:5000');
  }
}

async function checkTabURL(tabId, url) {
  try {
    console.log('Starting check for tab:', tabId, url);
    // Run the full phishing detection pipeline
    const result = await handleURLCheck(url, null, tabId);
    console.log('Check completed:', result);
    
    // Auto-open popup ONLY if not legitimate - alert the user immediately!
    if (result.verdict !== 'LEGITIMATE') {
      // Pop open the extension to show the warning
      try {
        await chrome.action.openPopup();
      } catch (popupError) {
        // Can't open popup (no active window or user hasn't interacted)
        // Badge will still show warning, user can click extension icon manually
        console.log('Could not auto-open popup:', popupError.message);
      }
    }
    
    // In-page warning removed - user only sees extension popup
  } catch (error) {
    console.error('Error checking tab URL:', error);
    // Store error result so popup can show it
    await chrome.storage.local.set({ 
      lastResult: {
        url: url,
        error: error.message,
        verdict: 'ERROR'
      }
    });
  }
}

function updateBadge(verdict) {
  let text = '';
  let color = '#4CAF50'; // Green for safe

  // Update the little badge on the extension icon - simple visual feedback
  // Users see this in their toolbar without even clicking
  if (verdict === 'LEGITIMATE') {
    text = '✓'; // Green checkmark = you're safe!
    color = '#4CAF50'; // Green
  } else {
    // All non-legitimate verdicts show as phishing - better safe than sorry!
    text = '⚠️'; // Red warning = danger!
    color = '#F44336'; // Red
  }

  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: color });
}