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
  // CONFIGURATION (Template placeholders)
  // ============================================================================

  var config = {
    globalObjectName: '{{TRACKING_GLOBAL_OBJECT}}',
    channelId: '{{CID}}',
    resolution: '{{RESOLUTION}}',
    delivery: '{{DELIVERY}}',
    hasConsent: '{{CONSENT}}' === 'true',
    initSuspended: '{{INITIALIZE_SUSPENDED}}' === 'true',
    iframeServerUrl: '{{IFRAME_SERVER_URL}}',
    scriptServerUrl: '{{RA_SERVER_URL}}',
    sessionServerUrl: '{{SESSION_SERVER_URL}}',
    sessionServerHost: '{{SESSION_SERVER_HOST}}',
    otherQueryParams: '{{OTHER_QUERY_PARAMS}}'
  };

  // User agents that don't support iframe mode
  var BLOCKED_USER_AGENTS = ['antgalio', 'hybrid', 'maple', 'presto', 'technotrend goerler', 'viera 2011'];

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
   * Get current timestamp
   */
  function now() {
    return new Date().getTime();
  }

  /**
   * Check if localStorage is available
   */
  function isLocalStorageAvailable() {
    try {
      if (!window.localStorage) return false;
      localStorage.setItem('_test', '1');
      localStorage.removeItem('_test');
      return true;
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
      if (channel.idType !== undefined) meta += '&idtype=' + channel.idType;
      if (channel.ccid !== undefined) meta += '&ccid=' + channel.ccid;
      if (channel.onid !== undefined) meta += '&onid=' + channel.onid;
      if (channel.tsid !== undefined) meta += '&tsid=' + channel.tsid;
      if (channel.sid !== undefined) meta += '&sid=' + channel.sid;
      if (channel.nid !== undefined) meta += '&nid=' + channel.nid;
      if (channel.name !== undefined) meta += '&name=' + channel.name;
      if (channel.isHD !== undefined) meta += '&isHD=' + channel.isHD;
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
  var sendMetaTimeout = null;

  function createApiStub() {
    api = window[config.globalObjectName] || {};
    window[config.globalObjectName] = api;

    api._q = callQueue;
    api._sendMetaTimeout = 0;
    api._sendMeta = sendMeta;

    // Stub methods that queue calls
    var stubMethods = ['getDID', 'getSID', 'switchChannel', 'stop', 'start', 'onLogEvent'];
    for (var i = 0; i < stubMethods.length; i++) {
      (function (methodName) {
        api[methodName] = function () {
          callQueue[callQueue.length] = {
            m: methodName,
            a: Array.prototype.slice.call(arguments)
          };
        };
      })(stubMethods[i]);
    }
  }

  /**
   * Process queued API calls after tracking is loaded
   */
  function processQueue() {
    // Get the updated global object (tracking.js may have replaced methods)
    var globalApi = window[config.globalObjectName];
    for (var i = 0; i < callQueue.length; i++) {
      var call = callQueue[i];
      if (globalApi[call.m]) {
        globalApi[call.m].apply(null, call.a);
      }
    }
    callQueue = [];
    if (globalApi._q) {
      globalApi._q = [];
    }
  }

  // ============================================================================
  // METADATA SENDER
  // ============================================================================

  /**
   * Send channel metadata to backend
   */
  function sendMeta(retries) {
    retries = !isNaN(retries) ? retries : 3;

    try {
      if (!window[config.globalObjectName]) {
        if (retries <= 0) return;
        setTimeout(function () {
          sendMeta(retries - 1);
        }, 1000);
        return;
      }

      var meta = getChannelMetadata();

      // Get session ID
      window[config.globalObjectName].getSID(function (sid) {
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
            img.src = config.sessionServerUrl + '/meta.gif' + queryString;
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
      config.channelId +
      '&r=' +
      config.resolution +
      '&d=' +
      config.delivery +
      (deviceId ? '&did=' + deviceId : '') +
      '&suspended=' +
      config.initSuspended +
      '&ls=' +
      localStorageAvailable +
      '&ts=' +
      now() +
      config.otherQueryParams;

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

    iframe.contentWindow.postMessage(iframeCallbackCounter + ';' + message, config.sessionServerHost);
  }

  /**
   * Handle messages from iframe
   */
  function handleIframeMessage(event) {
    try {
      if (event.origin !== config.sessionServerHost) return;
      if (!event.data || typeof event.data !== 'string') return;

      var parts = event.data.split(';');
      var isError = parts[0] === 'err';
      var pos = isError ? 1 : 0;
      var id = parts[pos];
      var callbackPair = iframeCallbacks[id];
      var callback = callbackPair ? callbackPair[pos] : null;

      // Don't delete log callback (it's reused)
      if (logCallbackId !== parseInt(id, 10) && iframeCallbacks[id]) {
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
      sendIframeMessage('did', function (result) {
        if (callback) callback(result);
      });
    };

    api.getSID = function (callback) {
      sendIframeMessage('sid', function (result) {
        if (callback) callback(result);
      });
    };

    api.switchChannel = function (channelId, resolution, delivery, callback, errorCallback) {
      var message = 'cid;' + channelId + ';' + resolution + ';' + delivery;
      sendIframeMessage(
        message,
        function (result) {
          if (callback) callback(result === '1');
          clearTimeout(sendMetaTimeout);
          sendMetaTimeout = setTimeout(sendMeta, 5000);
        },
        errorCallback
      );
    };

    api.stop = function (callback) {
      sendIframeMessage('stop', function (result) {
        if (callback) callback(result === '1');
        clearTimeout(sendMetaTimeout);
      });
    };

    api.start = function (callback, errorCallback) {
      sendIframeMessage(
        'start',
        function (result) {
          if (callback) callback(result === '1');
          clearTimeout(sendMetaTimeout);
          sendMetaTimeout = setTimeout(sendMeta, 5000);
        },
        errorCallback
      );
    };

    api.onLogEvent = function (callback) {
      sendIframeMessage('log', function (result) {
        if (callback) {
          var parts = result.split(':');
          var type = parseInt(parts[0], 10);
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
    retries = !isNaN(retries) ? retries : 5;

    // Wait for body to be available
    if (document.getElementsByTagName('body').length < 1) {
      if (retries <= 0) return;
      setTimeout(function () {
        loadIframe(retries - 1);
      }, 100);
      return;
    }

    // Create iframe
    iframe = document.createElement('iframe');
    iframe.src = config.iframeServerUrl + buildQueryString();
    iframe.style.cssText = 'position:fixed;border:0;outline:0;top:-999px;left:-999px;width:0;height:0;';
    iframe.frameBorder = '0';

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
    if (config.hasConsent && localStorageAvailable) {
      try {
        deviceId = localStorage.getItem('did');
      } catch (e) {
        // Silent fail
      }
    }

    // Remove device ID if no consent
    if (!config.hasConsent && localStorageAvailable) {
      try {
        localStorage.removeItem('did');
      } catch (e) {
        // Silent fail
      }
    }

    // Create and load script
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = config.scriptServerUrl + buildQueryString(deviceId);

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
      var useIframe = supportsIframeMode();

      if (useIframe) {
        setTimeout(loadIframe, 1);
      } else {
        loadScript();
      }

      // Schedule metadata send if not suspended
      if (!config.initSuspended) {
        clearTimeout(sendMetaTimeout);
        sendMetaTimeout = setTimeout(sendMeta, 5000);
        api._sendMetaTimeout = sendMetaTimeout;
      }
    } catch (e) {
      // Silent fail
    }
  }

  // Run initialization
  init();
})();
