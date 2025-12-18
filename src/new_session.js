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

  var api = window[CONSTANTS.GLOBAL_OBJECT_NAME];

  if (!api) {
    return;
  }

  function updateApiState() {
    api._hb = CONSTANTS.HEARTBEAT_URL + '/';
    api._h = CONSTANTS.HEARTBEAT_QUERY;
    api._cid = CONSTANTS.CHANNEL_ID;
    api._did = CONSTANTS.DEVICE_ID;
    api._sid = CONSTANTS.SESSION_ID;
    api._heartbeatInterval = CONSTANTS.HEARTBEAT_INTERVAL;
  }

  function handleSessionEndTracking() {
    if (!api._lsAvailable) {
      return;
    }

    api._closeActiveSessEnd();
    api._sessEndUpload();
  }

  function startTracking() {
    api._hbTimer = setInterval(api._beat, CONSTANTS.HEARTBEAT_INTERVAL);

    if (api._lsAvailable) {
      api._updateSessEndTimer = setInterval(api._updateSessEndTs, 1000);
    }

    api._log(
      LOG_EVENT.SESSION_START,
      'sid=' + CONSTANTS.SESSION_ID + ',did=' + CONSTANTS.DEVICE_ID + ',cid=' + CONSTANTS.CHANNEL_ID
    );
  }

  function scheduleMetadataSend() {
    if (!api._sendMeta) {
      return;
    }

    clearTimeout(api._sendMetaTimeout);
    api._sendMetaTimeout = setTimeout(api._sendMeta, 5000);
  }

  function executeCallback() {
    try {
      var callback = api._cb[CONSTANTS.CALLBACK_ID];
      if (callback) {
        delete api._cb[CONSTANTS.CALLBACK_ID];
        callback(CONSTANTS.TRACKING_ENABLED);
      }
    } catch (e) {
      // Silent fail
    }
  }

  // Stop current tracking
  api.stop();

  // Update API state with new session info
  updateApiState();

  // Handle session end tracking
  handleSessionEndTracking();

  // Start tracking if enabled
  if (CONSTANTS.TRACKING_ENABLED) {
    startTracking();
  }

  // Schedule metadata send
  scheduleMetadataSend();

  // Execute callback
  executeCallback();
})();
