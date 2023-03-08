module.exports = function trackingScript(
  channelId = 9999,
  trackingUrl = "session-preview.prod.tv-insight.com",
  suspended = false,
  delivery = 0,
  resolution = 0,
) {
  return `
        <script type='text/javascript'>
            (function(a) {try{a.type="text/javascript";a.src="http://${trackingUrl}/${channelId}/tracking.js?r=${resolution}&d=${delivery}${
    suspended ? "&suspended=true" : ""
  }&t="+Date.now();document.getElementsByTagName("head")[0].appendChild(a)}catch(b){}})
            (document.createElement("script"));
        </script>
    `;
};
