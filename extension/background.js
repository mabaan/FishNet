// background.js - Service worker for the extension

const BACKEND_URL = 'http://localhost:5000'; // Your Python Flask server

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkURL') {
    handleURLCheck(request.url, request.features)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// Listen for tab updates to auto-check URLs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Skip chrome:// and extension URLs
    if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
      console.log('Auto-checking URL:', tab.url);
      checkTabURL(tabId, tab.url);
    }
  }
});

async function handleURLCheck(url, features = null, tabId = null) {
  try {
    // Step 1: Check USI score first
    const usiResult = await checkUSI(url);
    
    const result = {
      url: url,
      stage: 'USI',
      usiScore: usiResult.best_usi,
      bestMatch: usiResult.best_domain,
      verdict: usiResult.verdict,
      mlPrediction: null,
      confidence: null
    };

    // Step 2: If verdict is SEND_TO_MODEL, extract features and classify
    if (usiResult.verdict === 'SEND_TO_MODEL') {
      console.log('USI verdict is SEND_TO_MODEL, extracting features...');
      if (!features) {
        // Request features from content script
        // Use provided tabId or query for active tab
        let targetTabId = tabId;
        if (!targetTabId) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]) {
            targetTabId = tabs[0].id;
          }
        }
        
        if (targetTabId) {
          try {
            console.log('Requesting features from content script, tab:', targetTabId);
            const response = await chrome.tabs.sendMessage(targetTabId, { action: 'extractFeatures' });
            features = response.features;
            console.log('Features extracted:', features);
          } catch (error) {
            console.error('Failed to extract features from content script:', error);
          }
        }
      }

      if (features) {
        console.log('Sending features to ML model...');
        const mlResult = await classifyWithML(features);
        console.log('ML result:', mlResult);
        result.stage = 'ML';
        result.mlPrediction = mlResult.prediction;
        result.confidence = mlResult.confidence;
        result.verdict = mlResult.verdict || (mlResult.prediction === 1 ? 'PHISHING' : 'LEGITIMATE');
      } else {
        console.warn('No features available for ML classification');
      }
    }

    // Store result for popup
    await chrome.storage.local.set({ lastResult: result });
    
    // Update badge
    updateBadge(result.verdict);
    
    return result;

  } catch (error) {
    console.error('Error in handleURLCheck:', error);
    throw error;
  }
}

async function checkUSI(url) {
  console.log('Checking USI for:', url);
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
}

async function classifyWithML(features) {
  console.log('Calling /classify endpoint with features:', Object.keys(features));
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
}

async function checkTabURL(tabId, url) {
  try {
    console.log('Starting check for tab:', tabId, url);
    const result = await handleURLCheck(url, null, tabId);
    console.log('Check completed:', result);
    
    // Notify content script to show in-page indicator if phishing
    if (result.verdict === 'PHISHING' || result.verdict === 'LIKELY_PHISHING') {
      chrome.tabs.sendMessage(tabId, {
        action: 'showWarning',
        result: result
      });
    }
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
  let color = '#4CAF50'; // Green

  switch (verdict) {
    case 'PHISHING':
      text = '⚠️';
      color = '#F44336'; // Red
      break;
    case 'LIKELY_PHISHING':
      text = '⚠';
      color = '#FF9800'; // Orange
      break;
    case 'SEND_TO_MODEL':
      text = '?';
      color = '#2196F3'; // Blue
      break;
    case 'LEGITIMATE':
      text = '✓';
      color = '#4CAF50'; // Green
      break;
  }

  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: color });
}