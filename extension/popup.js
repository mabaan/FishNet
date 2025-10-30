// popup.js - Handles the popup UI

document.addEventListener('DOMContentLoaded', async () => {
  // Load and display the last result
  const { lastResult } = await chrome.storage.local.get('lastResult');
  
  if (lastResult) {
    if (lastResult.error) {
      document.getElementById('loading').innerHTML = 
        `<p style="color: #C62828;">Error: ${lastResult.error}</p>
         <p style="font-size: 12px;">Make sure the Flask backend is running on http://localhost:5000</p>`;
    } else {
      displayResult(lastResult);
    }
  } else {
    document.getElementById('loading').innerHTML = '<p>No results yet. Navigate to a page to analyze.</p>';
  }

  // Setup recheck button
  document.getElementById('recheckBtn').addEventListener('click', async () => {
    await recheckCurrentPage();
  });
});

async function recheckCurrentPage() {
  const loadingDiv = document.getElementById('loading');
  const resultDiv = document.getElementById('result');
  
  loadingDiv.style.display = 'block';
  resultDiv.style.display = 'none';
  loadingDiv.innerHTML = '<p>Analyzing URL...</p>';

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
      throw new Error('No active tab found');
    }

    // Send check request to background script
    const response = await chrome.runtime.sendMessage({
      action: 'checkURL',
      url: tab.url
    });

    if (response.success) {
      displayResult(response.data);
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    loadingDiv.innerHTML = `<p style="color: #C62828;">Error: ${error.message}</p>`;
  }
}

function displayResult(result) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('result').style.display = 'block';

  // Display URL
  document.getElementById('urlDisplay').textContent = result.url;

  // Display verdict
  const verdictDiv = document.getElementById('verdictDisplay');
  verdictDiv.textContent = getVerdictText(result.verdict);
  verdictDiv.className = 'verdict ' + getVerdictClass(result.verdict);

  // Display analysis details
  document.getElementById('stage').textContent = result.stage;
  document.getElementById('usiScore').innerHTML = getScoreBadge(result.usiScore);
  document.getElementById('bestMatch').textContent = result.bestMatch || 'N/A';

  // Display ML results if available
  const mlRow = document.getElementById('mlRow');
  if (result.mlPrediction !== null) {
    mlRow.style.display = 'flex';
    document.getElementById('confidence').textContent = 
      result.confidence ? (result.confidence * 100).toFixed(1) + '%' : 'N/A';
  } else {
    mlRow.style.display = 'none';
  }
}

function getVerdictText(verdict) {
  const verdictMap = {
    'LEGITIMATE': '✓ Legitimate',
    'PHISHING': '⚠️ Phishing Detected',
    'LIKELY_PHISHING': '⚠ Likely Phishing',
    'SEND_TO_MODEL': 'ℹ️ Under Analysis'
  };
  return verdictMap[verdict] || verdict;
}

function getVerdictClass(verdict) {
  const classMap = {
    'LEGITIMATE': 'legitimate',
    'PHISHING': 'phishing',
    'LIKELY_PHISHING': 'likely-phishing',
    'SEND_TO_MODEL': 'send-to-model'
  };
  return classMap[verdict] || '';
}

function getScoreBadge(score) {
  if (!score) return 'N/A';
  
  let badgeClass = 'score-low';
  if (score >= 90) badgeClass = 'score-high';
  else if (score >= 80) badgeClass = 'score-medium';
  
  return `<span class="score-badge ${badgeClass}">${score.toFixed(1)}</span>`;
}