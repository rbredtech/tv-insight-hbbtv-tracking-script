const trackingScript = require("./helper/trackingScript.js");
const pageHelper = require("./helper/page");

const { CHANNEL_ID_TEST_A, CHANNEL_ID_TEST_B } = [9999, 9998];
const cases = [["localhost:3000", true]];

let page;

beforeAll(async () => {
  page = await pageHelper.get();
}, 20000);

afterAll(async () => {
  await page.browser().close();
}, 20000);

describe.each(cases)("Device Tracking - %s - Consent: %s", (host, consent) => {
  let did, sid;

  describe("WHEN Tracking is started", () => {
    beforeAll(async () => {
      const content = trackingScript(CHANNEL_ID_TEST_A, host);
      await page.setContent(content);
      await page.waitForResponse((request) => request.url().includes("i.gif"));
      did = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getDID(resolve)}))`);
      sid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
    }, 20000);

    describe("AND the tracking is re-loaded", () => {
      beforeAll(async () => {
        await page.reload();
        await page.setContent(trackingScript(CHANNEL_ID_TEST_B, host));
        await page.waitForResponse((request) => request.url().includes("i.gif"));
      }, 10000);

      it(`should ${consent ? "" : "NOT"} preserve Device ID`, async () => {
        const newDid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getDID(resolve)}))`);
        if (consent) {
          expect(newDid).toBe(did);
        } else {
          expect(newDid).not.toBe(did);
        }
      });

      it(`should get a new Session ID`, async () => {
        const newSid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
        expect(newSid).not.toBe(sid);
      });
    });
  });
});
