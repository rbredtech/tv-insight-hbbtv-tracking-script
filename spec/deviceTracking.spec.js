const trackingScript = require("./helper/trackingScript.js");
const pageHelper = require("./helper/page");

const { CHANNEL_ID_TEST_A, CHANNEL_ID_TEST_B } = [9999, 9998];
const cases = [
  [true, "localhost:3000"],
  [false, "localhost:3000"],
];

let page;

beforeAll(async () => {
  page = await pageHelper.get();
}, 20000);

afterAll(async () => {
  await page.browser().close();
}, 20000);

describe.each(cases)("Device Tracking - Consent: %s", (consent, host) => {
  let did, sid;

  describe("when tracking is started", () => {
    beforeAll(async () => {
      const content = trackingScript(CHANNEL_ID_TEST_A, host, consent);
      await page.setContent(content);
      await page.waitForResponse((request) => request.url().includes("i.gif"));
      did = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getDID(resolve)}))`);
      sid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
    }, 20000);

    describe("and tracking is reloaded", () => {
      beforeAll(async () => {
        await page.reload();
        await page.setContent(trackingScript(CHANNEL_ID_TEST_B, host, consent));
        await page.waitForResponse((request) => request.url().includes("i.gif"));
      }, 10000);

      it(`should${consent ? " " : " NOT "}preserve device ID`, async () => {
        const newDid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getDID(resolve)}))`);
        if (consent) {
          expect(newDid).toBe(did);
        } else {
          expect(newDid).not.toBe(did);
        }
      });

      it(`should get a new session ID`, async () => {
        const newSid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
        expect(newSid).not.toBe(sid);
      });
    });
  });
});
