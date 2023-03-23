(function(){try {
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
    var has_consent={{CONSENT}};
    var init_suspended={{INITIALIZE_SUSPENDED}};
    function getMeta() {
        try {
            if (!window['{{TRACKING_GLOBAL_OBJECT}}']) {
                setTimeout(getMeta, 1000);
                return;
            }
            var objs = document.getElementsByTagName('object');
            var mgr;
            for (var i=0; i<objs.length; i++) {
                if (objs[i].type === 'application/oipfApplicationManager') mgr = objs[i];
            }
            if (!mgr) return;
            var app = mgr.getOwnerApplication(document);
            if (app && app.privateData && app.privateData.currentChannel) {
                var curr = app.privateData.currentChannel;
                var idtype = curr.idType || '-1';
                var ccid = curr.ccid || '-1';
                var onid = curr.onid || '-1';
                var nid = curr.nid || '-1';

                var req = new XMLHttpRequest();
                window['{{TRACKING_GLOBAL_OBJECT}}'].getSID(function(sid) {
                    var m = '?sid=' + sid + '&idtype=' + idtype + '&ccid=' + ccid + '&onid=' + onid + '&nid=' + nid;
                    req.open('GET', '{{SESSION_SERVER_URL}}/meta' + m);
                    req.send();
                });
            }
        } catch(e) {}
    }
    function getQuery(did) {
        return '{{CID}}&r={{RESOLUTION}}&d={{DELIVERY}}' + (did ? '&did=' + did : '') + '&suspended=' + init_suspended + '{{OTHER_QUERY_PARAMS}}';
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
                message('cid;' + id + ';' + r + ';' + d, function(r) {cb && cb(r === '1')}, cb_err);
            };
            g.stop = function(cb) {
                message('stop', function(r) {cb && cb(r === '1')});
            };
            g.start = function(cb, cb_err) {
                message('start', function(r) {cb && cb(r === '1')}, cb_err);
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
        if (has_consent && window.localStorage && localStorage.getItem) {
            var _did = localStorage.getItem('did');
            if (_did) did = _did;
        }
        var a = document.createElement('script');
        a.setAttribute('type', 'text/javascript');
        a.setAttribute('src', '{{RA_SERVER_URL}}' + getQuery(did));
        a.addEventListener('load', callQueue);
        document.getElementsByTagName('head')[0].appendChild(a);
        if (!has_consent && window.localStorage && localStorage.removeItem) localStorage.removeItem('did');
    }

    setTimeout(getMeta, 1);
} catch (e) {}})();
