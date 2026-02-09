const pageHelper = require("./helper/page");
const { wait } = require("./helper/wait");

const cases = [
  [true, true], // [consent, iFrame]
  [true, false],
  [false, true],
  [false, false],
];

const [CHANNEL_ID_TEST_A, CHANNEL_ID_TEST_B] = [9999, 9998];
const delivery = 1;
const resolution = 2;

let page;

describe.each(cases)("Session End Upload - Consent: %s - iFrame: %s", (consent, iFrame) => {
  describe("when tracking is started", () => {
    let sessIdFirstSession;
    let sessIdSecondSession;

    beforeEach(async () => {
      page = await pageHelper.get(iFrame);
      page.goto(
        `http://localhost:3000/puppeteer.html?cid=${CHANNEL_ID_TEST_A}&r=${resolution}&d=${delivery}&c=${consent}`,
        {
          waitUntil: "domcontentloaded",
        },
      );
      await page.waitForResponse((request) => request.url().includes("i.gif"));
      sessIdFirstSession = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
    }, 20000);

    afterEach(async () => {
      await page.browser().close();
    }, 20000);

    describe("and tracking is reloaded", () => {
      it(`should upload previous session end timestamp`, async () => {
        page.goto(
          `http://localhost:3000/puppeteer.html?cid=${CHANNEL_ID_TEST_B}&r=${resolution}&d=${delivery}&c=${consent}`,
          {
            waitUntil: "domcontentloaded",
          },
        );
        const regex = new RegExp(`${sessIdFirstSession}/\\d*/e\\.gif`);
        await page.waitForResponse((request) => regex.test(request.url()));
      }, 10000);
    });

    describe("and switchChannel is called once", () => {
      it(`should upload previous session end timestamp`, async () => {
        await wait(2000);
        await page.evaluate(
          `(new Promise((resolve)=>{__hbb_tracking_tgt.switchChannel(${CHANNEL_ID_TEST_B}, 1, 1, resolve)}))`,
        );
        const regex = new RegExp(`${sessIdFirstSession}/\\d*/e\\.gif`);
        await page.waitForResponse((request) => regex.test(request.url()));
      }, 10000);
    });

    describe("and switchChannel is called twice", () => {
      it(`should upload previous session end timestamp`, async () => {
        await wait(2000);
        await page.evaluate(
          `(new Promise((resolve)=>{__hbb_tracking_tgt.switchChannel(${CHANNEL_ID_TEST_B}, 1, 1, resolve)}))`,
        );
        const regex1 = new RegExp(`${sessIdFirstSession}/\\d*/e\\.gif`);
        await page.waitForResponse((request) => regex1.test(request.url()));

        await page.waitForResponse((request) => request.url().includes("i.gif"));
        sessIdSecondSession = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);

        await wait(2000);
        await page.evaluate(
          `(new Promise((resolve)=>{__hbb_tracking_tgt.switchChannel(${CHANNEL_ID_TEST_A}, 1, 1, resolve)}))`,
        );
        const regex2 = new RegExp(`${sessIdSecondSession}/\\d*/e\\.gif`);
        await page.waitForResponse((request) => regex2.test(request.url()));
      }, 20000);

      it(`should clear uploaded session ends from localStorage`, async () => {
        await wait(2000);
        await page.evaluate(
          `(new Promise((resolve)=>{__hbb_tracking_tgt.switchChannel(${CHANNEL_ID_TEST_B}, 1, 1, resolve)}))`,
        );
        const regex1 = new RegExp(`${sessIdFirstSession}/\\d*/e\\.gif`);
        await page.waitForResponse((request) => regex1.test(request.url()));

        // Wait for upload to complete and localStorage to be updated
        await wait(1000);

        // Verify that the first session ID is no longer in localStorage
        const previousSessionEnds = await page.evaluate(`localStorage.getItem('pse')`);
        if (previousSessionEnds) {
          expect(previousSessionEnds).not.toContain(sessIdFirstSession);
        }

        await page.waitForResponse((request) => request.url().includes("i.gif"));
        sessIdSecondSession = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);

        await wait(2000);
        await page.evaluate(
          `(new Promise((resolve)=>{__hbb_tracking_tgt.switchChannel(${CHANNEL_ID_TEST_A}, 1, 1, resolve)}))`,
        );
        const regex2 = new RegExp(`${sessIdSecondSession}/\\d*/e\\.gif`);
        await page.waitForResponse((request) => regex2.test(request.url()));

        // Wait for second upload to complete
        await wait(1000);

        // Verify that the second session ID is also cleared
        const finalSessionEnds = await page.evaluate(`localStorage.getItem('pse')`);
        if (finalSessionEnds) {
          expect(finalSessionEnds).not.toContain(sessIdSecondSession);
        }
      }, 25000);
    });
  });
});
