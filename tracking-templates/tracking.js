(function () {
  var tcid,rs={{RESOLUTION}},dl={{DELIVERY}},stop=0,err=0,max_err={{MAX_ERROR_COUNT}},init_suspended={{INITIALIZE_SUSPENDED}},has_consent={{CONSENT}},client_ts=Date.now(),server_ts={{SERVER_TS}},err_bo=0,max_err_bo={{MAX_ERROR_BACKOFF}},delay=0,cbcnt=0,g=window['{{TRACKING_GLOBAL_OBJECT}}']||{};
  window['{{TRACKING_GLOBAL_OBJECT}}'] = g;
  g._tsDelta = client_ts - (server_ts || client_ts);
  g._cb = {};
  g._hb = '{{HEARTBEAT_URL}}/';
  g._h = '{{HEARTBEAT_QUERY}}';
  g.getDID = function(cb) {
    if (cb) setTimeout(function() { cb('{{DEVICE_ID}}') }, 0);
  };
  g.getSID = function(cb) {
    if (cb) setTimeout(function() { cb('{{SESSION_ID}}') }, 0);
  };
  g.switchChannel = function(id, r, d, cb, cb_err) {
    var resume = g._hbTimer;
    g.stop();
    tcid = id;
    rs = r || 0;
    dl = d || 0;
    if (resume) g.start(cb, cb_err);
    if (!resume && cb) cb(true);
  };
  var LOG_EVENT_TYPE = {HB_REQ: 1, HB_RES: 2, HB_ERR: 3, HB_BOFF: 4, S_STRT: 5, S_STOP: 6};
  g.stop = function(cb) {
    try {
      if(g._hbTimer) {
        clearInterval(g._hbTimer);
        if (g._log) g._log(LOG_EVENT_TYPE.S_STOP);
      }
      if (g._lsTimer) {
        clearInterval(g._lsTimer)
      }
      g._asUpdate();
    } catch(ex) {}
    g._hbTimer = 0;
    g._lsTimer = 0;
    if (cb) setTimeout(function() { cb() }, 1);
  };
  g.start = function(cb, cb_err) {
    var cid = typeof tcid !== 'undefined' ? tcid : '{{CID}}';
    g._send('{{NEW_SESSION}}'+cid+'&r='+rs+'&d='+dl, cb, cb_err);
  };
  g.onLogEvent = function(cb) {
    g._log = cb;
  }
  var img = document.createElement('img');
  img.addEventListener('load', function () {
    delay = 0;
    err = 0;
    err_bo = 0;
    stop = 0;
    if (g._log) g._log(LOG_EVENT_TYPE.HB_RES);
  });
  img.addEventListener('error', function () {
    delay = 0;
    if(++err === max_err) {
      stop = max_err*(3<<err_bo);
      if(++err_bo > max_err_bo) err_bo = max_err_bo;
    }
    if (g._log) g._log(LOG_EVENT_TYPE.HB_ERR);
  });
  g._beat = function (c) {
    try {
      var cid = typeof c !== 'undefined' ? c : '{{CID}}';
      if(delay) return;
      if(stop > 0) {
        if (--stop === 0) err = 0;
        if (g._log) g._log(LOG_EVENT_TYPE.HB_BOFF);
        return;
      }
      delay = 1;
      img.setAttribute('src', g._hb + cid + g._h + Date.now() + '/{{PIXEL_NAME}}');
      if (g._log) g._log(LOG_EVENT_TYPE.HB_REQ);
    } catch(e) {}
  };
  var lsAvailable = !!window.localStorage && !!window.localStorage.setItem && !!window.localStorage.getItem;
  function serializeSessionEnds(sessionEnds, maxLength = 100) {
    var sids = Object.keys(sessionEnds);
    var start_idx = sids.length > maxLength ? maxLength - sids.length : 0;
    var serialized = '';
    for (var i = start_idx; i < sids.length; i++) {
      serialized = serialized + sids[i] + '=' + sessionEnds[sids[i]] + ',';
    }
    return serialized.slice(0, -1);
  }
  function deserializeSessionEnds(sessionEndsString) {
    if (!sessionEndsString) {
      return {}
    }
    var sessionEndEntries = sessionEndsString.split(',');
    var deserialized = {};
    for (var i = 0; i < sessionEndEntries.length; i++) {
      var split = sessionEndEntries[i].split('=');
      deserialized[split[0]] = split[1]
    }
    return deserialized;
  }
  g._asUpdate = function (s) {
    if (!lsAvailable) return;
    var sid = typeof s !== 'undefined' ? s : '{{SESSION_ID}}';
    localStorage.setItem('ase', sid + '=' + (Date.now() - g._tsDelta));
  }
  g._asEnd = function (s) {
    if (!lsAvailable) return;
    var activeSessionEnd = localStorage.getItem('ase');
    if (!activeSessionEnd) return;
    var prevSessionEnds = deserializeSessionEnds(localStorage.getItem('pse'));
    var split = activeSessionEnd.split("=");
    prevSessionEnds[split[0]] = split[1];
    localStorage.setItem('pse', serializeSessionEnds(prevSessionEnds));
    localStorage.removeItem('ase');
  }
  g._send = function (url, cb, cb_err) {
    if(cb) {
      g._cb[++cbcnt] = cb;
      url += '&cb=' + cbcnt;
    }
    var a=document.createElement('script');
    a.setAttribute('type', 'text/javascript');
    if(cb_err) a.addEventListener('error', cb_err);
    a.setAttribute('src', url + '&ts=' + Date.now());
    document.getElementsByTagName('head')[0].appendChild(a);
  };
  var uploadRetries = 3;
  function uploadSessionEnd (sid, ts, retries) {
    var img = document.createElement('img');
    img.addEventListener('load', function () {
      var prevSessionEnds = deserializeSessionEnds(localStorage.getItem('pse'));
      delete prevSessionEnds[sid];
      if (!Object.keys(prevSessionEnds).length) {
        localStorage.removeItem('pse');
      } else {
        localStorage.setItem('pse', serializeSessionEnds(prevSessionEnds));
      }
    });
    img.addEventListener('error', function () {
      if (!retries) return
      setTimeout(function () {
        uploadSessionEnd(sid, ts, --retries);
      }, (uploadRetries + 1 - retries) * 1000);
    })
    img.setAttribute('src', g._hb + sid + '/' + ts + '/{{SE_PIXEL_NAME}}');
  };
  g._seUpload = function () {
    if (!lsAvailable) return;
    var sessionEnds = deserializeSessionEnds(localStorage.getItem('pse'));
    var sids = Object.keys(sessionEnds);
    for (var i = 0; i < sids.length; i++) {
      uploadSessionEnd(sids[i], sessionEnds[sids[i]], uploadRetries);
    }
  }
  g._asEnd();
  if(!init_suspended) {
    g._hbTimer = setInterval(g._beat, {{HEARTBEAT_INTERVAL}});
    g._lsTimer = setInterval(g._asUpdate, 1000);
  }
  if(has_consent && lsAvailable) {
    localStorage.setItem('did', '{{DEVICE_ID}}');
  }
  if (g._log) {
    g._log(LOG_EVENT_TYPE.S_STRT, 'sid={{SESSION_ID}},did={{DEVICE_ID}},cid={{CID}}');
  }
  g._seUpload();
})();
