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
    heartbeatCount = 0;
    metaCount = 0;

    page = await pageHelper.get(iFrame);

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

    expect(heartbeatCount).toEqual(heartbeatCountAfterStop);
    expect(metaCount).toBe(metaCountAfterStop);
  }, 20000);

  it("stop() before switchChannel() should prevent heartbeats until start() is called", async () => {
    const newChannelId = 9998;

    // Stop tracking
    await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.stop(resolve)}))`);

    var heartbeatCountAfterStop = heartbeatCount;

    // Switch channel while stopped
    await page.evaluate(
      `(new Promise((resolve)=>{__hbb_tracking_tgt.switchChannel(${newChannelId}, ${resolution}, ${delivery}, resolve)}))`,
    );

    // Wait for multiple heartbeat intervals
    await wait(3000);

    // No new heartbeats should be sent
    expect(heartbeatCount).toEqual(heartbeatCountAfterStop);

    var heartbeatCountBeforeStart = heartbeatCount;

    // Now start tracking
    await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.start(resolve)}))`);

    // Wait for heartbeats to resume
    await wait(2000);

    // Heartbeats should now be sent
    expect(heartbeatCount).toBeGreaterThan(heartbeatCountBeforeStart);
  }, 20000);

  it("switchChannel() without stop() should resume heartbeats automatically", async () => {
    const newChannelId = 9997;

    var heartbeatCountBeforeSwitch = heartbeatCount;

    // Switch channel while tracking is running
    await page.evaluate(
      `(new Promise((resolve)=>{__hbb_tracking_tgt.switchChannel(${newChannelId}, ${resolution}, ${delivery}, resolve)}))`,
    );

    // Wait for new session to start and heartbeats to resume
    await wait(2000);

    // Heartbeats should continue automatically
    expect(heartbeatCount).toBeGreaterThan(heartbeatCountBeforeSwitch);
  }, 20000);
});
