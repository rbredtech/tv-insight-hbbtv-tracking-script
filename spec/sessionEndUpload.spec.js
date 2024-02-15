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

    beforeEach(async () => {
      const userAgent = !iFrame
        ? "HbbTV/1.1.1 (+PVR;Humax;HD FOX+;1.00.20;1.0;)CE-HTML/1.0 ANTGalio/3.3.0.26.03"
        : undefined;
      page = await pageHelper.get(userAgent);
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
      it(`should upload previous session's end timestamp`, async () => {
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
