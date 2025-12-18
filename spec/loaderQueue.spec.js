const pageHelper = require("./helper/page");

const cases = [
  [true, true], // [consent, iFrame]
  [false, true],
  [true, false],
  [false, false],
];

const channelId = 9999;
const delivery = 1;
const resolution = 2;

let page;

describe.each(cases)("Loader queue flushing - Consent: %s - iFrame: %s", (consent, iFrame) => {
  let allowRa;
  let pendingRaRequests;

  beforeAll(async () => {
    allowRa = false;
    pendingRaRequests = [];

    page = await pageHelper.get(iFrame);
    await page.setRequestInterception(true);

    page.on("request", (req) => {
      try {
        var isRaRequest = req.url().includes(iFrame ? "ra_if.js" : "ra.js");
        if (isRaRequest && !allowRa) {
          pendingRaRequests[pendingRaRequests.length] = req;
          return;
        }
        req.continue();
      } catch (e) {
        try {
          req.continue();
        } catch (e2) {
          try {
            req.abort();
          } catch (e3) {
            return;
          }
        }
      }
    });

    await page.goto(
      `http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=${consent}`,
      {
        waitUntil: "domcontentloaded",
      },
    );

    // Ensure loader (tracking.js = iframe-loader) is executed and stub is created.
    await page.waitForResponse((request) => request.url().includes("tracking.js"));
    await page.waitForFunction(function () {
      // eslint-disable-next-line no-undef
      return !!window.__hbb_tracking_tgt;
    });
  }, 30000);

  afterAll(async () => {
    await page.browser().close();
  }, 20000);

  it("should queue API calls made before RA script loads and flush them after load", async () => {
    // Queue calls while RA script is blocked
    await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      __hbb_tracking_tgt.getDID(function () {
        return;
      });
      // eslint-disable-next-line no-undef
      __hbb_tracking_tgt.getSID(function () {
        return;
      });
    });

    // Ensure calls were queued
    const queueLength = await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      return __hbb_tracking_tgt._q ? __hbb_tracking_tgt._q.length : -1;
    });
    expect(queueLength).toBe(2);

    // Allow RA script to load and flush the queue
    allowRa = true;
    for (var i = 0; i < pendingRaRequests.length; i++) {
      pendingRaRequests[i].continue();
    }

    // Wait until tracking is active (heartbeat pixel)
    const httpResponse = await page.waitForResponse((response) => response.url().includes("i.gif"), { timeout: 15000 });
    expect(httpResponse.ok()).toBe(true);

    // Queue should be cleared
    const queueLengthAfter = await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      return __hbb_tracking_tgt._q ? __hbb_tracking_tgt._q.length : -1;
    });
    expect(queueLengthAfter).toBe(0);

    // And methods should be callable normally
    const did = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getDID(resolve)}))`);
    const sid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
    expect(typeof did).toBe("string");
    expect(typeof sid).toBe("string");
    expect(did.length).toBeGreaterThan(0);
    expect(sid.length).toBeGreaterThan(0);
  }, 30000);
});
