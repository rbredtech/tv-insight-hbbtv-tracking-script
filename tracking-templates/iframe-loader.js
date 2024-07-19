(function () {
  try {
    var g = window['{{TRACKING_GLOBAL_OBJECT}}'] || {};
    window['{{TRACKING_GLOBAL_OBJECT}}'] = g;
    g._q = [];

    g.getDID = function () {
      g._q[g._q.length] = { m: 'getDID', a: Array.prototype.slice.call(arguments) };
    };
    g.getSID = function () {
      g._q[g._q.length] = { m: 'getSID', a: Array.prototype.slice.call(arguments) };
    };
    g.switchChannel = function () {
      g._q[g._q.length] = { m: 'switchChannel', a: Array.prototype.slice.call(arguments) };
    };
    g.stop = function () {
      g._q[g._q.length] = { m: 'stop', a: Array.prototype.slice.call(arguments) };
    };
    g.start = function () {
      g._q[g._q.length] = { m: 'start', a: Array.prototype.slice.call(arguments) };
    };
    g.onLogEvent = function () {
      g._q[g._q.length] = { m: 'onLogEvent', a: Array.prototype.slice.call(arguments) };
    };
    g._sendMeta = function () {
      try {
        if (!window['{{TRACKING_GLOBAL_OBJECT}}']) {
          setTimeout(g._sendMeta, 1000);
          return;
        }
        var objs = document.getElementsByTagName('object');
        var mgr;
        for (var i = 0; i < objs.length; i++) {
          if (objs[i].type === 'application/oipfApplicationManager') mgr = objs[i];
        }
        if (!mgr) {
          var el = document.createElement('object');
          el.type = 'application/oipfApplicationManager';
          document.body.appendChild(el);
          mgr = el;
        }
        var app = mgr.getOwnerApplication(document);
        if (app && app.privateData && app.privateData.currentChannel) {
          var curr = app.privateData.currentChannel;
          var idtype = curr.idType || '-1';
          var ccid = curr.ccid || '-1';
          var onid = curr.onid || '-1';
          var nid = curr.nid || '-1';
          var name = curr.name || 'undefined';
          var isHD = curr.isHD || 'undefined';

          var req = new XMLHttpRequest();
          window['{{TRACKING_GLOBAL_OBJECT}}'].getSID(function (sid) {
            var m = '?sid=' + sid + '&idtype=' + idtype + '&ccid=' + ccid + '&onid=' + onid + '&nid=' + nid + '&name=' + name + '&isHD=' + isHD;
            req.open('GET', '{{SESSION_SERVER_URL}}/meta' + m);
            req.send();
          });
        }
      } catch (e) {}
    };

    var hasConsent = '{{CONSENT}}' === 'true';
    var initSuspended = '{{INITIALIZE_SUSPENDED}}' === 'true';
    var localStorageAvailable = !!window.localStorage && !!localStorage.getItem && !!localStorage.setItem && !!localStorage.removeItem;

    function getQuery(did) {
      return (
        '{{CID}}&r={{RESOLUTION}}&d={{DELIVERY}}' +
        (did ? '&did=' + did : '') +
        '&suspended=' +
        initSuspended +
        '&ls=' +
        localStorageAvailable +
        '&ts=' +
        Date.now() +
        '{{OTHER_QUERY_PARAMS}}'
      );
    }

    function callQueue() {
      for (var i = 0; i < g._q.length; i++) {
        var f = g._q[i];
        g[f.m].apply(null, f.a);
      }
      delete g._q;
    }

    function loadIFrame() {
      if (document.getElementsByTagName('body').length < 1) {
        setTimeout(loadIFrame, 100);
        return;
      }

      var iframe = document.createElement('iframe');
      iframe.setAttribute('src', '{{IFRAME_SERVER_URL}}' + getQuery());
      iframe.setAttribute('style', 'position:fixed;border:0;outline:0;top:-999px;left:-999px;width:0;height:0;');
      iframe.setAttribute('frameborder', '0');
      document.getElementsByTagName('body')[0].appendChild(iframe);

      iframe.addEventListener('load', function () {
        g.getDID = function (cb) {
          message('did', function (r) {
            cb && cb(r);
          });
        };

        g.getSID = function (cb) {
          message('sid', function (r) {
            cb && cb(r);
          });
        };

        g.switchChannel = function (id, r, d, cb, cb_err) {
          message(
            'cid;' + id + ';' + r + ';' + d,
            function (r) {
              cb && cb(r === '1');
              setTimeout(g._sendMeta, 1);
            },
            cb_err,
          );
        };

        g.stop = function (cb) {
          message('stop', function (r) {
            cb && cb(r === '1');
          });
        };

        g.start = function (cb, cb_err) {
          message(
            'start',
            function (r) {
              cb && cb(r === '1');
              setTimeout(g._sendMeta, 1);
            },
            cb_err,
          );
        };

        g.onLogEvent = function (cb) {
          message('log', function (r) {
            cb &&
              cb.apply(
                null,
                r.split(':').map(function (e, i) {
                  return i === 0 ? parseInt(e, 10) : e;
                }),
              );
          });
        };

        var callbackCount = 0;
        var callbackMap = {};
        var isLog = 0;

        function message(m, cb, cb_err) {
          if (!iframe.contentWindow) {
            if (cb_err) cb_err();
            return;
          }
          callbackMap[++callbackCount] = [cb, cb_err];
          if (m === 'log') isLog = callbackCount;
          iframe.contentWindow.postMessage(callbackCount + ';' + m, '{{SESSION_SERVER_HOST}}');
        }

        if (window.addEventListener) {
          window.addEventListener(
            'message',
            function (ev) {
              try {
                if (ev.origin === '{{SESSION_SERVER_HOST}}' && ev.data) {
                  var m = ev.data.split(';');
                  var pos = m[0] === 'err' ? 1 : 0;
                  var id = m[pos];
                  var cb = callbackMap[id][pos];
                  if (isLog != id) delete callbackMap[id];
                  if (cb) cb(m[pos + 1]);
                }
              } catch (e) {}
            },
            false,
          );
        }
        callQueue();
      });
    }

    var useIFrame = false;
    var navigator = window.navigator;
    if (navigator && navigator.userAgent && navigator.userAgent.indexOf && navigator.userAgent.toLowerCase) {
      var blockedUserAgents = ['antgalio', 'hybrid', 'maple', 'presto', 'technotrend goerler', 'viera 2011'];
      var block = false;
      var userAgent = navigator.userAgent.toLowerCase();
      for (var i = 0; i < blockedUserAgents.length; i++) {
        if (userAgent.indexOf(blockedUserAgents[i]) >= 0) {
          block = true;
          break;
        }
      }
      useIFrame = !block;
    }

    if (useIFrame) {
      setTimeout(loadIFrame, 1);
    } else {
      var did;
      if (hasConsent && localStorageAvailable) {
        var _did = localStorage.getItem('did');
        if (_did) did = _did;
      }
      var script = document.createElement('script');
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('src', '{{RA_SERVER_URL}}' + getQuery(did));
      script.addEventListener('load', callQueue);
      document.getElementsByTagName('head')[0].appendChild(script);
      if (!hasConsent && localStorageAvailable) localStorage.removeItem('did');
    }

    setTimeout(g._sendMeta, 1);
  } catch (e) {}
})();
