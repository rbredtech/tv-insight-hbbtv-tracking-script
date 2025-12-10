/**
 * TV-Insight HbbTV Tracking Script - Iframe Bridge v2
 * ES3 compliant for HbbTV 1.1 devices
 *
 * This script handles postMessage communication between
 * the parent window and the tracking iframe.
 */
(function () {
  var api = window['{{TRACKING_GLOBAL_OBJECT}}'];

  if (!api) {
    return;
  }

  /**
   * Send message to parent window
   */
  function sendToParent(message) {
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage(message, '*');
    }
  }

  /**
   * Handle incoming messages from parent
   */
  function handleMessage(event) {
    if (!event.data || typeof event.data !== 'string') {
      return;
    }

    var parts = event.data.split(';');
    var callbackId = parts[0];
    var command = parts[1];

    switch (command) {
      case 'did':
        api.getDID(function (deviceId) {
          sendToParent(callbackId + ';' + deviceId);
        });
        break;

      case 'sid':
        api.getSID(function (sessionId) {
          sendToParent(callbackId + ';' + sessionId);
        });
        break;

      case 'cid':
        api.switchChannel(
          parts[2], // channelId
          parts[3], // resolution
          parts[4], // delivery
          function (success) {
            sendToParent(callbackId + (success ? ';1' : ';0'));
          },
          function () {
            sendToParent('err;' + callbackId);
          }
        );
        break;

      case 'stop':
        api.stop(function () {
          sendToParent(callbackId + ';1');
        });
        break;

      case 'start':
        api.start(
          function (success) {
            sendToParent(callbackId + (success ? ';1' : ';0'));
          },
          function () {
            sendToParent('err;' + callbackId);
          }
        );
        break;

      case 'log':
        api.onLogEvent(function (type, message) {
          var args = [type];
          if (message !== undefined) {
            args[args.length] = message;
          }
          sendToParent(callbackId + ';' + args.join(':'));
        });
        break;

      default:
        // Unknown command, ignore
        break;
    }
  }

  // Setup message listener
  if (window.addEventListener) {
    window.addEventListener('message', handleMessage, false);
  }
})();
