(function(){
  var client_ts_at_script_init=Date.now(),server_ts={{SERVER_TS}};
  var LOG_EVENT_TYPE = {S_STRT: 5};
  var g = window['{{TRACKING_GLOBAL_OBJECT}}'];
  g._tsDelta = client_ts_at_script_init - (server_ts || client_ts_at_script_init);
  g._hb = '{{HEARTBEAT_URL}}/';
  g._h = '{{HEARTBEAT_QUERY}}';
  g.getDID = function(cb) {
    if (cb) setTimeout(function() { cb('{{DEVICE_ID}}') }, 0);
  };
  g.getSID = function(cb) {
    if (cb) setTimeout(function() { cb('{{SESSION_ID}}') }, 0);
  };
  g.stop();
  g._closeActiveSessEnd();
  g._sessEndUpload();
  if({{TRACKING_ENABLED}}) {
    g._hbTimer = setInterval(function() { g._beat('{{CID}}') }, {{HEARTBEAT_INTERVAL}});
    g._updateSessEndTimer = setInterval(function() { g._updateSessEndTs('{{SESSION_ID}}') }, 1000);
    if (g._log) {
      g._log(LOG_EVENT_TYPE.S_STRT, 'sid={{SESSION_ID}},did={{DEVICE_ID}},cid={{CID}}');
    }
  }
  try {
    var cb = g._cb['{{CB}}'];
    delete g._cb['{{CB}}'];
    if (cb) cb({{TRACKING_ENABLED}});
  } catch(e) {}
})();
