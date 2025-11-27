document.addEventListener('DOMContentLoaded', async () => {
  // When popup opens, set everything up - this runs first!
  const toggleBtn = document.getElementById('toggleDetails');
  const panel = document.getElementById('detailsPanel');
  
  // Open details panel by default - show users all the juicy analysis data
  panel.classList.add('open');
  toggleBtn.innerHTML = `Hide Analysis`;
  
  toggleBtn.addEventListener('click', () => {
    const isOpen = panel.classList.contains('open');
    if (isOpen) {
      panel.classList.remove('open');
      toggleBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> View Analysis`;
    } else {
      panel.classList.add('open');
      toggleBtn.innerHTML = `Hide Analysis`;
    }
  });

  // App Logic
  const { lastResult } = await chrome.storage.local.get('lastResult');
  if (lastResult && !lastResult.error) {
    displayResult(lastResult);
  } else {
    recheckCurrentPage();
  }

  document.getElementById('recheckBtn').addEventListener('click', recheckCurrentPage);
  document.getElementById('reportBtn').addEventListener('click', reportClassification);
});

async function recheckCurrentPage() {
  toggleUI(true);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) throw new Error('No tab');

    await new Promise(r => setTimeout(r, 500)); // Small visual delay

    const response = await chrome.runtime.sendMessage({
      action: 'checkURL',
      url: tab.url
    });

    if (response.success) displayResult(response.data);
    else throw new Error(response.error);
    
  } catch (error) {
    toggleUI(false);
    document.getElementById('verdictText').textContent = "Error";
    document.getElementById('verdictText').className = "verdict-text c-danger";
  }
}

function displayResult(data) {
  toggleUI(false); // Hide loading spinner, show results

  // 1. Setup Status - show the big verdict (SAFE or PHISHING)
  const config = getStatusConfig(data.verdict, data.usiScore);
  
  const verdictEl = document.getElementById('verdictText');
  const iconEl = document.getElementById('statusIcon');
  
  verdictEl.textContent = config.text; // "Safe" or "Phishing"
  verdictEl.className = `verdict-text ${config.cssClass}`; // Apply green or red styling
  iconEl.innerHTML = config.icon; // Shield or X icon
  iconEl.className = `status-icon ${config.cssClass}`; // Color the icon

  // 2. Set URL - show which site we analyzed
  document.getElementById('urlDisplay').textContent = data.url;

  // 3. Populate The Yap (Details) - all the nerdy technical stuff
  document.getElementById('scoreVal').textContent = data.usiScore ? Math.round(data.usiScore) : '0'; // Similarity score 0-100
  document.getElementById('domainVal').textContent = data.bestMatch || 'None'; // Closest legitimate domain
  
  // 4. Set user-friendly explanation - plain English warning or all-clear
  const explanationEl = document.getElementById('explanation');
  explanationEl.textContent = getUserExplanation(data.verdict, data.bestMatch);
}

function getUserExplanation(verdict, bestMatch) {
  // Translate technical verdict into plain English for regular users
  // No jargon - just tell them if they're safe or in danger!
  if (verdict === 'LEGITIMATE') {
    return `✓ This website appears safe to use. It matches our database of verified legitimate domains. You can browse normally.`;
  } else {
    // All non-legitimate sites get a stern warning - protect the user!
    return `⚠️ This website may be trying to steal your information. It could be pretending to be ${bestMatch || 'a trusted site'}. Do not enter passwords, credit card details, or personal information. Leave this site immediately.`;
  }
}

function getStatusConfig(verdict, score) {
  // SVG icons for visual feedback - shield for safe, X for danger
  const icons = {
    safe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>`,
    danger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
  };

  // Simplify to binary decision: SAFE or PHISHING - no middle ground for users!
  // Backend has nuanced verdicts, but users just need to know: safe or not?
  if (verdict === 'LEGITIMATE') {
    return { text: 'Safe', cssClass: 'c-safe', icon: icons.safe }; // Green shield
  } else {
    // Everything else gets the danger treatment - cautious by design!
    return { text: 'Phishing', cssClass: 'c-danger', icon: icons.danger }; // Red X
  }
}

async function reportClassification() {
  // User thinks the classification is wrong - send feedback to backend for retraining
  const { lastResult } = await chrome.storage.local.get('lastResult');
  if (!lastResult) return;

  const reportBtn = document.getElementById('reportBtn');
  const originalText = reportBtn.textContent;
  
  try {
    reportBtn.textContent = 'Sending report...';
    reportBtn.disabled = true;

    // Send the current result to backend - it will be saved for retraining
    const response = await fetch('http://localhost:5000/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: lastResult.url,
        predicted_verdict: lastResult.verdict,
        usi_score: lastResult.usiScore,
        best_match: lastResult.bestMatch,
        ml_prediction: lastResult.mlPrediction,
        confidence: lastResult.confidence,
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      reportBtn.textContent = '✓ Reported! Thank you';
      setTimeout(() => {
        reportBtn.textContent = originalText;
        reportBtn.disabled = false;
      }, 2000);
    } else {
      throw new Error('Failed to send report');
    }
  } catch (error) {
    console.error('Error reporting:', error);
    reportBtn.textContent = '✗ Failed to report';
    setTimeout(() => {
      reportBtn.textContent = originalText;
      reportBtn.disabled = false;
    }, 2000);
  }
}

function toggleUI(isLoading) {
  const loading = document.getElementById('loading');
  const result = document.getElementById('result');
  
  if (isLoading) {
    loading.classList.remove('hidden');
    result.classList.add('hidden');
  } else {
    loading.classList.add('hidden');
    result.classList.remove('hidden');
  }
}