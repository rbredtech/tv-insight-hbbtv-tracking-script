const pageHelper = require("./helper/page");
const { wait } = require("./helper/wait");

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

describe.each(cases)("Stop behavior - Consent: %s - iFrame: %s", (consent, iFrame) => {
  let heartbeatCount;
  let metaCount;

  beforeEach(async () => {
    const userAgent = !iFrame
      ? "HbbTV/1.1.1 (+PVR;Humax;HD FOX+;1.00.20;1.0;)CE-HTML/1.0 ANTGalio/3.3.0.26.03"
      : undefined;

    heartbeatCount = 0;
    metaCount = 0;

    page = await pageHelper.get(userAgent);

    page.on("request", (req) => {
      var url = req.url();
      if (url.indexOf("i.gif") >= 0) {
        heartbeatCount++;
      }
      if (url.indexOf("/meta.gif") >= 0) {
        metaCount++;
      }
    });

    await page.goto(
      `http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=${consent}`,
      {
        waitUntil: "domcontentloaded",
      },
    );

    await page.waitForResponse((request) => request.url().includes("i.gif"));
  }, 20000);

  afterEach(async () => {
    await page.browser().close();
  }, 20000);

  it("stop() should stop subsequent heartbeat requests and cancel scheduled meta", async () => {
    // Call stop early (before the 5s meta timeout fires).
    await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.stop(resolve)}))`);

    var heartbeatCountAfterStop = heartbeatCount;
    var metaCountAfterStop = metaCount;

    // Wait long enough for multiple heartbeat intervals and the meta timeout (5s)
    await wait(6500);

    // Allow at most one in-flight heartbeat, but no continued tracking
    expect(heartbeatCount).toBeLessThanOrEqual(heartbeatCountAfterStop + 1);
    expect(metaCount).toBe(metaCountAfterStop);
  }, 20000);
});
