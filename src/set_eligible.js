/**
 * TV-Insight HbbTV Sampler Eligibility Script
 * ES3 compliant for HbbTV 1.1 devices
 *
 * Answers the eligibility check of iframe-loader.js: marks the device as
 * eligible in the sampler if the backend found it on the whitelist, and
 * remembers the round it was checked in. A whitelisted device's round is only
 * remembered once the sampler confirms, so a sampler that never loads on this
 * page doesn't use up the check; a failed request is retried on the next load.
 */
(function () {
  var eligible = '{{ELIGIBLE}}' === 'true';

  function rememberRound() {
    try {
      // ELIGIBILITY_CHECKED_KEY in iframe-loader.js
      localStorage.setItem('_tvi_eligibility_checked', '{{ELIGIBILITY_ROUND}}');
    } catch (e) {
      // Silent fail
    }
  }

  try {
    if (!eligible) {
      rememberRound();
    } else if (window.__tvi_sampler && typeof window.__tvi_sampler._setEligible === 'function') {
      window.__tvi_sampler._setEligible(true, rememberRound);
    }
  } catch (e) {
    // Silent fail
  }
})();
