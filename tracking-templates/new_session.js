(function(){
  var LOG_EVENT_TYPE = {S_STRT: 5};
  var g = window['{{TRACKING_GLOBAL_OBJECT}}'];
  g._hb = '{{HEARTBEAT_URL}}/';
  g._h = '{{HEARTBEAT_QUERY}}';
  g.getDID = function(cb) {
    if (cb) setTimeout(function() { cb('{{DEVICE_ID}}') }, 0);
  };
  g.getSID = function(cb) {
    if (cb) setTimeout(function() { cb('{{SESSION_ID}}') }, 0);
  };
  g.stop();
  g._asEnd();
  if({{TRACKING_ENABLED}}) {
    g._hbTimer = setInterval(function() { g._beat('{{CID}}') }, {{HEARTBEAT_INTERVAL}});
    g._lsTimer = setInterval(function() { g._asUpdate('{{SESSION_ID}}') }, 1000);
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
