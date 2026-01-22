/**
 * TV-Insight HbbTV Tracking Script Loader v2
 * ES3 compliant for HbbTV 1.1 devices
 *
 * This script handles:
 * - Detection of iframe-capable devices
 * - Loading tracking via iframe or direct script
 * - API stub that queues calls until tracking is loaded
 * - Channel metadata collection
 */
(function () {
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * ES3-safe Object.keys implementation
   */
  function objectKeys(obj) {
    var keys = [];
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        keys[keys.length] = key;
      }
    }
    return keys;
  }

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
    GLOBAL_OBJECT_NAME: '{{TRACKING_GLOBAL_OBJECT}}',
    CHANNEL_ID: '{{CID}}',
    RESOLUTION: '{{RESOLUTION}}',
    DELIVERY: '{{DELIVERY}}',
    HAS_CONSENT: '{{CONSENT}}' === 'true',
    INIT_SUSPENDED: '{{INITIALIZE_SUSPENDED}}' === 'true',
    IFRAME_SERVER_URL: '{{IFRAME_SERVER_URL}}',
    SCRIPT_SERVER_URL: '{{RA_SERVER_URL}}',
    SESSION_SERVER_URL: '{{SESSION_SERVER_URL}}',
    SESSION_SERVER_HOST: '{{SESSION_SERVER_HOST}}',
    OTHER_QUERY_PARAMS: '{{OTHER_QUERY_PARAMS}}'
  };

  // User agents that don't support iframe mode
  var BLOCKED_USER_AGENTS = ['antgalio', 'hybrid', 'maple', 'presto', 'technotrend goerler', 'viera 2011'];

  // ============================================================================
  // CONSENT / CMP INTEGRATION
  // ============================================================================

  /**
   * Serialize consent by vendor ID to string format: "vendorId1~consent1,vendorId2~consent2"
   */
  function serializeConsentByVendorId(consentByVendorId) {
    if (!consentByVendorId) return undefined;

    try {
      var vendorIds = objectKeys(consentByVendorId);
      var result = '';

      for (var i = 0; i < vendorIds.length; i++) {
        if (i > 0) result += ',';
        result += vendorIds[i] + '~' + consentByVendorId[vendorIds[i]];
      }
      return result;
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Get consent status from CMP API
   */
  function getConsentStatus(callback) {
    if (!window.__cmpapi || typeof window.__cmpapi !== 'function') {
      callback(undefined);
      return;
    }

    try {
      window.__cmpapi('getTCData', 2, function (tcData) {
        if (!tcData || tcData.cmpStatus !== 'loaded') {
          callback(undefined);
          return;
        }
        callback(tcData.vendor && tcData.vendor.consents);
      });
    } catch (e) {
      callback(undefined);
    }
  }

  /**
   * Get sampler percentile from sampler API
   */
  function getSamplerPercentile(callback) {
    if (
      !window.__tvi_sampler ||
      !window.__tvi_sampler.getPercentile ||
      typeof window.__tvi_sampler.getPercentile !== 'function'
    ) {
      callback(undefined);
      return;
    }

    try {
      window.__tvi_sampler.getPercentile(callback);
    } catch (e) {
      callback(undefined);
    }
  }

  // ============================================================================
  // CHANNEL METADATA
  // ============================================================================

  /**
   * Get OIPF Application Manager object
   */
  function getApplicationManager() {
    // Try to find existing application manager
    var objs = document.getElementsByTagName('object');
    for (var i = 0; i < objs.length; i++) {
      if (objs[i].type === 'application/oipfApplicationManager') {
        return objs[i];
      }
    }

    // Create new application manager
    try {
      var el = document.createElement('object');
      el.type = 'application/oipfApplicationManager';
      document.body.appendChild(el);
      return el;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get current channel metadata
   */
  function getChannelMetadata() {
    var meta = '';

    try {
      var mgr = getApplicationManager();
      if (!mgr) return meta;

      var app =
        mgr.getOwnerApplication && typeof mgr.getOwnerApplication === 'function'
          ? mgr.getOwnerApplication(document)
          : null;

      if (!app || !app.privateData || !app.privateData.currentChannel) return meta;

      var channel = app.privateData.currentChannel;

      // Standard OIPF DAE Channel properties (Section 7.13.11.2)
      var channelProps = [
        ['idType', 'idtype'],
        ['ccid', 'ccid'],
        ['onid', 'onid'],
        ['tsid', 'tsid'],
        ['sid', 'sid'],
        ['nid', 'nid'],
        ['name', 'name'],
        ['isHD', 'isHD']
      ];
      for (var j = 0; j < channelProps.length; j++) {
        var prop = channelProps[j];
        if (channel[prop[0]] !== undefined) {
          meta += '&' + prop[1] + '=' + channel[prop[0]];
        }
      }
    } catch (e) {
      // Silent fail
    }

    return meta;
  }

  // ============================================================================
  // API STUB (queues calls until tracking is loaded)
  // ============================================================================

  var api;
  var callQueue = [];
  var STUB_METHODS = ['getDID', 'getSID', 'switchChannel', 'stop', 'start', 'onLogEvent'];

  function createApiStub() {
    api = window[CONSTANTS.GLOBAL_OBJECT_NAME] || {};
    window[CONSTANTS.GLOBAL_OBJECT_NAME] = api;

    api._q = callQueue;
    api._sendMetaTimeout = 0;
    api._sendMeta = sendMeta;

    // Stub methods that queue calls
    for (var i = 0; i < STUB_METHODS.length; i++) {
      (function (methodName) {
        api[methodName] = function () {
          callQueue[callQueue.length] = {
            m: methodName,
            a: Array.prototype.slice.call(arguments)
          };
        };
      })(STUB_METHODS[i]);
    }
  }

  /**
   * Process queued API calls after tracking is loaded
   */
  function processQueue() {
    // Get the updated global object (tracking.js may have replaced methods)
    var globalApi = window[CONSTANTS.GLOBAL_OBJECT_NAME];
    for (var i = 0; i < callQueue.length; i++) {
      var call = callQueue[i];
      if (globalApi[call.m]) {
        globalApi[call.m].apply(null, call.a);
      }
    }
    callQueue.length = 0;
    if (globalApi._q && globalApi._q.length) {
      globalApi._q.length = 0;
    }
  }

  // ============================================================================
  // METADATA SENDER
  // ============================================================================

  /**
   * Send channel metadata to backend
   */
  function sendMeta(retries) {
    var finalRetries = !isNaN(retries) ? retries : 3;

    try {
      var globalApi = window[CONSTANTS.GLOBAL_OBJECT_NAME];
      if (!globalApi) {
        if (finalRetries <= 0) return;
        setTimeout(function () {
          sendMeta(finalRetries - 1);
        }, 1000);
        return;
      }

      var meta = getChannelMetadata();

      // Get session ID
      globalApi.getSID(function (sid) {
        if (sid !== undefined) meta += '&sid=' + sid;

        // Get consent status
        getConsentStatus(function (consentByVendorId) {
          var vid = serializeConsentByVendorId(consentByVendorId);
          if (vid !== undefined) meta += '&vid=' + vid;

          // Get sampler percentile
          getSamplerPercentile(function (spc) {
            if (spc !== undefined) meta += '&spc=' + spc;

            // Send metadata
            var img = document.createElement('img');
            var queryString = meta.length ? '?' + meta.substring(1) : '';
            img.src = CONSTANTS.SESSION_SERVER_URL + '/meta.gif' + queryString;
          });
        });
      });
    } catch (e) {
      // Silent fail
    }
  }

  // ============================================================================
  // QUERY STRING BUILDER
  // ============================================================================

  var localStorageAvailable = isLocalStorageAvailable();

  function buildQueryString(deviceId) {
    var query =
      CONSTANTS.CHANNEL_ID +
      '&r=' +
      CONSTANTS.RESOLUTION +
      '&d=' +
      CONSTANTS.DELIVERY +
      (deviceId ? '&did=' + deviceId : '') +
      '&suspended=' +
      CONSTANTS.INIT_SUSPENDED +
      '&ls=' +
      localStorageAvailable +
      '&ts=' +
      new Date().getTime() +
      CONSTANTS.OTHER_QUERY_PARAMS;

    return query;
  }

  // ============================================================================
  // IFRAME MODE
  // ============================================================================

  var iframe = null;
  var iframeCallbackCounter = 0;
  var iframeCallbacks = {};
  var logCallbackId = 0;

  /**
   * Send message to iframe
   */
  function sendIframeMessage(message, callback, errorCallback) {
    if (!iframe || !iframe.contentWindow) {
      if (errorCallback) errorCallback();
      return;
    }

    iframeCallbackCounter++;
    iframeCallbacks[iframeCallbackCounter] = [callback, errorCallback];

    if (message === 'log') {
      logCallbackId = iframeCallbackCounter;
    }

    iframe.contentWindow.postMessage(iframeCallbackCounter + ';' + message, CONSTANTS.SESSION_SERVER_HOST);
  }

  /**
   * Handle messages from iframe
   *
   * Message format: "[callbackId];[result]" for success, "err;[callbackId]" for error
   * Callback pairs stored as [successCallback, errorCallback] in iframeCallbacks
   *
   * @param {MessageEvent} event - The postMessage event from iframe
   */
  function handleIframeMessage(event) {
    try {
      if (event.origin !== CONSTANTS.SESSION_SERVER_HOST) return;
      if (!event.data || typeof event.data !== 'string') return;

      var parts = event.data.split(';');
      var isError = parts[0] === 'err';
      // For errors: parts = ['err', callbackId, ...], for success: parts = [callbackId, result, ...]
      var pos = isError ? 1 : 0;
      var id = parts[pos];
      var callbackPair = iframeCallbacks[id];
      // Select error callback (index 1) for errors, success callback (index 0) otherwise
      var callback = callbackPair ? callbackPair[isError ? 1 : 0] : null;

      if (logCallbackId !== parseInt(id) && iframeCallbacks[id]) {
        delete iframeCallbacks[id];
      }

      if (callback) {
        callback(parts[pos + 1]);
      }
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Setup iframe API methods
   */
  function setupIframeApi() {
    api.getDID = function (callback) {
      sendIframeMessage('did', callback);
    };

    api.getSID = function (callback) {
      sendIframeMessage('sid', callback);
    };

    api.switchChannel = function (channelId, resolution, delivery, callback, errorCallback) {
      var message = 'cid;' + channelId + ';' + resolution + ';' + delivery;
      sendIframeMessage(
        message,
        function (result) {
          if (callback) callback(result === '1');
          clearTimeout(api._sendMetaTimeout);
          api._sendMetaTimeout = setTimeout(sendMeta, 5000);
        },
        errorCallback
      );
    };

    api.stop = function (callback) {
      sendIframeMessage('stop', function (result) {
        if (callback) callback(result === '1');
        clearTimeout(api._sendMetaTimeout);
      });
    };

    api.start = function (callback, errorCallback) {
      sendIframeMessage(
        'start',
        function (result) {
          if (callback) callback(result === '1');
          clearTimeout(api._sendMetaTimeout);
          api._sendMetaTimeout = setTimeout(sendMeta, 5000);
        },
        errorCallback
      );
    };

    api.onLogEvent = function (callback) {
      sendIframeMessage('log', function (result) {
        if (callback) {
          var parts = result.split(':');
          var type = parseInt(parts[0]);
          var message = parts.slice(1).join(':');
          callback(type, message);
        }
      });
    };
  }

  /**
   * Load tracking via iframe
   */
  function loadIframe(retries) {
    var finalRetries = !isNaN(retries) ? retries : 5;

    // Wait for body to be available
    if (document.getElementsByTagName('body').length < 1) {
      if (finalRetries <= 0) return;
      setTimeout(function () {
        loadIframe(finalRetries - 1);
      }, 100);
      return;
    }

    // Create iframe
    iframe = document.createElement('iframe');
    iframe.src = CONSTANTS.IFRAME_SERVER_URL + buildQueryString();
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
      setupIframeApi();
      processQueue();
    };
  }

  // ============================================================================
  // DIRECT SCRIPT MODE
  // ============================================================================

  /**
   * Load tracking via direct script injection
   */
  function loadScript() {
    var deviceId = null;

    // Get device ID from localStorage if consent given
    if (CONSTANTS.HAS_CONSENT && localStorageAvailable) {
      try {
        deviceId = localStorage.getItem('did');
      } catch (e) {
        // Silent fail
      }
    }

    // Remove device ID if no consent
    if (!CONSTANTS.HAS_CONSENT && localStorageAvailable) {
      try {
        localStorage.removeItem('did');
      } catch (e) {
        // Silent fail
      }
    }

    // Create and load script
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = CONSTANTS.SCRIPT_SERVER_URL + buildQueryString(deviceId);

    script.onload = function () {
      processQueue();
    };

    var head = document.getElementsByTagName('head')[0];
    if (head) {
      head.appendChild(script);
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function init() {
    try {
      // Create API stub
      createApiStub();

      // Determine loading mode and load tracking
      setTimeout(supportsIframeMode() ? loadIframe : loadScript, 1);

      // Schedule metadata send if not suspended
      if (!CONSTANTS.INIT_SUSPENDED) {
        clearTimeout(api._sendMetaTimeout);
        api._sendMetaTimeout = setTimeout(sendMeta, 5000);
      }
    } catch (e) {
      // Silent fail
    }
  }

  // Run initialization
  init();
})();
