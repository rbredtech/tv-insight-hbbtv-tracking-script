const pageHelper = require("./helper/page");

const cases = [
  [true, true], // [consent, iFrame]
  [false, true],
  [true, false],
  [false, false],
];

const [CHANNEL_ID_TEST_A, CHANNEL_ID_TEST_B] = [9999, 9998];
const delivery = 1;
const resolution = 2;

let page;

describe.each(cases)("Device Tracking - Consent: %s - iFrame: %s", (consent, iFrame) => {
  let did, sid;

  beforeAll(async () => {
    page = await pageHelper.get(iFrame);
  }, 20000);

  afterAll(async () => {
    await page.browser().close();
  }, 20000);

  describe("when tracking is started", () => {
    beforeAll(async () => {
      await page.goto(
        `http://localhost:3000/puppeteer.html?cid=${CHANNEL_ID_TEST_A}&r=${resolution}&d=${delivery}&c=${consent}`,
        {
          waitUntil: "domcontentloaded",
        },
      );
      await page.waitForResponse((request) => request.url().includes("i.gif"));
      did = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getDID(resolve)}))`);
      sid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
    }, 20000);

    describe("and tracking is reloaded", () => {
      beforeAll(async () => {
        await page.goto(
          `http://localhost:3000/puppeteer.html?cid=${CHANNEL_ID_TEST_B}&r=${resolution}&d=${delivery}&c=${consent}`,
          {
            waitUntil: "domcontentloaded",
          },
        );
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
