(function () {
  var LOG_EVENT_TYPE = {HB_REQ: 1, HB_RES: 2, HB_ERR: 3, HB_BOFF: 4, S_STRT: 5, S_STOP: 6};
  var img = document.createElement('img');
  var cid='{{CID}}',rs={{RESOLUTION}},dl={{DELIVERY}},stop=0,err=0,max_err={{MAX_ERROR_COUNT}},init_suspended={{INITIALIZE_SUSPENDED}},has_consent={{CONSENT}},err_bo=0,max_err_bo={{MAX_ERROR_BACKOFF}},delay=0,cbcnt=0,g=window['{{TRACKING_GLOBAL_OBJECT}}']||{};
  window['{{TRACKING_GLOBAL_OBJECT}}'] = g;
  g._cb = {};
  g._hb = '{{HEARTBEAT_URL}}/';
  g._h = '{{HEARTBEAT_QUERY}}';
  g.getDID = function(cb) {
    if (cb) setTimeout(function() { cb('{{DEVICE_ID}}') }, 0);
  };
  g.getSID = function(cb) {
    if (cb) setTimeout(function() { cb('{{SESSION_ID}}') }, 0);
  };
  g._skip = init_suspended;
  g.switchChannel = function(id, r, d, cb, cb_err) {
    g.stop();
    cid = id;
    rs = r || 0;
    dl = d || 0;
    if (cb) g.start(cb, cb_err);
  };
  g.stop = function(cb) {
    try {
      if(g._timer) {
        clearInterval(g._timer);
        if (g._log) g._log(LOG_EVENT_TYPE.S_STOP);
      }
    } catch(ex) {}
    g._timer = 0;
    if (cb) setTimeout(function() { cb() }, 1);
  };
  g.start = function(cb, cb_err) {
    g._send('{{NEW_SESSION}}'+cid+'&r='+rs+'&d='+dl, cb, cb_err);
  };
  g.onLogEvent = function(cb) {
    g._log = cb;
  }
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
  g._beat = function () {
    try {
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
  if(!init_suspended) g._timer = setInterval(g._beat, {{HEARTBEAT_INTERVAL}});
  if (g._log) g._log(LOG_EVENT_TYPE.S_STRT, 'sid={{SESSION_ID}},did={{DEVICE_ID}},cid={{CID}}');
  if(has_consent && window.localStorage && localStorage.setItem) {
    localStorage.setItem('did', '{{DEVICE_ID}}');
  }
})();
