/**
 * LynkEdge Production Data Operator Console Client
 * Handles live status sync, form submission, and disconnection resilience.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('productionForm');
  const submitBtn = document.getElementById('submitBtn');
  const connBadge = document.getElementById('connBadge');
  const connText = document.getElementById('connText');
  
  const inChargeInput = document.getElementById('inCharge');
  const workingInput = document.getElementById('working');
  const productionKitsInput = document.getElementById('productionKits');
  const batchNumberInput = document.getElementById('batchNumber');
  
  const lastUpdatedDisplay = document.getElementById('lastUpdatedDisplay');
  const boardStatusDisplay = document.getElementById('boardStatusDisplay');
  const feedbackBanner = document.getElementById('feedbackBanner');
  const feedbackText = document.getElementById('feedbackText');
  const feedbackIcon = document.getElementById('feedbackIcon');

  let isConnected = false;
  let pollInterval = null;

  // Show inline message
  function showFeedback(type, message) {
    feedbackBanner.className = `feedback-banner ${type}`;
    feedbackText.textContent = message;
    
    if (type === 'success') {
      feedbackIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>`;
    } else {
      feedbackIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>`;
    }
  }

  function hideFeedback() {
    feedbackBanner.className = 'feedback-banner hidden';
  }

  function updateConnectionUI(online) {
    isConnected = online;
    if (online) {
      connBadge.className = 'connection-badge connected';
      connText.textContent = 'Link Active (AP)';
    } else {
      connBadge.className = 'connection-badge disconnected';
      connText.textContent = 'Disconnected';
    }
  }

  // Fetch current state from ESP32 Linkage Board
  async function fetchStatus() {
    try {
      const response = await fetch('/api/status', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      updateConnectionUI(true);

      // Populate form only if user is not actively editing it
      if (document.activeElement.tagName !== 'INPUT') {
        if (data.in_charge !== undefined && data.in_charge !== '') inChargeInput.value = data.in_charge;
        if (data.working !== undefined && data.working !== null) workingInput.value = data.working;
        if (data.production_kits !== undefined && data.production_kits !== null) productionKitsInput.value = data.production_kits;
        if (data.batch_number !== undefined && data.batch_number !== '') batchNumberInput.value = data.batch_number;
      }

      if (data.last_updated) {
        lastUpdatedDisplay.textContent = data.last_updated;
      }
      if (data.board_status) {
        boardStatusDisplay.textContent = data.board_status.toUpperCase();
      }
    } catch (err) {
      updateConnectionUI(false);
      console.warn('Status poll failed:', err.message);
    }
  }

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    const in_charge = inChargeInput.value.trim();
    const working = parseInt(workingInput.value, 10);
    const production_kits = parseInt(productionKitsInput.value, 10);
    const batch_number = batchNumberInput.value.trim();

    // Client-side validation
    if (!in_charge) {
      showFeedback('error', 'Person In Charge is required.');
      inChargeInput.focus();
      return;
    }
    if (isNaN(working) || working < 0) {
      showFeedback('error', 'Please enter a valid number for People Working.');
      workingInput.focus();
      return;
    }
    if (isNaN(production_kits) || production_kits < 0) {
      showFeedback('error', 'Please enter a valid number for Production Kits.');
      productionKitsInput.focus();
      return;
    }
    if (!batch_number) {
      showFeedback('error', 'Batch Number is required.');
      batchNumberInput.focus();
      return;
    }

    const payload = {
      in_charge,
      working,
      production_kits,
      batch_number
    };

    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').textContent = 'Updating Board...';

    try {
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showFeedback('success', result.message || 'Production data successfully committed to Board & Screen!');
        if (result.last_updated) {
          lastUpdatedDisplay.textContent = result.last_updated;
        }
        updateConnectionUI(true);
      } else {
        showFeedback('error', result.message || 'Validation error from Linkage Board.');
      }
    } catch (err) {
      showFeedback('error', 'Cannot reach Linkage Board. Check WiFi connection to LYNKEDGE.');
      updateConnectionUI(false);
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-text').textContent = 'Submit / Update Board';
    }
  });

  // Initial fetch and start periodic polling (every 4 seconds)
  fetchStatus();
  pollInterval = setInterval(fetchStatus, 4000);
});
