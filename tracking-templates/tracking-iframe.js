(function () {
  var g = window['{{TRACKING_GLOBAL_OBJECT}}'];
  g._message = function (msg) {
    if (window['parent'] && window.parent['postMessage']) {
      window.parent.postMessage(msg, '*');
    }
  };
  if (window['addEventListener']) {
    window.addEventListener(
      'message',
      function (ev) {
        var m = ev.data.split(';');
        var id = m[0];

        switch (m[1]) {
          case 'did':
            g.getDID(function (r) {
              g._message(id + ';' + r);
            });
            break;
          case 'sid':
            g.getSID(function (r) {
              g._message(id + ';' + r);
            });
            break;
          case 'cid':
            g.switchChannel(
              m[2],
              m[3],
              m[4],
              function (r) {
                g._message(id + (r ? ';1' : ';0'));
              },
              function () {
                g._message('err;' + id);
              },
            );
            break;
          case 'stop':
            g.stop(function () {
              g._message(id + ';' + 1);
            });
            break;
          case 'start':
            g.start(
              function (r) {
                g._message(id + (r ? ';1' : ';0'));
              },
              function () {
                g._message('err;' + id);
              },
            );
            break;
          case 'log':
            g.onLogEvent(function () {
              g._message(id + ';' + [].slice.call(arguments).join(':'));
            });
            break;
          default:
            break;
        }
      },
      false,
    );
  }
})();
