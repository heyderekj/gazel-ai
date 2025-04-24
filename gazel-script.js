document.addEventListener('DOMContentLoaded', function () {
  console.log('[Gazel] Script initialized');

  const form = document.querySelector('form');
  const urlField = document.querySelector('.url-field');
  const urlButton = document.querySelector('.url-button');

  console.log('[Gazel] Form elements found:', {
    form: !!form,
    field: !!urlField,
    button: !!urlButton
  });

  // Fix insecure form action
  if (form && form.getAttribute('action')?.startsWith('http://')) {
    form.setAttribute('action', form.getAttribute('action').replace('http://', 'https://'));
    console.log('[Gazel] Fixed insecure form action target');
  }

  // Set input attributes to prevent autofill and override Webflow validation
  if (urlField) {
    urlField.setAttribute('autocomplete', 'off');
    urlField.setAttribute('autocorrect', 'off');
    urlField.setAttribute('autocapitalize', 'off');
    urlField.setAttribute('spellcheck', 'false');
    urlField.setAttribute('type', 'text');
  }

  // Disable button initially
  if (urlButton) {
    urlButton.style.opacity = '0.5';
    urlButton.style.pointerEvents = 'none';
  }

  // URL validation helper
  function isValidURL(string) {
    if (!string) return false;
    const domainPattern = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    if (!/^https?:\/\//i.test(string)) {
      if (!domainPattern.test(string)) return false;
      string = 'http://' + string;
    }
    try {
      const url = new URL(string);
      return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.') && url.hostname.length > 3;
    } catch (_) {
      return false;
    }
  }

  // Function to get or create a short persistent user identifier
  function getShortUserIdentifier() {
    // Try to get from localStorage first (most persistent)
    let userId = localStorage.getItem('gazel_user_id');
    
    // If not found in localStorage, check sessionStorage (fallback)
    if (!userId) {
      userId = sessionStorage.getItem('gazel_user_id');
    }
    
    // If still not found, create a new one (shorter format)
    if (!userId) {
      // Generate a shorter unique ID using timestamp and random values
      // Format: timestamp (base36) + short random string (8 chars)
      const timestamp = Date.now().toString(36);
      const randomPart = Math.random().toString(36).substring(2, 10);
      userId = timestamp + randomPart;
      
      // Store in both localStorage and sessionStorage for persistence
      try {
        localStorage.setItem('gazel_user_id', userId);
      } catch (e) {
        console.log('[Gazel] Unable to use localStorage, falling back to sessionStorage only');
      }
      sessionStorage.setItem('gazel_user_id', userId);
    }
    
    return userId;
  }

  // Function to analyze SEO using loading page approach
  function analyzeSEOViaForm(url) {
    console.log('[Gazel] Starting analysis for URL:', url);
    
    // Ensure URL has proper format - ALWAYS use HTTPS to prevent mixed content warnings
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
      console.log('[Gazel] URL reformatted to include https:', url);
    } else if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
      console.log('[Gazel] URL changed from http to https:', url);
    }
    
    // Generate or retrieve a short user identifier
    let userId = getShortUserIdentifier();
    console.log('[Gazel] Using user identifier:', userId);
    
    // Store the URL and user ID in sessionStorage
    sessionStorage.setItem('analyzedUrl', url);
    sessionStorage.setItem('userId', userId);
    sessionStorage.setItem('analysisStartTime', Date.now());
    
    // Base64 encode the data for Stripe (shorter format)
    const dataToEncode = JSON.stringify({id: userId, url: url});
    
    // Encode to Base64 and replace '=' with '_' to avoid issues with client_reference_id
    const encodedData = btoa(dataToEncode).replace(/=/g, '_');
    console.log('[Gazel] Base64 encoded data for Stripe (with = replaced by _):', encodedData);
    
    // Create the Stripe checkout URL with the encoded reference ID
    const stripeCheckoutUrl = `https://buy.stripe.com/4gw6p4dJuei17ba6op?client_reference_id=${encodedData}`;
    console.log('[Gazel] Stripe checkout URL:', stripeCheckoutUrl);
    
    // Store the Stripe URL in sessionStorage
    sessionStorage.setItem('stripeCheckoutUrl', stripeCheckoutUrl);
    
    // Redirect to loading page
    console.log('[Gazel] Redirecting to loading page...');
    window.location.href = '/loading?url=' + encodeURIComponent(url);
  }

  // Function to handle the retrieved data on the receiving end (if needed)
  function decodeStripeReferenceId(encodedId) {
    // Add back any missing padding if needed
    let paddedId = encodedId;
    while (paddedId.length % 4 !== 0) {
      paddedId += '_';
    }
    
    // Replace '_' back to '=' for decoding
    const base64Id = paddedId.replace(/_/g, '=');
    
    try {
      // Decode the Base64 string
      const jsonString = atob(base64Id);
      // Parse the JSON
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('[Gazel] Error decoding reference ID:', error);
      return null;
    }
  }

  // Handle input changes
  if (urlField) {
    urlField.addEventListener('input', function () {
      const inputValue = this.value.trim();
      const parent = this.closest('.url-input_area');
      if (parent) {
        parent.classList.toggle('has-content', !!inputValue);
      }

      if (urlButton) {
        if (isValidURL(inputValue)) {
          urlButton.style.opacity = '1';
          urlButton.style.pointerEvents = 'auto';
          urlField.setCustomValidity('');
          urlButton.classList.add('url-valid');
        } else {
          urlButton.style.opacity = '0.5';
          urlButton.style.pointerEvents = 'none';
          urlField.setCustomValidity(inputValue ? 'Please enter a valid URL' : '');
          urlButton.classList.remove('url-valid');
        }
      }
    });
  }

  // Button click handler
  if (urlButton) {
    urlButton.addEventListener('click', function (e) {
      e.preventDefault();
      const url = urlField?.value.trim() || '';
      if (isValidURL(url)) {
        analyzeSEOViaForm(url);
      } else {
        urlField.setCustomValidity('Please enter a valid URL');
        urlField.reportValidity();
      }
    });
  }

  // Form submit handler
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const url = urlField?.value.trim() || '';
      if (isValidURL(url)) {
        analyzeSEOViaForm(url);
      } else {
        urlField.setCustomValidity('Please enter a valid URL');
        urlField.reportValidity();
      }
    });
  }

  // ===== LOADING PAGE CODE =====
  if (window.location.pathname.includes('/loading')) {
    console.log('[Gazel] On loading page, initializing...');
    setTimeout(loadingPageInit, 100); // Short delay to ensure DOM is ready
  }
  
  // ===== RESULTS PAGE CODE =====
  if (window.location.pathname.includes('/results') && !window.location.pathname.includes('/results-pre')) {
    console.log('[Gazel] On results page, initializing...');
    setTimeout(resultsPageInit, 100); // Short delay to ensure DOM is ready
  }
  
  // ===== RESULTS PRE PAGE CODE =====
  if (window.location.pathname.includes('/results-pre')) {
    console.log('[Gazel] On results-pre page, initializing...');
    setTimeout(resultsPrePageInit, 100); // Short delay to ensure DOM is ready
  }
  
  // Loading page initialization
  function loadingPageInit() {
    console.log('[Gazel] Loading page initialization started');
    
    // Get the URL from sessionStorage or from query parameter
    let analyzedUrl = sessionStorage.getItem('analyzedUrl') || '';
    
    // If not in sessionStorage, try to get from URL params
    if (!analyzedUrl) {
      const urlParams = new URLSearchParams(window.location.search);
      analyzedUrl = urlParams.get('url') || '';
      if (analyzedUrl) {
        sessionStorage.setItem('analyzedUrl', analyzedUrl);
      }
    }
    
    console.log('[Gazel] Analyzed URL for display:', analyzedUrl);
    
    // Display the analyzed URL on the loading page
    updateUrlDisplay(analyzedUrl);
    
    // Create and add spinner animation
    createAndAddSpinner();
    
    // Wait minimum time before redirecting (for perceived loading experience)
    const loadStartTime = Date.now();
    const minLoadTime = 5000; // 5 second minimum loading time
    
    // Function to handle redirection with minimum loading time
    function redirectAfterMinTime(isSuccess, data) {
      const elapsedTime = Date.now() - loadStartTime;
      const remainingTime = Math.max(0, minLoadTime - elapsedTime);
      
      if (isSuccess) {
        // No need to store API data in session storage since API no longer returns results directly
        // Just store success status
        sessionStorage.setItem('seoAnalysisInitiated', 'true');
        sessionStorage.setItem('usingRealData', 'true');
      } else {
        // Store error in session storage
        sessionStorage.setItem('analysisError', data.toString());
        sessionStorage.setItem('usingRealData', 'false');
      }
      
      // Wait for the minimum loading time before redirecting
      setTimeout(() => {
        window.location.href = '/results-pre';
      }, remainingTime);
    }
    
    // Start SEO analysis (just initiate the process, don't expect results)
    startSEOAnalysis(analyzedUrl)
      .then(data => redirectAfterMinTime(true, data))
      .catch(error => {
        console.error('[Gazel API] Error:', error);
        redirectAfterMinTime(false, error);
      });
  }
  
  // Updated to match new backend flow - no results expected
  function startSEOAnalysis(url) {
    return new Promise((resolve, reject) => {
      if (!url) {
        reject(new Error('No URL provided for analysis'));
        return;
      }
      
      console.log('[Gazel API] Starting API request');
      console.log('[Gazel API] Analyzing URL:', url);
      
      // Get the user ID from storage
      const userId = sessionStorage.getItem('userId') || getShortUserIdentifier();
      console.log('[Gazel API] Using user ID for API call:', userId);
      
      // Set up API call with fetch - now just initiates the analysis
      fetch('https://api.gazel.ai/api/v1/seo_analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          id: userId
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`API request failed with status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('[Gazel API] Analysis initiated successfully:', data);
        resolve(data);
      })
      .catch(error => {
        console.error('[Gazel API] Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        // In development/testing mode, fall back to simulated data
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('webflow.io')) {
          console.log('[Gazel API] Development environment detected, simulating successful analysis');
          resolve({ success: true, message: "Analysis initiated successfully (simulated)" });
        } else {
          reject(error);
        }
      });
    });
  }
  
  // Function to fetch pre-results data
  function fetchPreResults() {
    return new Promise((resolve, reject) => {
      // Get the user ID
      const userId = sessionStorage.getItem('userId') || getShortUserIdentifier();
      
      if (!userId) {
        reject(new Error('No user ID available'));
        return;
      }
      
      console.log('[Gazel API] Fetching pre-results for user ID:', userId);
      
      // Make API call to get pre-results
      fetch('https://api.gazel.ai/api/v1/pre_results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Pre-results API request failed with status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('[Gazel API] Received pre-results:', data);
        // Store pre-results data
        sessionStorage.setItem('preResultsData', JSON.stringify(data));
        resolve(data);
      })
      .catch(error => {
        console.error('[Gazel API] Error fetching pre-results:', error);
        
        // In development/testing mode, fall back to simulated data
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('webflow.io')) {
          console.log('[Gazel API] Development environment detected, using simulated pre-results');
          const simulatedData = createSimulatedPreResults();
          sessionStorage.setItem('preResultsData', JSON.stringify(simulatedData));
          resolve(simulatedData);
        } else {
          reject(error);
        }
      });
    });
  }
  
  // Function to check payment status
  function checkPaymentStatus() {
    return new Promise((resolve, reject) => {
      // Get the user ID
      const userId = sessionStorage.getItem('userId') || getShortUserIdentifier();
      
      if (!userId) {
        reject(new Error('No user ID available'));
        return;
      }
      
      console.log('[Gazel API] Checking payment status for user ID:', userId);
      
      // Make API call to check payment
      fetch('https://api.gazel.ai/api/v1/checkpayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Payment check API request failed with status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('[Gazel API] Payment status response:', data);
        // Store payment status
        sessionStorage.setItem('paymentStatus', JSON.stringify(data));
        resolve(data);
      })
      .catch(error => {
        console.error('[Gazel API] Error checking payment status:', error);
        
        // In development/testing mode, assume not paid
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('webflow.io')) {
          console.log('[Gazel API] Development environment detected, simulating unpaid status');
          const simulatedData = { paid: false };
          sessionStorage.setItem('paymentStatus', JSON.stringify(simulatedData));
          resolve(simulatedData);
        } else {
          reject(error);
        }
      });
    });
  }
  
  // Function to fetch full results (after payment)
  function fetchFullResults() {
    return new Promise((resolve, reject) => {
      // Get the user ID
      const userId = sessionStorage.getItem('userId') || getShortUserIdentifier();
      
      if (!userId) {
        reject(new Error('No user ID available'));
        return;
      }
      
      // First check if payment was made
      checkPaymentStatus()
        .then(paymentData => {
          if (!paymentData.paid) {
            throw new Error('Payment required to access full results');
          }
          
          console.log('[Gazel API] Payment verified, fetching full results for user ID:', userId);
          
          // If paid, fetch full results
          return fetch('https://api.gazel.ai/api/v1/full_results', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: userId
            })
          });
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Full results API request failed with status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log('[Gazel API] Received full results:', data);
          // Store full results data
          sessionStorage.setItem('fullResultsData', JSON.stringify(data));
          resolve(data);
        })
        .catch(error => {
          console.error('[Gazel API] Error fetching full results:', error);
          
          // Special handling for payment required error
          if (error.message.includes('Payment required')) {
            sessionStorage.setItem('paymentRequired', 'true');
            reject(error);
          }
          
          // In development/testing mode, use simulated data
          if (window.location.hostname === 'localhost' || 
              window.location.hostname === '127.0.0.1' ||
              window.location.hostname.includes('webflow.io')) {
            console.log('[Gazel API] Development environment detected, using simulated full results');
            const simulatedData = createSimulatedFullResults();
            sessionStorage.setItem('fullResultsData', JSON.stringify(simulatedData));
            resolve(simulatedData);
          } else {
            reject(error);
          }
        });
    });
  }
  
  // Results Pre-page initialization
  function resultsPrePageInit() {
    // Get the URL from sessionStorage
    let analyzedUrl = sessionStorage.getItem('analyzedUrl') || '';
    
    // Display the analyzed URL
    updateUrlDisplay(analyzedUrl);
    
    // Get the Stripe checkout URL from sessionStorage
    const stripeCheckoutUrl = sessionStorage.getItem('stripeCheckoutUrl');
    
    // Set up both payment buttons to redirect to Stripe
    const paymentButton1 = document.getElementById('payment-button-1');
    const paymentButton2 = document.getElementById('payment-button-2');
    
    // Function to handle button click
    const handlePaymentClick = function(e) {
      e.preventDefault();
      console.log('[Gazel] Payment button clicked, redirecting to Stripe:', stripeCheckoutUrl);
      window.location.href = stripeCheckoutUrl;
    };
    
    // Add event listener to first payment button if it exists
    if (paymentButton1 && stripeCheckoutUrl) {
      paymentButton1.addEventListener('click', handlePaymentClick);
      console.log('[Gazel] Added click handler to payment button 1');
    }
    
    // Add event listener to second payment button if it exists
    if (paymentButton2 && stripeCheckoutUrl) {
      paymentButton2.addEventListener('click', handlePaymentClick);
      console.log('[Gazel] Added click handler to payment button 2');
    }
    
    // NEW: Fetch and display pre-results data
    fetchPreResults()
      .then(data => {
        // Update UI with pre-results data
        updatePreResultsUI(data);
      })
      .catch(error => {
        console.error('[Gazel] Error displaying pre-results:', error);
        // Use simulated data as fallback
        const simulatedData = createSimulatedPreResults();
        updatePreResultsUI(simulatedData);
      });
  }
  
  // Results page initialization
  function resultsPageInit() {
    // Get the URL from sessionStorage
    const analyzedUrl = sessionStorage.getItem('analyzedUrl') || '';
    
    // Display the analyzed URL
    updateUrlDisplay(analyzedUrl);
    
    // Fetch and display full results
    fetchFullResults()
      .then(data => {
        // Update UI with full results data
        updateFullResultsUI(data);
      })
      .catch(error => {
        console.error('[Gazel] Error displaying full results:', error);
        
        // If payment required, redirect to pre-results page
        if (error.message.includes('Payment required')) {
          console.log('[Gazel] Payment required, redirecting to pre-results page');
          window.location.href = '/results-pre';
          return;
        }
        
        // Use simulated data as fallback
        const simulatedData = createSimulatedFullResults();
        updateFullResultsUI(simulatedData);
        
        // Add simulated data notice
        setTimeout(addSimulatedDataNotice, 500);
      });
    
    // Check for hash in URL to activate correct tab
    if (window.location.hash) {
      const tabId = window.location.hash.substring(1);
      activateTab(tabId);
    }
  }
  
  // Function to update UI with pre-results data
  function updatePreResultsUI(data) {
    if (!data || !data.data) {
      console.error('[Gazel] Invalid pre-results data structure:', data);
      return;
    }
    
    const preData = data.data;
    
    // Update scores
    updateScore('score-overall', preData['overall-score']);
    updateScore('score-audience', preData['audience-score']);
    updateScore('score-messaging', preData['messaging-score']);
    updateScore('score-credibility', preData['credibility-score']);
    updateScore('score-ux', preData['ux-score']);
    
    // Update score circles
    setTimeout(() => {
      createScoreCircles();
    }, 500);
  }
  
  // Function to update UI with full results data
  function updateFullResultsUI(data) {
    if (!data || !data.data) {
      console.error('[Gazel] Invalid full results data structure:', data);
      return;
    }
    
    const fullData = data.data;
    
    // Update scores
    updateScore('score-overall', fullData['overall-score']);
    updateScore('score-audience', fullData['audience-score']);
    updateScore('score-messaging', fullData['messaging-score']);
    updateScore('score-credibility', fullData['credibility-score']);
    updateScore('score-ux', fullData['ux-score']);
    
    // Update summaries
    updateElementContent('audience-summary', fullData['audience-summary']);
    updateElementContent('messaging-summary', fullData['messaging-summary']);
    updateElementContent('credibility-summary', fullData['credibility-summary']);
    updateElementContent('ux-summary', fullData['ux-summary']);
    
    // Update explanation points for each category
    updateExplanationPoints('audience', fullData['audience-explanation']);
    updateExplanationPoints('messaging', fullData['messaging-explanation']);
    updateExplanationPoints('credibility', fullData['credibility-explanation']);
    updateExplanationPoints('ux', fullData['ux-explanation']);
    
    // Update demographics if available
    if (fullData['audience-men'] && fullData['audience-women']) {
      updateElementContent('audience-men', fullData['audience-men'] + '%');
      updateElementContent('audience-women', fullData['audience-women'] + '%');
    }
    
    // Update age group - find the dominant age group
    if (fullData['audience-age_groups']) {
      const ageGroups = fullData['audience-age_groups'];
      let maxPercentage = 0;
      let dominantAgeGroup = '';
      
      for (const [ageRange, percentage] of Object.entries(ageGroups)) {
        if (percentage > maxPercentage) {
          maxPercentage = percentage;
          dominantAgeGroup = ageRange;
        }
      }
      
      updateElementContent('audience-age-group', dominantAgeGroup);
    }
    
    // Update social platforms
    if (fullData['audience-social_platforms']) {
      const platforms = fullData['audience-social_platforms'];
      updateElementContent('audience-facebook', platforms['Facebook'] + '%');
      updateElementContent('audience-instagram', platforms['Instagram'] + '%');
      updateElementContent('audience-x', platforms['x.com'] + '%');
      updateElementContent('audience-reddit', platforms['reddit'] + '%');
      updateElementContent('audience-linkedin', platforms['linkedin'] + '%');
      
      // Create social network ring visualization
      setTimeout(() => {
        createSocialNetworkRing(platforms);
      }, 500);
    }
    
    // Update score circles
    setTimeout(() => {
      createScoreCircles();
    }, 500);
  }
  
  // Function to activate the appropriate tab
  function activateTab(tabId) {
    // Find the tab link
    const tabLink = document.querySelector(`a[href="#${tabId}"]`);
    if (tabLink) {
      // Remove current class from all tabs
      document.querySelectorAll('.tab-wrapper').forEach(tab => {
        tab.classList.remove('w--current');
      });
      
      // Add current class to the selected tab
      tabLink.classList.add('w--current');
      
      // Show the corresponding section
      document.querySelectorAll('section').forEach(section => {
        section.style.display = section.id === tabId ? 'flex' : 'none';
      });
    }
  }
  
  // Update explanation points for each category
  function updateExplanationPoints(category, explanations) {
    if (!explanations || !Array.isArray(explanations)) return;
    
    // Update up to 3 points for each category
    for (let i = 0; i < Math.min(explanations.length, 3); i++) {
      const pointId = `${category}-p${i+1}`;
      updateElementContent(pointId, explanations[i]);
    }
  }
  
  // Add notification that data is simulated
  function addSimulatedDataNotice() {
    // Check if notice already exists
    if (document.querySelector('.simulated-data-notice')) {
      return;
    }
    
    // Create the notice element
    const notice = document.createElement('div');
    notice.className = 'simulated-data-notice';
    notice.style.position = 'fixed';
    notice.style.bottom = '20px';
    notice.style.right = '20px';
    notice.style.padding = '10px 15px';
    notice.style.background = '#FFF9E5';
    notice.style.border = '1px solid #FFD580';
    notice.style.borderRadius = '4px';
    notice.style.color = '#856404';
    notice.style.fontSize = '14px';
    notice.style.fontWeight = '500';
    notice.style.zIndex = '9999';
    notice.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    notice.textContent = 'Note: Using simulated data for demonstration';
    
    // Add to body
    document.body.appendChild(notice);
    
    console.log('[Gazel] Added simulated data notice to page');
    
    // Ensure the notice stays visible by re-checking later
    // (Some frameworks might remove dynamically added elements)
    setTimeout(() => {
      if (!document.querySelector('.simulated-data-notice')) {
        console.log('[Gazel] Notice was removed, adding it again');
        document.body.appendChild(notice.cloneNode(true));
      }
    }, 1000);
  }
  
  // Helper function to update element content if it exists
  function updateElementContent(elementId, content) {
    if (!elementId || content === undefined || content === null) return;
    
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = content;
    }
  }
  
  // Helper function to update score elements
  function updateScore(elementId, score) {
    if (!elementId || score === undefined || score === null) return;
    
    // Find all elements with the matching ID
    const elements = document.querySelectorAll('#' + elementId);
    if (!elements.length) return;
    
    // Format the score (round to nearest integer)
    const formattedScore = typeof score === 'number' ? Math.round(score) : 0;
    
    // Update all matching elements
    elements.forEach(element => {
      element.textContent = formattedScore;
    });
  }
  
  // Create simulated pre-results data for development/testing
  function createSimulatedPreResults() {
    // Generate random scores between 65-95
    const getRandomScore = () => Math.floor(Math.random() * 30) + 65;
    
    return {
      success: true,
      message: "Pre-results retrieved successfully (simulated)",
      data: {
        "overall-score": getRandomScore(),
        "audience-score": getRandomScore(),
        "messaging-score": getRandomScore(),
        "credibility-score": getRandomScore(),
        "ux-score": getRandomScore()
      }
    };
  }
  
  // Create simulated full results data for development/testing
  function createSimulatedFullResults() {
    // Generate random scores between 65-95
    const getRandomScore = () => Math.floor(Math.random() * 30) + 65;
    const getRandomPercentage = () => Math.floor(Math.random() * 60) + 20; // 20-80%
    
    return {
      success: true,
      message: "Full results retrieved successfully (simulated)",
      data: {
        "overall-score": getRandomScore(),
        "audience-score": getRandomScore(),
        "audience-summary": "Your site effectively targets your audience but could be more specific to industry verticals.",
        "audience-explanation": [
          "Demographics show male visitors aged 25-34 dominate your audience, matching your B2B SaaS focus.",
          "Social traffic primarily comes from LinkedIn (35%) and X (28%), indicating good professional network engagement.",
          "Your hero section could more clearly speak to specific industry pain points rather than using generic language."
        ],
        "audience-executive_summary": "Unfold.co shows technical competence but struggles with clear value communication and trust-building elements, limiting its appeal to cautious enterprise clients.",
        "audience-women": getRandomPercentage(),
        "audience-men": 100 - getRandomPercentage(), // Ensures male + female = 100%
        "audience-age_groups": {
          "18-24": Math.floor(Math.random() * 25),
          "25-34": Math.floor(Math.random() * 40),
          "35-44": Math.floor(Math.random() * 30),
          "45+": Math.floor(Math.random() * 25)
        },
        "audience-social_platforms": {
          "Facebook": getRandomPercentage(),
          "Instagram": getRandomPercentage(),
          "x.com": getRandomPercentage(),
          "reddit": getRandomPercentage(),
          "linkedin": getRandomPercentage()
        },
        "biggest_pain_point": "Lack of immediate trust signals and clear value proposition.",
        "messaging-score": getRandomScore(),
        "messaging-summary": "Clear primary value proposition with opportunity to strengthen feature-to-benefit connections.",
        "messaging-explanation": [
          "Your headline clearly communicates the core problem you solve, though secondary headlines sometimes focus on features rather than outcomes.",
          "Case studies effectively demonstrate real-world results, but pricing page lacks sufficient social proof elements.",
          "Product screenshots effectively showcase functionality, but could better highlight specific use cases."
        ],
        "credibility-score": getRandomScore(),
        "credibility-summary": "Strong social proof with customer logos and testimonials, but technical credibility could be enhanced.",
        "credibility-explanation": [
          "Client logos from recognized brands build immediate trust, particularly in the enterprise sector.",
          "Customer testimonials include good quantifiable results, but could feature more diverse industry representation.",
          "Security badges and certifications appear below the fold rather than prominently in signup flows."
        ],
        "ux-score": getRandomScore(),
        "ux-summary": "Clean navigation and visual hierarchy, with some mobile optimization opportunities.",
        "ux-explanation": [
          "Desktop experience features intuitive navigation and clear CTAs with proper visual hierarchy.",
          "Mobile menu requires optimization as dropdown items are difficult to tap accurately on smaller screens.",
          "Form fields lack inline validation which creates friction in signup and contact forms."
        ]
      }
    };
  }
  
  // Function to update URL display on loading page
  function updateUrlDisplay(url) {
    // Find all elements with ID 'url-text'
    const urlTextElements = document.querySelectorAll('#url-text');
    
    if (urlTextElements.length > 0) {
      // Update all instances of url-text elements
      urlTextElements.forEach(element => {
        element.textContent = url;
      });
      
      console.log('[Gazel] Updated URL display elements');
    } else {
      console.log('[Gazel] No URL text elements found, searching for templates');
      
      // Fallback: Search for elements containing {url} template
      document.querySelectorAll('*').forEach(el => {
        if (el.childNodes && el.childNodes.length > 0) {
          el.childNodes.forEach(node => {
            if (node.nodeType === 3 && node.textContent && node.textContent.includes('{url}')) {
              node.textContent = node.textContent.replace('{url}', url);
            }
          });
        }
      });
    }
  }
  
  // Function to create score circles visualization
  function createScoreCircles() {
    // Try to find all score circles
    const circleIds = ['audience-circle', 'messaging-circle', 'credibility-circle', 'ux-circle'];
    
    // Get stored data
    let scores = {};
    let fullResultsData;
    let preResultsData;
    
    try {
      fullResultsData = JSON.parse(sessionStorage.getItem('fullResultsData'))?.data;
    } catch (e) {
      console.error('[Gazel] Error parsing full results data:', e);
    }
    
    try {
      preResultsData = JSON.parse(sessionStorage.getItem('preResultsData'))?.data;
    } catch (e) {
      console.error('[Gazel] Error parsing pre-results data:', e);
    }
    
    // Use the available data
    if (fullResultsData) {
      scores = {
        'audience': fullResultsData['audience-score'],
        'messaging': fullResultsData['messaging-score'],
        'credibility': fullResultsData['credibility-score'],
        'ux': fullResultsData['ux-score'],
        'overall': fullResultsData['overall-score']
      };
    } else if (preResultsData) {
      scores = {
        'audience': preResultsData['audience-score'],
        'messaging': preResultsData['messaging-score'],
        'credibility': preResultsData['credibility-score'],
        'ux': preResultsData['ux-score'],
        'overall': preResultsData['overall-score']
      };
    } else {
      // Default values if no data available
      scores = {
        'audience': 70,
        'messaging': 65,
        'credibility': 80,
        'ux': 75,
        'overall': 72
      };
    }
    
    // Try to find circles by ID first
    circleIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        const type = id.split('-')[0]; // Extract type from ID
        createScoreCircleSVG(element, type, scores[type]);
      }
    });
    
    // Also add overall circle if it exists
    const overallCircle = document.getElementById('overall-circle');
    if (overallCircle) {
      createScoreCircleSVG(overallCircle, 'overall', scores['overall']);
    }
    
    // Try class-based approach as fallback
    const resultCircles = document.querySelectorAll('.results-circle');
    resultCircles.forEach(circle => {
      // Skip if already processed
      if (circle.querySelector('svg.score-circle-svg')) return;
      
      // Try to determine which type this is
      let type = determineCircleType(circle);
      if (!type) return;
      
      createScoreCircleSVG(circle, type, scores[type]);
    });
  }
  
  // Helper function to determine circle type
  function determineCircleType(circle) {
    // Check circle's own ID first
    if (circle.id) {
      const id = circle.id.toLowerCase();
      if (id.includes('audience')) return 'audience';
      if (id.includes('messaging')) return 'messaging';
      if (id.includes('credibility')) return 'credibility';
      if (id.includes('ux')) return 'ux';
      if (id.includes('overall')) return 'overall';
    }
    
    // Check circle's classes
    if (circle.classList) {
      const classList = Array.from(circle.classList);
      if (classList.includes('audience-circle')) return 'audience';
      if (classList.includes('messaging-circle')) return 'messaging';
      if (classList.includes('credibility-circle')) return 'credibility';
      if (classList.includes('ux-circle')) return 'ux';
      if (classList.includes('overall-circle')) return 'overall';
    }
    
    // Check parent elements for category hints
    let parent = circle.parentElement;
    while (parent && parent.tagName !== 'BODY') {
      const text = parent.textContent.toLowerCase();
      if (text.includes('target audience')) return 'audience';
      if (text.includes('messaging')) return 'messaging';
      if (text.includes('credibility')) return 'credibility';
      if (text.includes('user experience') || text.includes('ux')) return 'ux';
      if (text.includes('overall score')) return 'overall';
      parent = parent.parentElement;
    }
    
    // If no type detected, look at circle's position
    const allCircles = Array.from(document.querySelectorAll('.results-circle'));
    const index = allCircles.indexOf(circle);
    
    // Based on position, assign a type
    if (index === 0) return 'audience';
    if (index === 1) return 'messaging';
    if (index === 2) return 'credibility';
    if (index === 3) return 'ux';
    if (index === 4) return 'overall';
    
    return null;
  }
  
  // Create score circle SVG
  function createScoreCircleSVG(circle, type, score) {
    // Skip if already processed
    if (circle.querySelector('svg.score-circle-svg')) return;
    
    // Compute dimensions
    const width = circle.offsetWidth || 200;
    const height = circle.offsetHeight || 200;
    
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'score-circle-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.transform = 'rotate(-90deg)';
    
    // Make absolutely sure the SVG is on top
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.zIndex = '10';
    svg.style.pointerEvents = 'none';
    
    // Calculate dimensions
    const centerX = width / 2;
    const centerY = height / 2;
    const strokeWidth = 12; // Exactly 12px as specified
    const radius = (Math.min(width, height) / 2) - (strokeWidth / 2); // Adjust for stroke width
    
    // Create the circle path
    const gradientCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    gradientCircle.setAttribute('cx', centerX);
    gradientCircle.setAttribute('cy', centerY);
    gradientCircle.setAttribute('r', radius);
    gradientCircle.setAttribute('fill', 'none');
    gradientCircle.setAttribute('stroke', `url(#gradient-${type})`);
    gradientCircle.setAttribute('stroke-width', strokeWidth);
    gradientCircle.setAttribute('stroke-linecap', 'round');
    
    // Calculate the circle progress
    const circumference = 2 * Math.PI * radius;
    gradientCircle.setAttribute('stroke-dasharray', circumference);
    
    // Set initial dashoffset to full circumference (empty circle)
    gradientCircle.setAttribute('stroke-dashoffset', circumference);
    
    // Add the circle to SVG
    svg.appendChild(gradientCircle);
    
    // Add SVG to circle
    circle.appendChild(svg);
    
    // Animate the circle filling in
    setTimeout(() => {
      // Calculate the final dash offset
      const finalDashOffset = circumference * (1 - score / 100);
      
      // Add transition for smooth animation
      gradientCircle.style.transition = `stroke-dashoffset 1500ms ease-out`;
      
      // Trigger animation by setting the final dash offset
      setTimeout(() => {
        gradientCircle.setAttribute('stroke-dashoffset', finalDashOffset);
      }, 50);
    }, 100);
  }
  
  // Create the social network ring visualization
  function createSocialNetworkRing(platformData) {
    // Find the social circle
    const socialCircle = document.querySelector('.social-circle');
    if (!socialCircle) return;
    
    // Remove any existing SVGs to avoid duplication
    const existingSvgs = socialCircle.querySelectorAll('svg.social-circle-svg');
    existingSvgs.forEach(existingSvg => existingSvg.remove());
    
    // Convert platform data to the expected format
    const socialNetworkData = {
      'facebook': platformData['Facebook'] || 0,
      'instagram': platformData['Instagram'] || 0,
      'x': platformData['x.com'] || 0,
      'linkedin': platformData['linkedin'] || 0,
      'reddit': platformData['reddit'] || 0
    };
    
    // Compute dimensions
    const width = socialCircle.offsetWidth || 200;
    const height = socialCircle.offsetHeight || 200;
    
    // Create SVG element with very high z-index
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'social-circle-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    
    // Make absolutely sure the SVG is on top
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.zIndex = '10';
    svg.style.pointerEvents = 'none';
    
    // Calculate dimensions
    const centerX = width / 2;
    const centerY = height / 2;
    const strokeWidth = width * 0.12; // Make it proportional to the circle size
    const radius = (Math.min(width, height) / 2) - (strokeWidth / 2); // Adjust for stroke width
    
    // Create a group for the donut chart
    const donutGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(donutGroup);
    
    // Start angle at top (negative Y axis, which is -90 degrees in SVG)
    let startAngle = -90;
    const networks = ['facebook', 'instagram', 'x', 'linkedin', 'reddit'];
    const colors = {
      'facebook': 'url(#gradient-facebook)', // Use gradient if available
      'instagram': 'url(#gradient-instagram)',
      'x': 'url(#gradient-x)',
      'linkedin': 'url(#gradient-linkedin)',
      'reddit': 'url(#gradient-reddit)',
      // Fallback solid colors if gradients aren't available
      'facebook-solid': '#1877F2',
      'instagram-solid': '#E1306C',
      'x-solid': '#000000',
      'linkedin-solid': '#0077B5',
      'reddit-solid': '#FF4500'
    };
    
    // Function to check if a gradient exists
    function gradientExists(id) {
      return document.getElementById(id) !== null;
    }
    
    // Create paths for each segment
    const paths = [];
    networks.forEach(network => {
      if (socialNetworkData[network] > 0) {
        // Determine color to use (gradient or solid)
        const gradientId = `gradient-${network}`;
        const color = gradientExists(gradientId) ? 
                      colors[network] : 
                      colors[`${network}-solid`];
        
        // Create the donut segment
        const path = createDonutSegment(
          centerX, 
          centerY, 
          radius, 
          strokeWidth, 
          startAngle, 
          startAngle + (socialNetworkData[network] / 100) * 360,
          color
        );
        
        // Add to our group
        donutGroup.appendChild(path);
        paths.push(path);
        
        // Update the start angle for the next segment
        startAngle += (socialNetworkData[network] / 100) * 360;
      }
    });
    
    // Add SVG to social circle
    socialCircle.appendChild(svg);
    
    // Animate the segments appearing
    // Hide segments initially
    paths.forEach(path => {
      path.style.opacity = '0';
    });
    
    // Animate them appearing one after another
    setTimeout(() => {
      paths.forEach((path, index) => {
        setTimeout(() => {
          path.style.transition = 'opacity 0.5s ease-in';
          path.style.opacity = '1';
        }, index * 200); // Stagger each segment's appearance
      });
    }, 100);
  }
  
  // Helper function to create a donut segment
  function createDonutSegment(cx, cy, radius, thickness, startAngle, endAngle, fill) {
    // Convert angles from degrees to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    // Calculate the inner and outer radii for the donut
    const innerRadius = radius - thickness / 2;
    const outerRadius = radius + thickness / 2;
    
    // Calculate the four points needed for the donut segment
    const startOuterX = cx + outerRadius * Math.cos(startRad);
    const startOuterY = cy + outerRadius * Math.sin(startRad);
    const endOuterX = cx + outerRadius * Math.cos(endRad);
    const endOuterY = cy + outerRadius * Math.sin(endRad);
    const startInnerX = cx + innerRadius * Math.cos(startRad);
    const startInnerY = cy + innerRadius * Math.sin(startRad);
    const endInnerX = cx + innerRadius * Math.cos(endRad);
    const endInnerY = cy + innerRadius * Math.sin(endRad);
    
    // Determine which arc to use (large or small)
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    // Create the SVG path for a donut segment
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Create the path data
    const d = [
      `M ${startOuterX} ${startOuterY}`, // Move to start of outer arc
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuterX} ${endOuterY}`, // Outer arc
      `L ${endInnerX} ${endInnerY}`, // Line to inner arc end
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInnerX} ${startInnerY}`, // Inner arc (counter-clockwise)
      'Z' // Close path
    ].join(' ');
    
    path.setAttribute('d', d);
    path.setAttribute('fill', fill);
    path.setAttribute('stroke', 'none');
    
    return path;
  }
  
  // Function to create and add spinner animation to loading page
  function createAndAddSpinner() {
    console.log('[Gazel] Creating spinner animation');
    
    // Check if spinner already exists
    if (document.querySelector('.gazel-spinner')) {
      console.log('[Gazel] Spinner already exists, skipping creation');
      return;
    }
    
    // Create spinner element
    const spinner = document.createElement('div');
    spinner.className = 'gazel-spinner';
    spinner.style.display = 'block';
    spinner.style.margin = '20px auto';
    
    // Add spinner HTML
    spinner.innerHTML = `
      <div class="clock-spinner">
        <div class="clock-spinner-line" style="transform: rotate(0deg)"></div>
        <div class="clock-spinner-line" style="transform: rotate(45deg)"></div>
        <div class="clock-spinner-line" style="transform: rotate(90deg)"></div>
        <div class="clock-spinner-line" style="transform: rotate(135deg)"></div>
        <div class="clock-spinner-line" style="transform: rotate(180deg)"></div>
        <div class="clock-spinner-line" style="transform: rotate(225deg)"></div>
        <div class="clock-spinner-line" style="transform: rotate(270deg)"></div>
        <div class="clock-spinner-line" style="transform: rotate(315deg)"></div>
      </div>
    `;
    
    // Add spinner CSS
    if (!document.getElementById('gazel-spinner-styles')) {
      const style = document.createElement('style');
      style.id = 'gazel-spinner-styles';
      style.textContent = `
        .gazel-spinner {
          text-align: center;
          padding: 20px;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 9999;
        }
        .clock-spinner {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto;
        }
        .clock-spinner-line {
          position: absolute;
          width: 4px;
          height: 20px;
          background-color: #3C3C3C;
          top: 8px;
          left: 50%;
          margin-left: -2px;
          transform-origin: center 32px;
          opacity: 0.2;
          animation: clock-fade 0.8s linear infinite;
        }
        .clock-spinner-line:nth-child(1) { animation-delay: 0s; }
        .clock-spinner-line:nth-child(2) { animation-delay: 0.1s; }
        .clock-spinner-line:nth-child(3) { animation-delay: 0.2s; }
        .clock-spinner-line:nth-child(4) { animation-delay: 0.3s; }
        .clock-spinner-line:nth-child(5) { animation-delay: 0.4s; }
        .clock-spinner-line:nth-child(6) { animation-delay: 0.5s; }
        .clock-spinner-line:nth-child(7) { animation-delay: 0.6s; }
        .clock-spinner-line:nth-child(8) { animation-delay: 0.7s; }
        @keyframes clock-fade {
          0%, 12.5%, 100% { opacity: 0.2; }
          6.25% { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Add spinner to loading-wrap element (or fallback containers)
    const loadingWrap = document.querySelector('.loading-wrap');
    
    if (loadingWrap) {
      loadingWrap.appendChild(spinner);
      console.log('[Gazel] Added spinner to loading-wrap');
    } else {
      // Try alternate containers
      const possibleContainers = [
        document.querySelector('.loading-container'),
        document.querySelector('main'),
        document.querySelector('.main-content'),
        document.querySelector('.section'),
        document.querySelector('.container'),
        document.body
      ];
      
      let spinnerAdded = false;
      
      for (const container of possibleContainers) {
        if (container) {
          container.appendChild(spinner);
          console.log('[Gazel] Added spinner to fallback container:', container);
          spinnerAdded = true;
          break;
        }
      }
      
      // Last resort - add directly to body with fixed positioning
      if (!spinnerAdded) {
        document.body.appendChild(spinner);
        spinner.style.position = 'fixed';
        spinner.style.top = '50%';
        spinner.style.left = '50%';
        spinner.style.transform = 'translate(-50%, -50%)';
        console.log('[Gazel] Added spinner directly to body');
      }
    }
  }
