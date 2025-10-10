(function(){
  var LOG_EVENT_TYPE = {S_STRT: 5};
  var g = window['{{TRACKING_GLOBAL_OBJECT}}'];
  g._hb = '{{HEARTBEAT_URL}}/';
  g._h = '{{HEARTBEAT_QUERY}}';
  g._cid = '{{CID}}';
  g._did = '{{DEVICE_ID}}';
  g._sid = '{{SESSION_ID}}';
  g.stop();
  if (g._lsAvailable) {
    g._closeActiveSessEnd();
    g._sessEndUpload();
  }
  if({{TRACKING_ENABLED}}) {
    g._hbTimer = setInterval(g._beat, {{HEARTBEAT_INTERVAL}});
    if (g._lsAvailable) {
      g._updateSessEndTimer = setInterval(g._updateSessEndTs, 1000);
    }
    g._log(LOG_EVENT_TYPE.S_STRT, 'sid='+g._sid+',did='+g._did+',cid='+g._cid);
  }
  if (g._sendMeta) {
    clearTimeout(g._sendMetaTimeout);
    g._sendMetaTimeout = setTimeout(g._sendMeta, 5000);
  }
  try {
    var cb = g._cb['{{CB}}'];
    delete g._cb['{{CB}}'];
    if (cb) cb({{TRACKING_ENABLED}});
  } catch(e) {}
})();
