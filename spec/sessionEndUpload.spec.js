const trackingScript = require("./helper/trackingScript.js");
const pageHelper = require("./helper/page");

const { CHANNEL_ID_TEST_A, CHANNEL_ID_TEST_B } = [9999, 9998];
const cases = [[true, "localhost:3000"]];

let page;

beforeAll(async () => {
  page = await pageHelper.get();
}, 20000);

afterAll(async () => {
  await page.browser().close();
}, 20000);

describe.each(cases)("Session End Upload - Consent: %s", (consent, host) => {
  describe("when tracking is started", () => {
    let sid;

    beforeAll(async () => {
      const content = trackingScript(CHANNEL_ID_TEST_A, host, consent);
      await page.setContent(content);
      await page.waitForResponse((request) => request.url().includes("i.gif"));
      sid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
    }, 20000);

    describe("and tracking is reloaded", () => {
      beforeAll(async () => {
        await page.reload();
        await page.setContent(trackingScript(CHANNEL_ID_TEST_B, host, consent));
      }, 10000);

      it(`should upload previous session's end timestamp`, async () => {
        const regex = new RegExp(`${sid}/\\d*/e\\.gif`);
        await page.waitForResponse((request) => regex.test(request.url()));
      });
    });
  });
});
