const trackingScript = require("./helper/trackingScript.js");
const pageHelper = require("./helper/page");
const { wait } = require("./helper/wait");

const [CHANNEL_ID_TEST_A, CHANNEL_ID_TEST_B] = [9999, 9998];
const cases = [[true, "localhost:3000"]];

let page;

describe.each(cases)("Session End Upload - Consent: %s", (consent, host) => {
  describe("when tracking is started", () => {
    let sessIdFirstSession;

    beforeEach(async () => {
      page = await pageHelper.get();
      const content = trackingScript(CHANNEL_ID_TEST_A, host, consent);
      await page.setContent(content);
      await page.waitForResponse((request) => request.url().includes("i.gif"));
      sessIdFirstSession = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
    }, 20000);

    afterEach(async () => {
      await page.browser().close();
    }, 20000);

    describe("and tracking is reloaded", () => {
      it(`should upload previous session's end timestamp`, async () => {
        await page.reload();
        await page.setContent(trackingScript(CHANNEL_ID_TEST_B, host, consent));
        const regex = new RegExp(`${sessIdFirstSession}/\\d*/e\\.gif`);
        await page.waitForResponse((request) => regex.test(request.url()));
      }, 10000);
    });

    describe("and switchChannel is called", () => {
      it(`should upload previous sessions's end timestamp`, async () => {
        await wait(2000);
        await page.evaluate(
          `(new Promise((resolve)=>{__hbb_tracking_tgt.switchChannel(${CHANNEL_ID_TEST_B}, 1, 1, resolve)}))`,
        );
        const regex = new RegExp(`${sessIdFirstSession}/\\d*/e\\.gif`);
        await page.waitForResponse((request) => regex.test(request.url()));
      }, 10000);
    });
  });
});
