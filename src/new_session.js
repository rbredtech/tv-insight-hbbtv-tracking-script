/**
 * TV-Insight HbbTV Tracking Script - New Session Handler v2
 * ES3 compliant for HbbTV 1.1 devices
 *
 * This script is loaded when starting a new session (via start() or switchChannel()).
 * It updates the tracking state with new session information.
 */
(function () {
  var LOG_EVENT = {
    SESSION_START: 5
  };

  // ============================================================================
  // CONSTANTS (Template placeholders)
  // ============================================================================

  var CONSTANTS = {
    GLOBAL_OBJECT_NAME: '{{TRACKING_GLOBAL_OBJECT}}',
    CHANNEL_ID: '{{CID}}',
    DEVICE_ID: '{{DEVICE_ID}}',
    SESSION_ID: '{{SESSION_ID}}',
    HEARTBEAT_URL: '{{HEARTBEAT_URL}}',
    HEARTBEAT_QUERY: '{{HEARTBEAT_QUERY}}',
    HEARTBEAT_INTERVAL: parseInt('{{HEARTBEAT_INTERVAL}}'),
    TRACKING_ENABLED: '{{TRACKING_ENABLED}}' === 'true',
    CALLBACK_ID: '{{CB}}'
  };

  // ============================================================================
  // MAIN
  // ============================================================================

  var globalApi = window[CONSTANTS.GLOBAL_OBJECT_NAME];
  console.log(
    '[NEW_SESSION] Script loaded, TRACKING_ENABLED=' +
      CONSTANTS.TRACKING_ENABLED +
      ', HEARTBEAT_INTERVAL=' +
      CONSTANTS.HEARTBEAT_INTERVAL +
      ', CID=' +
      CONSTANTS.CHANNEL_ID
  );

  if (!globalApi) {
    console.log('[NEW_SESSION] ERROR: globalApi not found');
    return;
  }
  console.log(
    '[NEW_SESSION] globalApi found, current _hbTimer=' +
      globalApi._hbTimer +
      ', _hi=' +
      globalApi._hi +
      ', _cb exists=' +
      !!globalApi._cb +
      ', _cb type=' +
      typeof globalApi._cb
  );

  function updateApiState() {
    console.log(
      '[NEW_SESSION] updateApiState() called, updating to: _hi=' +
        CONSTANTS.HEARTBEAT_INTERVAL +
        ', _cid=' +
        CONSTANTS.CHANNEL_ID +
        ', _sid=' +
        CONSTANTS.SESSION_ID
    );
    globalApi._hb = CONSTANTS.HEARTBEAT_URL + '/';
    globalApi._hq = CONSTANTS.HEARTBEAT_QUERY;
    globalApi._hi = CONSTANTS.HEARTBEAT_INTERVAL;
    globalApi._cid = CONSTANTS.CHANNEL_ID;
    globalApi._did = CONSTANTS.DEVICE_ID;
    globalApi._sid = CONSTANTS.SESSION_ID;
    console.log(
      '[NEW_SESSION] updateApiState() completed, globalApi._hi=' + globalApi._hi + ', globalApi._cid=' + globalApi._cid
    );
  }

  function handleSessionEndTracking() {
    if (!globalApi._lsAvailable) {
      return;
    }

    globalApi._closeActiveSessEnd();
    globalApi._sessEndUpload();
  }

  function startTracking() {
    console.log(
      '[NEW_SESSION] startTracking() called, HEARTBEAT_INTERVAL=' +
        CONSTANTS.HEARTBEAT_INTERVAL +
        ', globalApi._hi=' +
        globalApi._hi
    );
    globalApi._hbTimer = setInterval(function () {
      globalApi._beat();
    }, CONSTANTS.HEARTBEAT_INTERVAL);
    console.log('[NEW_SESSION] startTracking() setInterval created, _hbTimer=' + globalApi._hbTimer);
    if (globalApi._lsAvailable) {
      globalApi._updateSessEndTimer = setInterval(globalApi._updateSessEndTs, 1000);
    }
    globalApi._log(
      LOG_EVENT.SESSION_START,
      'sid=' + CONSTANTS.SESSION_ID + ',did=' + CONSTANTS.DEVICE_ID + ',cid=' + CONSTANTS.CHANNEL_ID
    );
  }

  function scheduleMetadataSend() {
    console.log('[NEW_SESSION] scheduleMetadataSend() called, _sendMeta exists=' + !!globalApi._sendMeta);
    if (!globalApi._sendMeta) {
      return;
    }

    clearTimeout(globalApi._sendMetaTimeout);
    globalApi._sendMetaTimeout = setTimeout(globalApi._sendMeta, 5000);
  }

  function executeCallback() {
    console.log('[NEW_SESSION] executeCallback() called, CALLBACK_ID=' + CONSTANTS.CALLBACK_ID);
    try {
      var callback = globalApi._cb[CONSTANTS.CALLBACK_ID];
      if (callback) {
        console.log(
          '[NEW_SESSION] executeCallback() found callback, calling with TRACKING_ENABLED=' + CONSTANTS.TRACKING_ENABLED
        );
        delete globalApi._cb[CONSTANTS.CALLBACK_ID];
        callback(CONSTANTS.TRACKING_ENABLED);
      } else {
        console.log('[NEW_SESSION] executeCallback() no callback found for ID=' + CONSTANTS.CALLBACK_ID);
      }
    } catch (e) {
      console.log('[NEW_SESSION] executeCallback() error:', e);
    }
  }

  // Stop current tracking
  console.log('[NEW_SESSION] Calling globalApi.stop() with callback');
  globalApi.stop(function () {
    console.log('[NEW_SESSION] stop() callback executing, starting session initialization');
    updateApiState();
    handleSessionEndTracking();
    if (CONSTANTS.TRACKING_ENABLED) {
      console.log('[NEW_SESSION] TRACKING_ENABLED=true, calling startTracking()');
      startTracking();
    } else {
      console.log('[NEW_SESSION] TRACKING_ENABLED=false, skipping startTracking()');
    }
    scheduleMetadataSend();
    executeCallback();
    console.log('[NEW_SESSION] Session initialization complete');
  });
})();
