const pageHelper = require("./helper/page");

const cases = [
  [true, true], // [consent, suspended]
  [false, true],
  [true, false],
  [false, false],
];

const delivery = 1;
const resolution = 2;

describe.each(cases)("Initialize suspended - Consent: %s - Suspended: %s", (consent, suspended) => {
  let page;

  beforeAll(async () => {
    page = await pageHelper.get();
  }, 20000);

  afterAll(async () => {
    await page.browser().close();
  }, 20000);

  describe(`WHEN Tracking is started with suspended=${suspended}`, () => {
    beforeAll(async () => {
      await page.goto(
        `http://localhost:3000/puppeteer.html?cid=9999&r=${resolution}&d=${delivery}&c=${consent}&suspended=${suspended}`,
        {
          waitUntil: "domcontentloaded",
        },
      );
    }, 5000);

    test(`Should ${suspended ? "NOT " : ""}track`, async () => {
      let heartbeatRequest;

      try {
        heartbeatRequest = await page.waitForRequest((request) => request.url().includes("i.gif"), { timeout: 1500 });
      } catch (e) {
        console.error(e);
      } finally {
        if (suspended) {
          expect(heartbeatRequest).toBeUndefined();
        } else {
          expect(heartbeatRequest).toBeDefined();
        }
      }
    }, 60000);

    describe("AND start() API method is called", () => {
      let startResult;
      beforeAll(async () => {
        startResult = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.start(resolve)}))`);
      });

      it(`should return success`, async () => {
        expect(startResult).toBe(true);
      });

      it(`should do tracking`, async () => {
        let heartbeatRequest;

        try {
          heartbeatRequest = await page.waitForRequest((request) => request.url().includes("i.gif"), { timeout: 3000 });
        } catch (e) {
          console.error(e);
        } finally {
          expect(heartbeatRequest).toBeDefined();
        }
      });
    });
  });
});
