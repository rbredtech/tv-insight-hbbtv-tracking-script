(function(){
  function objectKeys(obj) {
    var keys = [];
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        keys.push(key);
      }
    }
    return keys;
  }
  function serializeConsentByVendorId(consentByVendorId) {
    if (!consentByVendorId) {
      return undefined;
    }
    var serialized = '';
    try {
      var vendorIds = objectKeys(consentByVendorId);
      for (var i = 0; i < vendorIds.length; i++) {
        serialized = serialized + vendorIds[i] + '~' + consentByVendorId[vendorIds[i]];
        if (i < vendorIds.length - 1) {
          serialized = serialized + ',';
        }
      }
    } catch (e) {}
    return serialized;
  }
  function getSamplerPercentile(callback) {
    if (!window.__tvi_sampler || !window.__tvi_sampler.getPercentile || typeof window.__tvi_sampler.getPercentile !== 'function') {
      callback(undefined);
      return;
    }
    window.__tvi_sampler.getPercentile(callback);
  }
  function getConsentStatus(callback) {
    if (!window.__cmpapi || typeof window.__cmpapi !== 'function') {
        callback(undefined);
        return;
    }
    window.__cmpapi('getTCData', 2, function(tcData) {
        if (tcData.cmpStatus !== 'loaded') {
            callback(undefined);
            return;
        }
        callback(tcData.vendor.consents);
    });
  }
  try {
    var g = window['{{TRACKING_GLOBAL_OBJECT}}'] || {};
    window['{{TRACKING_GLOBAL_OBJECT}}'] = g;
    g._q = [];
    g.getDID = function() {
        g._q[g._q.length] = {m: 'getDID', a: Array.prototype.slice.call(arguments)};
    }
    g.getSID = function() {
        g._q[g._q.length] = {m: 'getSID', a: Array.prototype.slice.call(arguments)};
    }
    g.switchChannel = function() {
        g._q[g._q.length] = {m: 'switchChannel', a: Array.prototype.slice.call(arguments)};
    }
    g.stop = function() {
        g._q[g._q.length] = {m: 'stop', a: Array.prototype.slice.call(arguments)};
    }
    g.start = function() {
        g._q[g._q.length] = {m: 'start', a: Array.prototype.slice.call(arguments)};
    }
    g.onLogEvent = function() {
        g._q[g._q.length] = {m: 'onLogEvent', a: Array.prototype.slice.call(arguments)};
    }
    g._sendMeta = function() {
        try {
            if (!window['{{TRACKING_GLOBAL_OBJECT}}']) {
                setTimeout(g._sendMeta, 1000);
                return;
            }
            var objs = document.getElementsByTagName('object');
            var mgr;
            for (var i=0; i<objs.length; i++) {
                if (objs[i].type === 'application/oipfApplicationManager') mgr = objs[i];
            }
            if (!mgr) {
                var el = document.createElement('object');
                el.type = 'application/oipfApplicationManager';
                document.body.appendChild(el);
                mgr = el;
            };
            var app = typeof mgr.getOwnerApplication === 'function' ? mgr.getOwnerApplication(document) : null;
            var m  = '';
            if (app && app.privateData && app.privateData.currentChannel) {
                var curr = app.privateData.currentChannel;
                m = m + (curr.idType !== undefined ? '&idtype=' + curr.idType : '');
                m = m + (curr.ccid !== undefined ? '&ccid=' + curr.ccid : '');
                m = m + (curr.onid !== undefined ? '&onid=' + curr.onid : '');
                m = m + (curr.nid !== undefined ? '&nid=' + curr.nid : '');
                m = m + (curr.name !== undefined ? '&name=' + curr.name : '');
                m = m + (curr.isHD !== undefined ? '&isHD=' + curr.isHD : '');
            }
            window['{{TRACKING_GLOBAL_OBJECT}}'].getSID(function (sid) {
                m = m + (sid !== undefined ? '&sid=' + sid : '');
                getConsentStatus(function (consentByVendorId) {
                    var vid = serializeConsentByVendorId(consentByVendorId);
                    m = m + (vid !== undefined ? '&vid=' + vid : '');
                    getSamplerPercentile(function (spc) {
                        m = m + ( spc !== undefined ? '&spc=' + spc : '');
                        var mImg = document.createElement('img');
                        m = (m.length ? '?' + m.substring(1) : '');
                        mImg.setAttribute('src', '{{SESSION_SERVER_URL}}/meta.gif' + m);
                    });
                });
            });
        } catch (e) {}
    }
    var has_consent={{CONSENT}};
    var init_suspended={{INITIALIZE_SUSPENDED}};
    var ls = false;
    try {
        localStorage.setItem('_test', '1');
        ls = true;
        localStorage.removeItem('_test');
    } catch (e) {
        ls = false;
    }
    function getQuery(did) {
        return '{{CID}}&r={{RESOLUTION}}&d={{DELIVERY}}' + (did ? '&did=' + did : '') + '&suspended=' + init_suspended + '&ls=' + ls + '&ts=' + Date.now() + '{{OTHER_QUERY_PARAMS}}';
    }
    function callQueue() {
        for (var i=0; i<g._q.length; i++) {
            var f=g._q[i];
            g[f.m].apply(null, f.a);
        }
        delete g._q;
    }
    function loadiframe() {
        if (document.getElementsByTagName('body').length < 1) {
            setTimeout(loadiframe, 100);
            return;
        }
        var iframe = document.createElement('iframe');
        iframe.setAttribute('src', '{{IFRAME_SERVER_URL}}' + getQuery());
        iframe.setAttribute('style', 'position:fixed;border:0;outline:0;top:-999px;left:-999px;width:0;height:0;');
        iframe.setAttribute('frameborder', '0');
        document.getElementsByTagName('body')[0].appendChild(iframe);

        iframe.addEventListener('load', function() {
            g.getDID = function(cb) {
                message('did', function(r) {cb && cb(r)});
            };
            g.getSID = function(cb) {
                message('sid', function(r) {cb && cb(r)});
            };
            g.switchChannel = function(id, r, d, cb, cb_err) {
                message('cid;' + id + ';' + r + ';' + d, function(r) {
                    cb && cb(r === '1');
                    setTimeout(g._sendMeta, 1);
                }, cb_err);
            };
            g.stop = function(cb) {
                message('stop', function(r) {cb && cb(r === '1')});
            };
            g.start = function(cb, cb_err) {
                message('start', function(r) {
                    cb && cb(r === '1');
                    setTimeout(g._sendMeta, 1);
                }, cb_err);
            };
            g.onLogEvent = function(cb) {
                message('log', function(r) {cb && cb.apply(null, r.split(':').map(function(e, i){return i === 0 ? parseInt(e, 10) : e}))});
            };
            var cbcnt = 0;
            var cbmap = {};
            var isLog = 0;
            function message(m, cb, cb_err) {
                if (!iframe.contentWindow) {
                    if (cb_err) cb_err();
                    return;
                }
                cbmap[++cbcnt] = [cb, cb_err];
                if (m === 'log') isLog = cbcnt;
                iframe.contentWindow.postMessage(cbcnt + ';' + m, '{{SESSION_SERVER_HOST}}');
            }
            if (window.addEventListener) {
                window.addEventListener('message', function(ev) {
                    try {
                        if (ev.origin === '{{SESSION_SERVER_HOST}}' && ev.data) {
                            var m = ev.data.split(';');
                            var pos = m[0] === 'err' ? 1 : 0;
                            var id = m[pos];
                            var cb = cbmap[id][pos];
                            if (isLog != id) delete cbmap[id];
                            if (cb) cb(m[pos+1]);
                        }
                    } catch (e) {}
                }, false);
            }
            callQueue();
        });
    }

    var useIfr = false;
    var n = window.navigator;
    if (n && n.userAgent && n.userAgent.indexOf && n.userAgent.toLowerCase) {
        var UAS = ['antgalio','hybrid','maple','presto','technotrend goerler','viera 2011'];
        var blk = false;
        var u = n.userAgent.toLowerCase();
        for (var i=0; i<UAS.length; i++) {
            if (u.indexOf(UAS[i]) >= 0) {
                blk = true;
                break;
            }
        }
        useIfr = !blk;
    }

    if (useIfr) {
        setTimeout(loadiframe, 1);
    } else {
        var did;
        if (has_consent && ls) {
            var _did = localStorage.getItem('did');
            if (_did) did = _did;
        }
        var a = document.createElement('script');
        a.setAttribute('type', 'text/javascript');
        a.setAttribute('src', '{{RA_SERVER_URL}}' + getQuery(did));
        a.addEventListener('load', callQueue);
        document.getElementsByTagName('head')[0].appendChild(a);
        if (!has_consent && ls) localStorage.removeItem('did');
    }

    setTimeout(g._sendMeta, 1);
  } catch (e) {}
})();
