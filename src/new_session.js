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
  // CONFIGURATION (Template placeholders)
  // ============================================================================

  var config = {
    globalObjectName: '{{TRACKING_GLOBAL_OBJECT}}',
    channelId: '{{CID}}',
    deviceId: '{{DEVICE_ID}}',
    sessionId: '{{SESSION_ID}}',
    heartbeatUrl: '{{HEARTBEAT_URL}}',
    heartbeatQuery: '{{HEARTBEAT_QUERY}}',
    heartbeatInterval: parseInt('{{HEARTBEAT_INTERVAL}}'),
    trackingEnabled: '{{TRACKING_ENABLED}}' === 'true',
    callbackId: '{{CB}}'
  };

  // ============================================================================
  // MAIN
  // ============================================================================

  var api = window[config.globalObjectName];

  if (!api) {
    return;
  }

  // Stop current tracking
  api.stop();

  // Update API state with new session info
  api._hb = config.heartbeatUrl + '/';
  api._h = config.heartbeatQuery;
  api._cid = config.channelId;
  api._did = config.deviceId;
  api._sid = config.sessionId;

  // Handle session end tracking
  if (api._lsAvailable) {
    api._closeActiveSessEnd();
    api._sessEndUpload();
  }

  // Start tracking if enabled
  if (config.trackingEnabled) {
    // Start heartbeat timer
    api._hbTimer = setInterval(api._beat, config.heartbeatInterval);

    // Start session end timestamp updates
    if (api._lsAvailable) {
      api._updateSessEndTimer = setInterval(api._updateSessEndTs, 1000);
    }

    // Log session start
    api._log(
      LOG_EVENT.SESSION_START,
      'sid=' + config.sessionId + ',did=' + config.deviceId + ',cid=' + config.channelId
    );
  }

  // Schedule metadata send
  if (api._sendMeta) {
    clearTimeout(api._sendMetaTimeout);
    api._sendMetaTimeout = setTimeout(api._sendMeta, 5000);
  }

  // Execute callback
  try {
    var callback = api._cb[config.callbackId];
    if (callback) {
      delete api._cb[config.callbackId];
      callback(config.trackingEnabled);
    }
  } catch (e) {
    // Silent fail
  }
})();
