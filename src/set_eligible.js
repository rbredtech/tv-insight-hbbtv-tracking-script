/**
 * TV-Insight HbbTV Sampler Eligibility Script
 * ES3 compliant for HbbTV 1.1 devices
 *
 * Answers the one-time eligibility check of iframe-loader.js: marks the
 * device as eligible in the sampler if the backend found it on the whitelist.
 */
(function () {
  if ('{{ELIGIBLE}}' !== 'true') return;

  try {
    if (window.__tvi_sampler && typeof window.__tvi_sampler._setEligible === 'function') {
      window.__tvi_sampler._setEligible(true);
    }
  } catch (e) {
    // Silent fail
  }
})();
