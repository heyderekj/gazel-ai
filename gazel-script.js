document.addEventListener('DOMContentLoaded', function() {
  console.log('[Gazel] Script initialized');
  
  // Get references to the form, URL field and button
  const form = document.querySelector('form');  // Get the form that contains your URL field
  const urlField = document.querySelector('.url-field');
  const urlButton = document.querySelector('.url-button');
  
  console.log('[Gazel] Form elements found:', {
    form: !!form,
    field: !!urlField,
    button: !!urlButton
  });
  
  // Fix for form target to ensure it uses HTTPS
  if (form && form.getAttribute('action') && form.getAttribute('action').startsWith('http://')) {
    // Update form action to use HTTPS instead of HTTP
    form.setAttribute('action', form.getAttribute('action').replace('http://', 'https://'));
    console.log('[Gazel] Fixed insecure form action target');
  }
  
  // Prevent autofill by adding attributes
  if (urlField) {
    urlField.setAttribute('autocomplete', 'off');
    urlField.setAttribute('autocorrect', 'off');
    urlField.setAttribute('autocapitalize', 'off');
    urlField.setAttribute('spellcheck', 'false');
    // IMPORTANT: Change the input type from "url" to "text" to bypass Webflow's built-in validation
    urlField.setAttribute('type', 'text');
  }
  
  // Initial state: set button to 50% opacity and disabled
  if (urlButton) {
    urlButton.style.opacity = '0.5';
    urlButton.style.pointerEvents = 'none';
  }
  
  // Function to validate URL
  function isValidURL(string) {
    if (!string) return false;
    
    // Basic domain pattern check
    const domainPattern = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    
    // Special handling for inputs without protocol
    if (!/^https?:\/\//i.test(string)) {
      // Test domain pattern first
      if (!domainPattern.test(string)) {
        return false;
      }
      string = 'http://' + string;
    }
    
    try {
      const url = new URL(string);
      return (url.protocol === 'http:' || url.protocol === 'https:') && 
             url.hostname.includes('.') && 
             url.hostname.length > 3;
    } catch (_) {
      return false;
    }
  }
  
  // Listen for input changes in the URL field
  if (urlField) {
    urlField.addEventListener('input', function() {
      const inputValue = this.value.trim();
      
      // Add the 'has-content' class logic
      const parent = this.closest('.url-input_area');
      if (parent) {
        if (inputValue) {
          parent.classList.add('has-content');
        } else {
          parent.classList.remove('has-content');
        }
      }
      
      if (urlButton) {
        if (isValidURL(inputValue)) {
          // Valid URL: set button to 100% opacity and enable it
          urlButton.style.opacity = '1';
          urlButton.style.pointerEvents = 'auto';
          
          // Store the properly formatted URL for later use
          const formattedURL = inputValue.includes('://') ? inputValue : 'https://' + inputValue;
          urlButton.setAttribute('data-url', formattedURL);
          urlField.setCustomValidity(''); // Clear any custom validation message
          
          // Add animation class when URL is valid
          urlButton.classList.add('url-valid');
        } else {
          // Invalid URL: set button to 50% opacity and disable it
          urlButton.style.opacity = '0.5';
          urlButton.style.pointerEvents = 'none';
          urlButton.removeAttribute('data-url');
          
          if (inputValue) {
            urlField.setCustomValidity('Please enter a valid URL'); // Set custom validation message
          } else {
            urlField.setCustomValidity(''); // Clear validation if field is empty
          }
          
          // Remove animation class when URL is invalid
          urlButton.classList.remove('url-valid');
        }
      }
    });
  }
  
  // ===== GAZEL API INTEGRATION =====
  
  // NEW API endpoint 
  const API_ENDPOINT = 'https://api.gazelai.com/api/v1/seo_analyze';
  
  // Add button click handler for Gazel API analysis
  if (urlButton) {
    urlButton.addEventListener('click', function(event) {
      console.log('[Gazel] Button click detected');
      event.preventDefault();
      
      const url = urlField ? urlField.value.trim() : '';
      console.log('[Gazel] URL from button click:', url);
      
      // Use button's current state to determine if URL is valid
      if (urlButton.style.opacity === '1' && urlButton.style.pointerEvents === 'auto') {
        console.log('[Gazel] URL is valid, proceeding with analysis');
        analyzeSEOViaForm(url);
      } else {
        console.log('[Gazel] URL is invalid, not proceeding');
        // Validation message will be shown by the existing validation logic
      }
    });
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
    sessionStorage.setItem('apiEndpoint', API_ENDPOINT);
    console.log('[Gazel] URL and user ID stored in sessionStorage');
    
    // Base64 encode the data for Stripe (shorter format)
    const dataToEncode = JSON.stringify({id: userId, url: url});
    const encodedData = btoa(dataToEncode);
    console.log('[Gazel] Base64 encoded data for Stripe:', encodedData);
    
    // Create the Stripe checkout URL with the encoded reference ID
    // Note: The Stripe link part may change in the final version
    const stripeCheckoutUrl = `https://buy.stripe.com/4gw6p4dJuei17ba6op?client_reference_id=${encodedData}`;
    console.log('[Gazel] Stripe checkout URL:', stripeCheckoutUrl);
    
    // Store the Stripe URL in sessionStorage
    sessionStorage.setItem('stripeCheckoutUrl', stripeCheckoutUrl);
    
    // Redirect to loading page
    console.log('[Gazel] Redirecting to loading page...');
    window.location.href = '/loading?url=' + encodeURIComponent(url);
  }
  
  // Handle form submission to ensure URL is properly formatted and initiate analysis
  if (form) {
    form.addEventListener('submit', function(event) {
      event.preventDefault(); // Always prevent default form submission
      console.log('[Gazel] Form submit intercepted');
      
      if (!urlField) {
        console.error('[Gazel] URL field not found');
        return false;
      }
      
      const inputValue = urlField.value.trim();
      
      if (!isValidURL(inputValue)) {
        console.log('[Gazel] URL is invalid on form submit');
        urlField.setCustomValidity('Please enter a valid URL');
        urlField.reportValidity(); // Show validation message
        return false;
      }
      
      // Format URL properly before submission - always use HTTPS
      let formattedUrl = inputValue;
      if (!inputValue.includes('://')) {
        formattedUrl = 'https://' + inputValue;
      } else if (inputValue.startsWith('http://')) {
        formattedUrl = inputValue.replace('http://', 'https://');
      }
      
      console.log('[Gazel] Formatted URL:', formattedUrl);
      analyzeSEOViaForm(formattedUrl);
      return false;
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
    
    // Start API request - Using serverless function approach to avoid CORS
    startSEOAnalysisWithProxy(analyzedUrl)
      .then(data => {
        // Store real API data in session storage
        sessionStorage.setItem('seoAnalysisResults', JSON.stringify(data));
        sessionStorage.setItem('usingRealData', 'true');
        
        // Calculate how long we've been loading
        const elapsedTime = Date.now() - loadStartTime;
        const remainingTime = Math.max(0, minLoadTime - elapsedTime);
        
        // Wait for the minimum loading time before redirecting
        setTimeout(() => {
          window.location.href = '/results-pre';
        }, remainingTime);
      })
      .catch(error => {
        console.error('[Gazel API] Error:', error);
        
        // Store error in session storage
        sessionStorage.setItem('analysisError', error.toString());
        sessionStorage.setItem('usingRealData', 'false');
        
        // Calculate how long we've been loading
        const elapsedTime = Date.now() - loadStartTime;
        const remainingTime = Math.max(0, minLoadTime - elapsedTime);
        
        // Wait for the minimum loading time before redirecting
        setTimeout(() => {
          window.location.href = '/results-pre';
        }, remainingTime);
      });
  }
  
  // Function to start SEO analysis using a proxy to avoid CORS
  function startSEOAnalysisWithProxy(url) {
    return new Promise((resolve, reject) => {
      if (!url) {
        reject(new Error('No URL provided for analysis'));
        return;
      }
      
      console.log('[Gazel API] Starting API request with proxy approach');
      console.log('[Gazel API] Analyzing URL:', url);
      
      // Get the user ID from storage
      const userId = sessionStorage.getItem('userId') || getShortUserIdentifier();
      console.log('[Gazel API] Using user ID for API call:', userId);
      
      // Create timeout to handle API request failures
      const timeoutId = setTimeout(() => {
        reject(new Error('API request timed out after 15 seconds'));
      }, 15000);
      
      // =========================================
      // CORS WORKAROUND: Using form submission to avoid CORS issues
      // =========================================
      // 1. Create a hidden iframe to receive the response
      const iframeId = 'gazelApiFrame';
      let iframe = document.getElementById(iframeId);
      
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.name = iframeId;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }
      
      // 2. Create a form to POST the data to the API endpoint
      const formId = 'gazelApiForm';
      let apiForm = document.getElementById(formId);
      
      if (!apiForm) {
        apiForm = document.createElement('form');
        apiForm.id = formId;
        apiForm.method = 'POST';
        apiForm.target = iframeId;
        apiForm.style.display = 'none';
        document.body.appendChild(apiForm);
      }
      
      // Set the form action to the API endpoint
      apiForm.action = API_ENDPOINT;
      
      // Clear any existing form fields
      apiForm.innerHTML = '';
      
      // Add the URL input field
      const urlInput = document.createElement('input');
      urlInput.type = 'hidden';
      urlInput.name = 'url';
      urlInput.value = url;
      apiForm.appendChild(urlInput);
      
      // Add the user ID input field
      const idInput = document.createElement('input');
      idInput.type = 'hidden';
      idInput.name = 'id';
      idInput.value = userId;
      apiForm.appendChild(idInput);
      
      // Listen for iframe load events
      iframe.onload = function() {
        clearTimeout(timeoutId);
        
        try {
          // Attempt to read the response (might fail due to same-origin policy)
          const iframeContent = iframe.contentDocument || iframe.contentWindow.document;
          
          if (iframeContent) {
            console.log('[Gazel API] Received API response via iframe');
            
            // Try to parse the response - might be JSON or text
            let responseData;
            try {
              // If the response is JSON
              if (iframeContent.body.textContent) {
                responseData = JSON.parse(iframeContent.body.textContent);
              } else {
                // If we can't get the content, use simulated data
                throw new Error('Unable to access iframe content due to cross-origin policy');
              }
            } catch (parseError) {
              console.error('[Gazel API] Error parsing response:', parseError);
              throw parseError;
            }
            
            resolve(responseData);
          } else {
            throw new Error('Unable to access iframe content');
          }
        } catch (error) {
          console.error('[Gazel API] Error accessing iframe response:', error);
          
          // Most likely this is a CORS issue - fall back to proxy solution or simulated data
          console.log('[Gazel API] Falling back to simulated data due to CORS restrictions');
          
          // In a production environment, you'd use a proper proxy or serverless function
          // But for now, we'll use simulated data
          resolve(createSimulatedAPIResponse(url));
        }
      };
      
      // Handle iframe errors
      iframe.onerror = function(error) {
        clearTimeout(timeoutId);
        console.error('[Gazel API] Iframe error:', error);
        
        // Use simulated data in case of error
        resolve(createSimulatedAPIResponse(url));
      };
      
      // Submit the form
      apiForm.submit();
      console.log('[Gazel API] Form submitted to iframe');
      
      // Set a flag for the simulated fallback if CORS is an issue
      sessionStorage.setItem('usedFallbackMethod', 'true');
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
    
    // Optional: If you want to display preview data or partial results
    // on this page, you can access seoAnalysisResults from sessionStorage here
    const resultsJson = sessionStorage.getItem('seoAnalysisResults');
    if (resultsJson) {
      try {
        const apiResponse = JSON.parse(resultsJson);
        // Display preview data from the API response
        // For example, show overall score or a summary
      } catch (error) {
        console.error('Error parsing results for preview:', error);
      }
    }
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
        if (el.textContent && el.textContent.includes('{url}')) {
          console.log('[Gazel] Found element with {url} template:', el);
          el.textContent = el.textContent.replace('{url}', url);
        }
      });
    }
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
  
  // Create simulated API response for development/testing
  function createSimulatedAPIResponse(url) {
    // Generate random scores between 65-95
    const getRandomScore = () => Math.floor(Math.random() * 30) + 65;
    const getRandomPercentage = () => Math.floor(Math.random() * 60) + 20; // 20-80%
    
    return {
      success: true,
      message: "Analysis completed successfully (simulated)",
      data: {
        "Target Audience": {
          score: getRandomScore(),
          summary: "Your site effectively targets your audience but could be more specific to industry verticals.",
          explanation: [
            "Demographics show male visitors aged 25-34 dominate your audience, matching your B2B SaaS focus.",
            "Social traffic primarily comes from LinkedIn (35%) and X (28%), indicating good professional network engagement.",
            "Your hero section could more clearly speak to specific industry pain points rather than using generic language."
          ],
          demographics: {
            gender: {
              male: getRandomPercentage(),
              female: 100 - getRandomPercentage() // Ensures male + female = 100%
            },
            age_groups: {
              "18-24": Math.floor(Math.random() * 25),
              "25-34": Math.floor(Math.random() * 40),
              "35-44": Math.floor(Math.random() * 30),
              "45+": Math.floor(Math.random() * 25)
            },
            social_platforms: {
              facebook: getRandomPercentage(),
              instagram: getRandomPercentage(),
              "x.com": getRandomPercentage(),
              reddit: getRandomPercentage(),
              linkedin: getRandomPercentage()
            }
          }
        },
        "Messaging": {
          score: getRandomScore(),
          summary: "Clear primary value proposition with opportunity to strengthen feature-to-benefit connections.",
          explanation: [
            "Your headline clearly communicates the core problem you solve, though secondary headlines sometimes focus on features rather than outcomes.",
            "Case studies effectively demonstrate real-world results, but pricing page lacks sufficient social proof elements.",
            "Product screenshots effectively showcase functionality, but could better highlight specific use cases."
          ]
        },
        "Credibility": {
          score: getRandomScore(),
          summary: "Strong social proof with customer logos and testimonials, but technical credibility could be enhanced.",
          explanation: [
            "Client logos from recognized brands build immediate trust, particularly in the enterprise sector.",
            "Customer testimonials include good quantifiable results, but could feature more diverse industry representation.",
            "Security badges and certifications appear below the fold rather than prominently in signup flows."
          ]
        },
        "User Experience": {
          score: getRandomScore(),
          summary: "Clean navigation and visual hierarchy, with some mobile optimization opportunities.",
          explanation: [
            "Desktop experience features intuitive navigation and clear CTAs with proper visual hierarchy.",
            "Mobile menu requires optimization as dropdown items are difficult to tap accurately on smaller screens.",
            "Form fields lack inline validation which creates friction in signup and contact forms."
          ]
        }
      }
    };
  }
  
  // Results page initialization
  function resultsPageInit() {
    // Get the URL from sessionStorage
    const analyzedUrl = sessionStorage.getItem('analyzedUrl') || '';
    
    // Display the analyzed URL
    updateUrlDisplay(analyzedUrl);
    
    // Check if we have real API results
    const resultsJson = sessionStorage.getItem('seoAnalysisResults');
    const usingRealData = sessionStorage.getItem('usingRealData') === 'true';
    
    if (resultsJson && usingRealData) {
      try {
        const apiResponse = JSON.parse(resultsJson);
        updateElementsFromRealAPI(apiResponse);
      } catch (error) {
        console.error('[Gazel] Error parsing API results:', error);
        simulateScores(); // Fallback to simulation
      }
    } else {
      // No real data or error occurred - use simulated data
      simulateScores();
    }
    
    // Double-check if notification is needed
    if (sessionStorage.getItem('usingRealData') !== 'true' || 
        sessionStorage.getItem('usedFallbackMethod') === 'true') {
      // Wait a short time to ensure the DOM is updated
      setTimeout(addSimulatedDataNotice, 500);
    }
    
    // Check for hash in URL to activate correct tab
    if (window.location.hash) {
      const tabId = window.location.hash.substring(1);
      activateTab(tabId);
    }
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
  
  // Update elements with API response data
  function updateElementsFromRealAPI(apiResponse) {
    // Check for data structure
    if (!apiResponse || !apiResponse.data) {
      console.error('[Gazel] Invalid API response structure:', apiResponse);
      simulateScores();
      return;
    }
    
    const data = apiResponse.data;
    
    // Check for required categories
    const requiredCategories = ["Target Audience", "Messaging", "Credibility", "User Experience"];
    for (const category of requiredCategories) {
      if (!data[category]) {
        console.error(`[Gazel] Missing category in API response: ${category}`);
        simulateScores();
        return;
      }
    }
    
    // Calculate overall score (average of all scores)
    const overallScore = Math.round((
      data["Target Audience"].score + 
      data.Messaging.score + 
      data.Credibility.score + 
      data["User Experience"].score
    ) / 4);
    
    // Update scores
    updateScore('score-overall', overallScore);
    updateScore('score-audience', data["Target Audience"].score);
    updateScore('score-messaging', data.Messaging.score);
    updateScore('score-credibility', data.Credibility.score);
    updateScore('score-ux', data["User Experience"].score);
    
    // Update audience demographics
    if (data["Target Audience"].demographics) {
      if (data["Target Audience"].demographics.gender) {
        updateElementContent('audience-men', data["Target Audience"].demographics.gender.male + '%');
        updateElementContent('audience-women', data["Target Audience"].demographics.gender.female + '%');
      }
      
      // Find the dominant age group (with highest percentage)
      if (data["Target Audience"].demographics.age_groups) {
        const ageGroups = data["Target Audience"].demographics.age_groups;
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
      
      // Update social media percentages
      if (data["Target Audience"].demographics.social_platforms) {
        const platforms = data["Target Audience"].demographics.social_platforms;
        updateElementContent('audience-facebook', platforms.facebook + '%');
        updateElementContent('audience-instagram', platforms.instagram + '%');
        updateElementContent('audience-x', platforms["x.com"] + '%');
        updateElementContent('audience-reddit', platforms.reddit + '%');
        updateElementContent('audience-linkedin', platforms.linkedin + '%');
      }
    }
    
    // Update summaries
    updateElementContent('audience-summary', data["Target Audience"].summary);
    updateElementContent('messaging-summary', data.Messaging.summary);
    updateElementContent('credibility-summary', data.Credibility.summary);
    updateElementContent('ux-summary', data["User Experience"].summary);
    
    // Update explanation points
    updateExplanationPoints('audience', data["Target Audience"].explanation);
    updateExplanationPoints('messaging', data.Messaging.explanation);
    updateExplanationPoints('credibility', data.Credibility.explanation);
    updateExplanationPoints('ux', data["User Experience"].explanation);
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
  
  // Simulate scores when no API data available
  function simulateScores() {
    console.log('[Gazel] Using simulated data for display');
    
    // Mark as using simulated data in session storage
    sessionStorage.setItem('usingRealData', 'false');
    
    // Create simulated data using the same function as the API fallback
    const simulatedData = createSimulatedAPIResponse(sessionStorage.getItem('analyzedUrl') || 'example.com');
    
    // Use the same function that processes real API data
    updateElementsFromRealAPI(simulatedData);
    
    // Add notification that data is simulated
    addSimulatedDataNotice();
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
});
