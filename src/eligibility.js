/**
 * TV-Insight HbbTV Tracking Script - Sampler Eligibility
 * ES3 compliant for HbbTV 1.1 devices
 *
 * The sampler loads this for a device that is not in the sample, so tracking is not running.
 * It reads the device ID tracking stored on an earlier load, from where tracking keeps it, and
 * hands it to the sampler, which checks it against its list of eligible devices. Without one it
 * hands over '', so the sampler need not ask again: a device tracking never ran on cannot be on
 * the list. It never creates a device ID.
 */
(function () {
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Check if localStorage is available
   */
  function isLocalStorageAvailable() {
    try {
      if (!window.localStorage) return false;
      var testKey = '_tvi_test';
      var testValue = '1';
      localStorage.setItem(testKey, testValue);
      var retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return retrieved === testValue;
    } catch (e) {
      return false;
    }
  }

  /**
   * Detect if device supports iframe mode
   */
  function supportsIframeMode() {
    var nav = window.navigator;
    if (!nav || !nav.userAgent) return false;

    var ua = nav.userAgent.toLowerCase();
    for (var i = 0; i < BLOCKED_USER_AGENTS.length; i++) {
      if (ua.indexOf(BLOCKED_USER_AGENTS[i]) >= 0) {
        return false;
      }
    }
    return true;
  }

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  var CONSTANTS = {
    SESSION_SERVER_URL: '{{SESSION_SERVER_URL}}',
    SESSION_SERVER_HOST: '{{SESSION_SERVER_HOST}}'
  };

  // User agents that don't support iframe mode. Must match iframe-loader.js, which decides
  // where tracking stores the device ID.
  var BLOCKED_USER_AGENTS = ['antgalio', 'hybrid', 'maple', 'presto', 'technotrend goerler', 'viera 2011'];

  // Not a number, so neither this script nor iframe-loader.js takes the other's answer.
  var CALLBACK_ID = 'eligibility';

  // ============================================================================
  // SAMPLER
  // ============================================================================

  function checkEligibility(deviceId) {
    try {
      var sampler = window.__tvi_sampler;
      if (!sampler || typeof sampler._checkEligibility !== 'function') return;
      sampler._checkEligibility(deviceId || '');
    } catch (e) {
      // Silent fail
    }
  }

  // ============================================================================
  // IFRAME MODE (device ID in the session server's localStorage)
  // ============================================================================

  var iframe = null;

  function removeIframe() {
    if (window.removeEventListener) {
      window.removeEventListener('message', handleIframeMessage, false);
    }
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
    iframe = null;
  }

  /**
   * Handle the device ID from the iframe
   *
   * Message format: "[callbackId];[deviceId]"
   */
  function handleIframeMessage(event) {
    try {
      if (event.origin !== CONSTANTS.SESSION_SERVER_HOST) return;
      if (!event.data || typeof event.data !== 'string') return;

      var parts = event.data.split(';');
      if (parts[0] !== CALLBACK_ID) return;

      removeIframe();
      checkEligibility(parts[1]);
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Read the device ID via iframe
   */
  function readDeviceIdFromIframe(retries) {
    var finalRetries = !isNaN(retries) ? retries : 5;

    // Wait for body to be available
    if (document.getElementsByTagName('body').length < 1) {
      if (finalRetries <= 0) return;
      setTimeout(function () {
        readDeviceIdFromIframe(finalRetries - 1);
      }, 100);
      return;
    }

    // Create iframe
    iframe = document.createElement('iframe');
    iframe.src = CONSTANTS.SESSION_SERVER_URL + '/eligibility.html';
    iframe.style.cssText = 'position:fixed;border:0;outline:0;top:-999px;left:-999px;width:0;height:0;';
    iframe.frameBorder = '0';
    iframe.tabIndex = -1;

    document.getElementsByTagName('body')[0].appendChild(iframe);

    // Setup message listener
    if (window.addEventListener) {
      window.addEventListener('message', handleIframeMessage, false);
    }

    // Wait for iframe to load
    iframe.onload = function () {
      if (!iframe || !iframe.contentWindow) return;
      iframe.contentWindow.postMessage(CALLBACK_ID + ';did', CONSTANTS.SESSION_SERVER_HOST);
    };
  }

  // ============================================================================
  // DIRECT SCRIPT MODE (device ID in the page's localStorage)
  // ============================================================================

  /**
   * Read the device ID from the page
   */
  function readDeviceIdFromPage() {
    var deviceId = null;
    if (isLocalStorageAvailable()) {
      try {
        deviceId = localStorage.getItem('did');
      } catch (e) {
        // Silent fail
      }
    }
    checkEligibility(deviceId);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  try {
    setTimeout(supportsIframeMode() ? readDeviceIdFromIframe : readDeviceIdFromPage, 1);
  } catch (e) {
    // Silent fail
  }
})();
