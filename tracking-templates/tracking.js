/**
 * TV-Insight HbbTV Tracking Script v2
 * ES3 compliant for HbbTV 1.1 devices
 *
 * This script handles:
 * - Heartbeat sending to backend
 * - Session management (start/stop)
 * - Device ID persistence (with consent)
 * - Session end tracking via localStorage
 * - Error handling with exponential backoff
 */
(function () {
  // ============================================================================
  // CONSTANTS
  // ============================================================================

  var LOG_EVENT = {
    HB_REQUEST: 1,
    HB_RESPONSE: 2,
    HB_ERROR: 3,
    HB_BACKOFF: 4,
    SESSION_START: 5,
    SESSION_STOP: 6,
    SESSION_END_UPDATE_START: 7,
    SESSION_END_UPDATE_STOP: 8,
    SESSION_END_UPDATE: 9,
    SESSION_END_SEND: 10
  };

  var LOCAL_STORAGE_KEYS = {
    DEVICE_ID: 'did',
    ACTIVE_SESSION_END: 'ase',
    PREVIOUS_SESSION_ENDS: 'pse'
  };

  // ============================================================================
  // CONFIGURATION (Template placeholders)
  // ============================================================================

  var config = {
    channelId: '{{CID}}',
    resolution: parseInt('{{RESOLUTION}}', 10),
    delivery: parseInt('{{DELIVERY}}', 10),
    heartbeatUrl: '{{HEARTBEAT_URL}}',
    heartbeatQuery: '{{HEARTBEAT_QUERY}}',
    heartbeatInterval: parseInt('{{HEARTBEAT_INTERVAL}}', 10),
    pixelName: '{{PIXEL_NAME}}',
    sessionEndPixelName: '{{SE_PIXEL_NAME}}',
    newSessionUrl: '{{NEW_SESSION}}',
    maxErrorCount: parseInt('{{MAX_ERROR_COUNT}}', 10),
    maxErrorBackoff: parseInt('{{MAX_ERROR_BACKOFF}}', 10),
    initSuspended: '{{INITIALIZE_SUSPENDED}}' === 'true',
    hasConsent: '{{CONSENT}}' === 'true',
    globalObjectName: '{{TRACKING_GLOBAL_OBJECT}}'
  };

  // ============================================================================
  // STATE
  // ============================================================================

  var state = {
    errorCount: 0,
    backoffLevel: 0,
    backoffCount: 0,
    isRequestPending: false,
    callbackCounter: 0,
    targetChannelId: null,
    targetResolution: null,
    targetDelivery: null
  };

  var logQueue = [];
  var customLogCallback = null;
  var heartbeatImage = document.createElement('img');

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

  // ============================================================================
  // LOCAL STORAGE HELPERS
  // ============================================================================

  var storage = {
    available: false,

    /**
     * Test if localStorage is available and working
     */
    init: function () {
      try {
        if (!window.localStorage) {
          return false;
        }
        var testKey = '_tvi_test';
        var testValue = now() + '';
        localStorage.setItem(testKey, testValue);
        var retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        this.available = retrieved === testValue;
        return this.available;
      } catch (e) {
        this.available = false;
        return false;
      }
    },

    get: function (key) {
      if (!this.available) return null;
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },

    set: function (key, value) {
      if (!this.available) return false;
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    },

    remove: function (key) {
      if (!this.available) return false;
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  // ============================================================================
  // SESSION END TRACKING
  // ============================================================================

  var sessionEndTracker = {
    /**
     * Serialize session ends object to string format: "sid1=ts1,sid2=ts2"
     */
    serialize: function (sessionEnds, maxLength) {
      maxLength = maxLength || 100;
      var sids = objectKeys(sessionEnds);
      var startIdx = Math.max(0, sids.length - maxLength);
      var result = '';

      for (var i = startIdx; i < sids.length; i++) {
        if (i > startIdx) {
          result += ',';
        }
        result += sids[i] + '=' + sessionEnds[sids[i]];
      }
      return result;
    },

    /**
     * Deserialize session ends string to object
     */
    deserialize: function (str) {
      var result = {};
      if (!str) return result;

      var entries = str.split(',');
      for (var i = 0; i < entries.length; i++) {
        var parts = entries[i].split('=');
        if (parts.length === 2 && parts[0]) {
          result[parts[0]] = parts[1];
        }
      }
      return result;
    },

    /**
     * Update the active session end timestamp
     */
    updateActiveTimestamp: function () {
      if (!storage.available) return;

      var globalObj = window[config.globalObjectName];
      if (!globalObj || !globalObj._sid) return;

      var ts = now();
      storage.set(LOCAL_STORAGE_KEYS.ACTIVE_SESSION_END, globalObj._sid + '=' + ts);
      log(LOG_EVENT.SESSION_END_UPDATE, 'sid=' + globalObj._sid + ',ts=' + ts);
    },

    /**
     * Close the active session end and move it to previous session ends
     */
    closeActive: function () {
      if (!storage.available) return;

      var activeSessionEnd = storage.get(LOCAL_STORAGE_KEYS.ACTIVE_SESSION_END);
      if (!activeSessionEnd) return;

      var prevSessionEnds = this.deserialize(storage.get(LOCAL_STORAGE_KEYS.PREVIOUS_SESSION_ENDS));
      var parts = activeSessionEnd.split('=');

      if (parts.length === 2 && parts[0]) {
        prevSessionEnds[parts[0]] = parts[1];
        storage.set(LOCAL_STORAGE_KEYS.PREVIOUS_SESSION_ENDS, this.serialize(prevSessionEnds));
      }

      storage.remove(LOCAL_STORAGE_KEYS.ACTIVE_SESSION_END);
    },

    /**
     * Upload a single session end to the backend
     */
    uploadOne: function (sid, ts, retries, onSuccess, onError) {
      var self = this;

      try {
        var img = document.createElement('img');

        img.onload = function () {
          if (onSuccess) onSuccess(sid, ts);
        };

        img.onerror = function () {
          if (!retries) {
            if (onError) onError(sid, ts);
            return;
          }
          var delay = (config.maxErrorBackoff + 1 - retries) * 1000;
          setTimeout(function () {
            self.uploadOne(sid, ts, retries - 1, onSuccess, onError);
          }, delay);
        };

        img.src = config.heartbeatUrl + '/' + sid + '/' + ts + '/' + config.sessionEndPixelName;
      } catch (e) {
        // Silent fail
      }
    },

    /**
     * Handle successful session end upload
     */
    onUploadSuccess: function (sid, ts) {
      if (!storage.available) return;

      var prevSessionEnds = sessionEndTracker.deserialize(storage.get(LOCAL_STORAGE_KEYS.PREVIOUS_SESSION_ENDS));
      delete prevSessionEnds[sid];

      var keys = objectKeys(prevSessionEnds);
      if (!keys.length) {
        storage.remove(LOCAL_STORAGE_KEYS.PREVIOUS_SESSION_ENDS);
      } else {
        storage.set(LOCAL_STORAGE_KEYS.PREVIOUS_SESSION_ENDS, sessionEndTracker.serialize(prevSessionEnds));
      }

      log(LOG_EVENT.SESSION_END_SEND, 'sid=' + sid + ',ts=' + ts);
    },

    /**
     * Upload all pending session ends
     */
    uploadAll: function () {
      if (!storage.available) return;

      var sessionEnds = this.deserialize(storage.get(LOCAL_STORAGE_KEYS.PREVIOUS_SESSION_ENDS));
      var sids = objectKeys(sessionEnds);

      for (var i = 0; i < sids.length; i++) {
        this.uploadOne(sids[i], sessionEnds[sids[i]], config.maxErrorBackoff, this.onUploadSuccess);
      }
    }
  };

  // ============================================================================
  // LOGGING
  // ============================================================================

  /**
   * Log an event (queued until custom callback is registered)
   */
  function log(type, message) {
    if (customLogCallback) {
      try {
        customLogCallback(type, message);
      } catch (e) {
        // Silent fail
      }
    } else {
      logQueue[logQueue.length] = { type: type, message: message };
    }
  }

  /**
   * Flush log queue after timeout if no custom callback registered
   */
  setTimeout(function () {
    if (!customLogCallback) {
      logQueue = [];
    }
  }, 3000);

  // ============================================================================
  // HEARTBEAT
  // ============================================================================

  var heartbeat = {
    /**
     * Send a heartbeat to the backend
     */
    send: function () {
      try {
        // Skip if request already pending
        if (state.isRequestPending) return;

        // Handle backoff
        if (state.backoffCount > 0) {
          state.backoffCount--;
          if (state.backoffCount === 0) {
            state.errorCount = 0;
          }
          log(LOG_EVENT.HB_BACKOFF);
          return;
        }

        state.isRequestPending = true;

        var url =
          config.heartbeatUrl +
          '/' +
          config.channelId +
          config.heartbeatQuery +
          now() +
          '/' +
          config.pixelName +
          '?f=' +
          config.heartbeatInterval;

        heartbeatImage.src = url;
        log(LOG_EVENT.HB_REQUEST);
      } catch (e) {
        state.isRequestPending = false;
      }
    }
  };

  // Heartbeat image event handlers
  heartbeatImage.onload = function () {
    state.isRequestPending = false;
    state.errorCount = 0;
    state.backoffLevel = 0;
    state.backoffCount = 0;
    log(LOG_EVENT.HB_RESPONSE);
  };

  heartbeatImage.onerror = function () {
    state.isRequestPending = false;
    state.errorCount++;

    if (state.errorCount >= config.maxErrorCount) {
      // Calculate backoff: maxErrorCount * (3 << backoffLevel)
      state.backoffCount = config.maxErrorCount * (3 << state.backoffLevel);
      state.backoffLevel++;
      if (state.backoffLevel > config.maxErrorBackoff) {
        state.backoffLevel = config.maxErrorBackoff;
      }
    }

    log(LOG_EVENT.HB_ERROR);
  };

  // ============================================================================
  // SCRIPT LOADER (for new sessions)
  // ============================================================================

  function loadScript(url, onLoad, onError) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url + '&ts=' + now();

    if (onError) {
      script.onerror = onError;
    }
    if (onLoad) {
      script.onload = onLoad;
    }

    var head = document.getElementsByTagName('head')[0];
    if (head) {
      head.appendChild(script);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  var api = {
    // Internal state exposed for iframe communication and new_session.js
    _lsAvailable: false,
    _hbTimer: null,
    _updateSessEndTimer: null,
    _sendMetaTimeout: null,
    _cb: {},
    _hb: config.heartbeatUrl + '/',
    _h: config.heartbeatQuery,
    _cid: config.channelId,
    _did: '{{DEVICE_ID}}',
    _sid: '{{SESSION_ID}}',
    _customLogCB: false,

    /**
     * Get device ID
     */
    getDID: function (callback) {
      var self = this;
      if (callback) {
        setTimeout(function () {
          callback(self._did);
        }, 0);
      }
    },

    /**
     * Get session ID
     */
    getSID: function (callback) {
      var self = this;
      if (callback) {
        setTimeout(function () {
          callback(self._sid);
        }, 0);
      }
    },

    /**
     * Switch to a different channel
     */
    switchChannel: function (channelId, resolution, delivery, callback, errorCallback) {
      var wasRunning = !!this._hbTimer;

      this.stop();

      state.targetChannelId = channelId;
      state.targetResolution = resolution || 0;
      state.targetDelivery = delivery || 0;

      if (wasRunning) {
        this.start(callback, errorCallback);
      } else if (callback) {
        callback(true);
      }
    },

    /**
     * Stop tracking
     */
    stop: function (callback) {
      try {
        if (this._hbTimer) {
          clearInterval(this._hbTimer);
          this._hbTimer = null;
          log(LOG_EVENT.SESSION_STOP);
        }

        if (this._updateSessEndTimer) {
          clearInterval(this._updateSessEndTimer);
          this._updateSessEndTimer = null;
          log(LOG_EVENT.SESSION_END_UPDATE_STOP);
        }

        if (this._sendMetaTimeout) {
          clearTimeout(this._sendMetaTimeout);
          this._sendMetaTimeout = null;
        }
      } catch (e) {
        // Silent fail
      }

      if (callback) {
        setTimeout(function () {
          callback();
        }, 1);
      }
    },

    /**
     * Start tracking (requests new session from backend)
     */
    start: function (callback, errorCallback) {
      var cid = state.targetChannelId !== null ? state.targetChannelId : config.channelId;
      var res = state.targetResolution !== null ? state.targetResolution : config.resolution;
      var del = state.targetDelivery !== null ? state.targetDelivery : config.delivery;

      var url = config.newSessionUrl + cid + '&r=' + res + '&d=' + del;

      if (callback) {
        state.callbackCounter++;
        this._cb[state.callbackCounter] = callback;
        url += '&cb=' + state.callbackCounter;
      }

      loadScript(url, null, errorCallback);
    },

    /**
     * Register a log event callback
     */
    onLogEvent: function (callback) {
      customLogCallback = callback;
      this._customLogCB = true;

      // Flush queued logs
      if (logQueue.length) {
        try {
          for (var i = 0; i < logQueue.length; i++) {
            callback(logQueue[i].type, logQueue[i].message);
          }
          logQueue = [];
        } catch (e) {
          // Silent fail
        }
      }
    },

    /**
     * Internal: Send heartbeat
     */
    _beat: function () {
      heartbeat.send();
    },

    /**
     * Internal: Update session end timestamp
     */
    _updateSessEndTs: function () {
      sessionEndTracker.updateActiveTimestamp();
    },

    /**
     * Internal: Close active session end
     */
    _closeActiveSessEnd: function () {
      sessionEndTracker.closeActive();
    },

    /**
     * Internal: Upload all pending session ends
     */
    _sessEndUpload: function () {
      sessionEndTracker.uploadAll();
    },

    /**
     * Internal: Log function
     */
    _log: function (type, message) {
      log(type, message);
    },

    /**
     * Internal: Send script request (for new sessions)
     */
    _send: function (url, callback, errorCallback) {
      if (callback) {
        state.callbackCounter++;
        this._cb[state.callbackCounter] = callback;
        url += '&cb=' + state.callbackCounter;
      }
      loadScript(url, null, errorCallback);
    }
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function init() {
    // Initialize localStorage
    storage.init();
    api._lsAvailable = storage.available;

    // Get global object reference
    var globalObj = window[config.globalObjectName] || {};
    window[config.globalObjectName] = globalObj;

    // Copy API methods to global object
    for (var key in api) {
      if (Object.prototype.hasOwnProperty.call(api, key)) {
        globalObj[key] = api[key];
      }
    }

    // Handle session end tracking
    if (storage.available) {
      sessionEndTracker.closeActive();
      sessionEndTracker.uploadAll();
    }

    // Start heartbeat if not suspended
    if (!config.initSuspended) {
      globalObj._hbTimer = setInterval(function () {
        heartbeat.send();
      }, config.heartbeatInterval);
    }

    // Start session end timestamp updates
    if (storage.available) {
      globalObj._updateSessEndTimer = setInterval(function () {
        sessionEndTracker.updateActiveTimestamp();
      }, 1000);
      log(LOG_EVENT.SESSION_END_UPDATE_START);
    }

    // Persist or remove device ID based on consent
    if (storage.available) {
      if (config.hasConsent) {
        storage.set(LOCAL_STORAGE_KEYS.DEVICE_ID, globalObj._did);
      } else {
        storage.remove(LOCAL_STORAGE_KEYS.DEVICE_ID);
      }
    }

    // Log session start
    log(LOG_EVENT.SESSION_START, 'sid=' + globalObj._sid + ',did=' + globalObj._did + ',cid=' + config.channelId);
  }

  // Run initialization
  init();
})();
