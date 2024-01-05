(function () {
  var LOG_EVENT_TYPE = {HB_REQ: 1, HB_RES: 2, HB_ERR: 3, HB_BOFF: 4, S_STRT: 5, S_STOP: 6, SE_UPDATE_START: 7, SE_UPDATE_STOP: 8, SE_UPDATE: 9, SE_SEND: 10};
  var hbImg = document.createElement('img');
  var tcid,rs={{RESOLUTION}},dl={{DELIVERY}},stop=0,err=0,max_err={{MAX_ERROR_COUNT}},init_suspended={{INITIALIZE_SUSPENDED}},has_consent={{CONSENT}},client_ts_at_script_init=Date.now(),server_ts={{SERVER_TS}},err_bo=0,max_err_bo={{MAX_ERROR_BACKOFF}},delay=0,cbcnt=0,g=window['{{TRACKING_GLOBAL_OBJECT}}']||{};
  window['{{TRACKING_GLOBAL_OBJECT}}'] = g;
  g._tsDelta = client_ts_at_script_init - (server_ts || client_ts_at_script_init);
  g._lsAvailable=!!window.localStorage && !!localStorage.getItem && !!localStorage.setItem && !!localStorage.removeItem;
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
  g.stop = function(cb) {
    try {
      if(g._hbTimer) {
        clearInterval(g._hbTimer);
        if (g._log) g._log(LOG_EVENT_TYPE.S_STOP);
      }
      if (g._updateSessEndTimer) {
        clearInterval(g._updateSessEndTimer);
        if (g._log) g._log(LOG_EVENT_TYPE.SE_UPDATE_STOP);
      }
      g._updateSessEndTs();
    } catch(e) {}
    g._hbTimer = 0;
    g._updateSessEndTimer = 0;
    if (cb) setTimeout(function() { cb() }, 1);
  };
  g.start = function(cb, cb_err) {
    var cid = typeof tcid !== 'undefined' ? tcid : '{{CID}}';
    g._send('{{NEW_SESSION}}'+cid+'&r='+rs+'&d='+dl, cb, cb_err);
  };
  g.onLogEvent = function(cb) {
    g._log = cb;
  }
  hbImg.addEventListener('load', function () {
    delay = 0;
    err = 0;
    err_bo = 0;
    stop = 0;
    if (g._log) g._log(LOG_EVENT_TYPE.HB_RES);
  });
  hbImg.addEventListener('error', function () {
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
      hbImg.setAttribute('src', g._hb + cid + g._h + Date.now() + '/{{PIXEL_NAME}}?f={{HEARTBEAT_INTERVAL}}');
      if (g._log) g._log(LOG_EVENT_TYPE.HB_REQ);
    } catch(e) {}
  };
  function objectKeys(obj) {
    var keys = [];
    for (var key in obj) {
      keys.push(key);
    }
    return keys;
  }
  function serializeSessionEnds(sessionEnds, maxLength) {
    maxLength = maxLength || 100;
    var sids = objectKeys(sessionEnds);
    var start_idx = sids.length > maxLength ? maxLength - sids.length : 0;
    var serialized = '';
    for (var i = start_idx; i < sids.length; i++) {
      serialized = serialized+sids[i]+'='+sessionEnds[sids[i]];
      if (i < sids.length-1) {
        serialized=serialized+','
      }
    }
    return serialized;
  }
  function deserializeSessionEnds(sessionEndsString) {
    if (!sessionEndsString) {
      return {}
    }
    var sessionEndEntries = sessionEndsString.split(',');
    var deserialized = {};
    for (var i=0; i<sessionEndEntries.length; i++) {
      var split = sessionEndEntries[i].split('=');
      deserialized[split[0]] = split[1]
    }
    return deserialized;
  }
  g._updateSessEndTs = function (s) {
    if (!g._lsAvailable) return;
    var sid = typeof s !== 'undefined' ? s : '{{SESSION_ID}}';
    var ts = Date.now() - g._tsDelta
    localStorage.setItem('ase', sid+'='+ts);
    if (g._log) g._log(LOG_EVENT_TYPE.SE_UPDATE, "sid="+sid+", ts="+ts);
  }
  g._closeActiveSessEnd = function () {
    if (!g._lsAvailable) return;
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
  function uploadSessionEndSuccess (sid, ts) {
    if (!g._lsAvailable) return;
    var prevSessionEnds = deserializeSessionEnds(localStorage.getItem('pse'));
    delete prevSessionEnds[sid];
    pseKeys = objectKeys(prevSessionEnds);
    if (!pseKeys.length) {
      localStorage.removeItem('pse');
    } else {
      localStorage.setItem('pse', serializeSessionEnds(prevSessionEnds));
    }
    if (g._log) g._log(LOG_EVENT_TYPE.SE_SEND, "sid="+sid+", ts="+ts );
  }
  function uploadSessionEnd (sid, ts, retries, successCB, errorCB) {
    try {
      var seImg = document.createElement('img');
      seImg.addEventListener('load', function () {
        if (successCB && typeof successCB === 'function') {
          successCB(sid, ts);
        }
      });
      seImg.addEventListener('error', function () {
        if (!retries) {
          if (errorCB && typeof errorCB === 'function') {
            errorCB(sid, ts);
          }
          return;
        }
        setTimeout(function () {
          uploadSessionEnd(sid, ts, --retries, successCB, errorCB);
        }, (max_err_bo + 1 - retries) * 1000);
      });
      seImg.setAttribute('src', g._hb + sid + '/' + ts + '/{{SE_PIXEL_NAME}}');
    } catch(e) {}
  };
  g._sessEndUpload = function () {
    if (!g._lsAvailable) return;
    var sessionEnds = deserializeSessionEnds(localStorage.getItem('pse'));
    var sids = objectKeys(sessionEnds);
    for (var i = 0; i < sids.length; i++) {
      uploadSessionEnd(sids[i], sessionEnds[sids[i]], max_err_bo, uploadSessionEndSuccess);
    }
  }
  if(!init_suspended) {
    g._hbTimer = setInterval(g._beat, {{HEARTBEAT_INTERVAL}});
  }
  if (g._lsAvailable) {
    g._closeActiveSessEnd();
    g._sessEndUpload();
    g._updateSessEndTimer = setInterval(g._updateSessEndTs, 1000);
  }
  if(has_consent && g._lsAvailable) {
    localStorage.setItem('did', '{{DEVICE_ID}}');
  }
  if (g._log) {
    g._log(LOG_EVENT_TYPE.S_STRT, 'sid={{SESSION_ID}},did={{DEVICE_ID}},cid={{CID}}');
  }
})();
