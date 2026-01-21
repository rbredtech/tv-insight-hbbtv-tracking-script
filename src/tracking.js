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

  var CONSTANTS = {
    GLOBAL_OBJECT_NAME: '{{TRACKING_GLOBAL_OBJECT}}',
    PIXEL_NAME: '{{PIXEL_NAME}}',
    SESSION_END_PIXEL_NAME: '{{SE_PIXEL_NAME}}',
    NEW_SESSION_URL: '{{NEW_SESSION}}',
    MAX_ERROR_COUNT: parseInt('{{MAX_ERROR_COUNT}}'),
    MAX_ERROR_BACKOFF: parseInt('{{MAX_ERROR_BACKOFF}}')
  };

  var LOCAL_STORAGE_KEYS = {
    DEVICE_ID: 'did',
    ACTIVE_SESSION_END: 'ase',
    PREVIOUS_SESSION_ENDS: 'pse'
  };

  // ============================================================================
  // STATE
  // ============================================================================

  var state = {
    errorCount: 0,
    backoffLevel: 0,
    backoffCount: 0,
    isHeartbeatPending: false,
    callbackCounter: 0
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
        if (!window.localStorage) return false;
        var testKey = '_tvi_test';
        var testValue = '1';
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
      var limit = maxLength || 100;
      var sids = objectKeys(sessionEnds);
      var startIdx = Math.max(0, sids.length - limit);
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

      var globalApi = window[CONSTANTS.GLOBAL_OBJECT_NAME];
      if (!globalApi || !globalApi._sid) return;

      var ts = now();
      storage.set(LOCAL_STORAGE_KEYS.ACTIVE_SESSION_END, globalApi._sid + '=' + ts);
      log(LOG_EVENT.SESSION_END_UPDATE, 'sid=' + globalApi._sid + ',ts=' + ts);
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
    uploadSessionEnd: function (sid, ts, retries, onSuccess, onError) {
      var self = this;

      try {
        var globalApi = window[CONSTANTS.GLOBAL_OBJECT_NAME];
        var img = document.createElement('img');

        img.onload = function () {
          if (onSuccess) onSuccess(sid, ts);
        };

        img.onerror = function () {
          if (!retries) {
            if (onError) onError(sid, ts);
            return;
          }
          var delay = (CONSTANTS.MAX_ERROR_BACKOFF + 1 - retries) * 1000;
          setTimeout(function () {
            self.uploadSessionEnd(sid, ts, retries - 1, onSuccess, onError);
          }, delay);
        };

        img.src = globalApi._hb + sid + '/' + ts + '/' + CONSTANTS.SESSION_END_PIXEL_NAME;
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
        this.uploadSessionEnd(sids[i], sessionEnds[sids[i]], CONSTANTS.MAX_ERROR_BACKOFF, this.onUploadSuccess);
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
        if (state.isHeartbeatPending) return;

        // Handle backoff
        if (state.backoffCount > 0) {
          state.backoffCount--;
          if (state.backoffCount === 0) {
            state.errorCount = 0;
          }
          log(LOG_EVENT.HB_BACKOFF);
          return;
        }

        state.isHeartbeatPending = true;

        // Get current values from global object (updated by new_session.js)
        var globalApi = window[CONSTANTS.GLOBAL_OBJECT_NAME];
        var url =
          globalApi._hb + globalApi._cid + globalApi._hq + now() + '/' + CONSTANTS.PIXEL_NAME + '?f=' + globalApi._hi;

        heartbeatImage.src = url;
        log(LOG_EVENT.HB_REQUEST);
      } catch (e) {
        state.isHeartbeatPending = false;
      }
    }
  };

  // Heartbeat image event handlers
  heartbeatImage.onload = function () {
    state.isHeartbeatPending = false;
    state.errorCount = 0;
    state.backoffLevel = 0;
    state.backoffCount = 0;
    log(LOG_EVENT.HB_RESPONSE);
  };

  heartbeatImage.onerror = function () {
    state.isHeartbeatPending = false;
    state.errorCount++;

    if (state.errorCount >= CONSTANTS.MAX_ERROR_COUNT) {
      state.backoffCount = CONSTANTS.MAX_ERROR_COUNT * (3 << state.backoffLevel);
      state.backoffLevel++;
      if (state.backoffLevel > CONSTANTS.MAX_ERROR_BACKOFF) {
        state.backoffLevel = CONSTANTS.MAX_ERROR_BACKOFF;
      }
    }

    log(LOG_EVENT.HB_ERROR);
  };

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

  function withCallback(url, apiContext, callback) {
    if (!callback) {
      return url;
    }

    state.callbackCounter++;
    apiContext._cb[state.callbackCounter] = callback;
    return url + '&cb=' + state.callbackCounter;
  }

  var timers = {
    startHeartbeat: function (apiContext) {
      console.log('[TRACKING] timers.startHeartbeat() called, _hi=' + apiContext._hi + ', _cid=' + apiContext._cid);
      apiContext._hbTimer = setInterval(apiContext._beat, apiContext._hi);
      console.log('[TRACKING] timers.startHeartbeat() setInterval created, _hbTimer=' + apiContext._hbTimer);
    },

    stopHeartbeat: function (apiContext) {
      console.log('[TRACKING] timers.stopHeartbeat() called, _hbTimer=' + apiContext._hbTimer);
      if (!apiContext._hbTimer) {
        console.log('[TRACKING] timers.stopHeartbeat() no timer to stop');
        return;
      }
      clearInterval(apiContext._hbTimer);
      apiContext._hbTimer = null;
      console.log('[TRACKING] timers.stopHeartbeat() cleared timer, _hbTimer now=' + apiContext._hbTimer);
      log(LOG_EVENT.SESSION_STOP);
    },

    startSessionEndUpdates: function (apiContext) {
      apiContext._updateSessEndTimer = setInterval(apiContext._updateSessEndTs, 1000);
      log(LOG_EVENT.SESSION_END_UPDATE_START);
    },

    stopSessionEndUpdates: function (apiContext) {
      if (!apiContext._updateSessEndTimer) {
        return;
      }
      clearInterval(apiContext._updateSessEndTimer);
      apiContext._updateSessEndTimer = null;
      log(LOG_EVENT.SESSION_END_UPDATE_STOP);
    },

    cancelMeta: function (apiContext) {
      if (!apiContext._sendMetaTimeout) {
        return;
      }
      clearTimeout(apiContext._sendMetaTimeout);
      apiContext._sendMetaTimeout = null;
    }
  };

  function initApi(apiContext, storage) {
    apiContext._lsAvailable = storage.available;
    apiContext._hbTimer = null;
    apiContext._updateSessEndTimer = null;
    apiContext._cb = {};
    apiContext._hb = '{{HEARTBEAT_URL}}/';
    apiContext._hq = '{{HEARTBEAT_QUERY}}';
    apiContext._hi = parseInt('{{HEARTBEAT_INTERVAL}}');
    apiContext._cid = '{{CID}}';
    apiContext._did = '{{DEVICE_ID}}';
    apiContext._sid = '{{SESSION_ID}}';
    apiContext._r = parseInt('{{RESOLUTION}}');
    apiContext._d = parseInt('{{DELIVERY}}');
    apiContext._initSuspended = '{{INITIALIZE_SUSPENDED}}' === 'true';
    apiContext._hasConsent = '{{CONSENT}}' === 'true';
    apiContext._customLogCB = false;

    apiContext.getDID = function (callback) {
      var self = this;
      if (callback) {
        setTimeout(function () {
          callback(self._did);
        }, 0);
      }
    };

    apiContext.getSID = function (callback) {
      var self = this;
      if (callback) {
        setTimeout(function () {
          callback(self._sid);
        }, 0);
      }
    };

    apiContext.start = function (callback, errorCallback) {
      var globalApi = window[CONSTANTS.GLOBAL_OBJECT_NAME];
      console.log(
        '[TRACKING] start() called, cid=' +
          globalApi._cid +
          ', r=' +
          globalApi._r +
          ', d=' +
          globalApi._d +
          ', _hi=' +
          globalApi._hi
      );

      var url = CONSTANTS.NEW_SESSION_URL + globalApi._cid + '&r=' + globalApi._r + '&d=' + globalApi._d;
      loadScript(withCallback(url, this, callback), null, errorCallback);
    };

    apiContext.stop = function (callback) {
      console.log('[TRACKING] stop() called, _hbTimer=' + this._hbTimer + ', hasCallback=' + !!callback);
      try {
        timers.stopHeartbeat(this);
        timers.stopSessionEndUpdates(this);
        timers.cancelMeta(this);
      } catch (e) {
        console.log('[TRACKING] stop() error in timers:', e);
      }

      if (callback) {
        setTimeout(function () {
          console.log('[TRACKING] stop() callback executing');
          callback();
        }, 1);
      }
    };

    apiContext.switchChannel = function (channelId, resolution, delivery, callback, errorCallback) {
      var self = this;
      var wasRunning = !!this._hbTimer;
      console.log(
        '[TRACKING] switchChannel() called, channelId=' +
          channelId +
          ', resolution=' +
          resolution +
          ', delivery=' +
          delivery +
          ', wasRunning=' +
          wasRunning +
          ', _hbTimer=' +
          this._hbTimer
      );

      var updateAndRestart = function (context) {
        console.log(
          '[TRACKING] updateAndRestart() called, context._cid=' +
            context._cid +
            ', context._hi=' +
            context._hi +
            ', wasRunning=' +
            wasRunning
        );
        context._cid = channelId;
        context._r = resolution || 0;
        context._d = delivery || 0;
        console.log(
          '[TRACKING] updateAndRestart() updated properties, new _cid=' +
            context._cid +
            ', _r=' +
            context._r +
            ', _d=' +
            context._d
        );

        if (wasRunning) {
          console.log('[TRACKING] updateAndRestart() calling start() because wasRunning=true');
          context.start(callback, errorCallback);
        } else if (callback) {
          console.log('[TRACKING] updateAndRestart() calling callback(true) because wasRunning=false');
          callback(true);
        }
      };

      if (wasRunning) {
        console.log('[TRACKING] switchChannel() calling stop() with callback');
        this.stop(function () {
          console.log('[TRACKING] switchChannel() stop callback executing, about to call updateAndRestart');
          updateAndRestart(self);
        });
      } else {
        console.log('[TRACKING] switchChannel() calling updateAndRestart() directly (not running)');
        updateAndRestart(this);
      }
    };

    apiContext.onLogEvent = function (callback) {
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
    };

    apiContext._beat = function () {
      heartbeat.send();
    };

    apiContext._updateSessEndTs = function () {
      sessionEndTracker.updateActiveTimestamp();
    };

    apiContext._closeActiveSessEnd = function () {
      sessionEndTracker.closeActive();
    };

    apiContext._sessEndUpload = function () {
      sessionEndTracker.uploadAll();
    };

    apiContext._log = function (type, message) {
      log(type, message);
    };

    apiContext._send = function (url, callback, errorCallback) {
      loadScript(withCallback(url, this, callback), null, errorCallback);
    };
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  function init() {
    // Initialize localStorage
    storage.init();

    // Initialize API on global object
    var globalApi = window[CONSTANTS.GLOBAL_OBJECT_NAME] || {};
    window[CONSTANTS.GLOBAL_OBJECT_NAME] = globalApi;
    initApi(globalApi, storage);

    // Start heartbeat if not suspended
    if (!globalApi._initSuspended) {
      timers.startHeartbeat(globalApi);
    }

    if (storage.available) {
      sessionEndTracker.closeActive();
      sessionEndTracker.uploadAll();
      timers.startSessionEndUpdates(globalApi);

      if (globalApi._hasConsent) {
        storage.set(LOCAL_STORAGE_KEYS.DEVICE_ID, globalApi._did);
      } else {
        storage.remove(LOCAL_STORAGE_KEYS.DEVICE_ID);
      }
    }

    // Log session start
    log(LOG_EVENT.SESSION_START, 'sid=' + globalApi._sid + ',did=' + globalApi._did + ',cid=' + globalApi._cid);
  }

  // Run initialization
  init();
})();
