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

const regexUUID4 = /[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/;

describe.each(cases)("Switch Channel functionality - Consent: %s - iFrame: %s", (consent, iFrame) => {
  let page, did, sid;

  beforeAll(async () => {
    const userAgent = !iFrame
      ? "HbbTV/1.1.1 (+PVR;Humax;HD FOX+;1.00.20;1.0;)CE-HTML/1.0 ANTGalio/3.3.0.26.03"
      : undefined;
    page = await pageHelper.get(userAgent);
  }, 20000);

  afterAll(async () => {
    await page.browser().close();
  }, 20000);

  describe("WHEN Tracking is started", () => {
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
    });

    describe("AND onLogEvent handler is registered", () => {
      beforeAll(async () => {
        await page.evaluate(() => {
          const logMessages = [];
          function logCallback() {
            logMessages.push(arguments);
          }
          // eslint-disable-next-line no-undef
          window.getLogEntries = function (id) {
            return logMessages.filter((e) => e[0] === id);
          };
          // eslint-disable-next-line no-undef
          __hbb_tracking_tgt.onLogEvent(logCallback);
        });
        await page.waitForResponse((request) => request.url().includes("i.gif"));
      }, 2000);

      it("should log out Heartbeat events", async () => {
        expect(await page.evaluate(`getLogEntries(1).length`)).toBeGreaterThan(0);
        expect(await page.evaluate(`getLogEntries(2).length`)).toBeGreaterThan(0);
        expect(await page.evaluate(`getLogEntries(3).length`)).toBe(0);
        expect(await page.evaluate(`getLogEntries(4).length`)).toBe(0);
        expect(await page.evaluate(`getLogEntries(5).length`)).toBe(1);
        expect(await page.evaluate(`getLogEntries(6).length`)).toBe(0);
      });

      describe("AND switchChannel() API method is called", () => {
        let switchChannelResult;
        beforeAll(async () => {
          switchChannelResult = await page.evaluate(
            `(new Promise((resolve)=>{__hbb_tracking_tgt.switchChannel(${CHANNEL_ID_TEST_B},${resolution},${delivery},resolve)}))`,
          );
        });

        it(`should return success`, async () => {
          expect(switchChannelResult).toBe(true);
        });

        it("should create stop and start log entries", async () => {
          const logSessionStartEntries = await page.evaluate(`getLogEntries(5)`);
          const logSessionStopEntries = await page.evaluate(`getLogEntries(5)`);
          expect(logSessionStartEntries.length).toBeGreaterThan(0);
          expect(logSessionStopEntries.length).toBeGreaterThan(0);
          expect(logSessionStartEntries.pop()[1]).toMatch(
            new RegExp(`sid=${regexUUID4.source},did=${regexUUID4.source},cid=[0-9]{1,4}`),
          );
        });

        it(`should ${consent ? "" : "NOT"} preserve Device ID ${consent}`, async () => {
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
});
