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
  // CONSTANTS
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

  if (!globalApi) {
    return;
  }
  function updateApiState() {
    globalApi._hb = CONSTANTS.HEARTBEAT_URL + '/';
    globalApi._hq = CONSTANTS.HEARTBEAT_QUERY;
    globalApi._hi = CONSTANTS.HEARTBEAT_INTERVAL;
    globalApi._cid = CONSTANTS.CHANNEL_ID;
    globalApi._did = CONSTANTS.DEVICE_ID;
    globalApi._sid = CONSTANTS.SESSION_ID;
  }

  function handleSessionEndTracking() {
    if (!globalApi._lsAvailable) {
      return;
    }

    globalApi._closeActiveSessEnd();
    globalApi._sessEndUpload();
  }

  function startTracking() {
    globalApi._startHeartbeatInterval();
    if (globalApi._lsAvailable) {
      globalApi._updateSessEndTimer = setInterval(globalApi._updateSessEndTs, 1000);
    }
    globalApi._log(
      LOG_EVENT.SESSION_START,
      'sid=' + globalApi._sid + ',did=' + globalApi._did + ',cid=' + globalApi._cid
    );
  }

  function scheduleMetadataSend() {
    if (!globalApi._sendMeta) {
      return;
    }

    clearTimeout(globalApi._sendMetaTimeout);
    globalApi._sendMetaTimeout = setTimeout(globalApi._sendMeta, 5000);
  }

  function executeCallback() {
    try {
      var callback = globalApi._cb[CONSTANTS.CALLBACK_ID];
      if (callback) {
        delete globalApi._cb[CONSTANTS.CALLBACK_ID];
        callback(CONSTANTS.TRACKING_ENABLED);
      }
    } catch (e) {}
  }

  // Stop current tracking
  globalApi.stop(function () {
    updateApiState();
    handleSessionEndTracking();
    if (CONSTANTS.TRACKING_ENABLED) {
      startTracking();
    }
    scheduleMetadataSend();
    executeCallback();
  });
})();
