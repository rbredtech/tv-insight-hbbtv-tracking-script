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
    page = await pageHelper.get(iFrame);
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
          window.getLogEntries = function (id) {
            return logMessages.filter((e) => e[0] === id);
          };
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
        let switchChannelResult, metaCalled, newSid;

        beforeAll(async () => {
          metaCalled = page.waitForResponse((request) => request.url().includes(`/meta.gif`));
          switchChannelResult = await page.evaluate(
            `(new Promise((resolve)=>{__hbb_tracking_tgt.switchChannel(${CHANNEL_ID_TEST_B},${resolution},${delivery},resolve)}))`,
          );
        });

        it(`should return success`, async () => {
          expect(switchChannelResult).toBe(true);
        });

        it(`should get a new Session ID`, async () => {
          newSid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
          expect(newSid).not.toBe(sid);
        });

        it("should call /meta.gif endpoint", async () => {
          const response = await metaCalled;
          expect(response.url()).toBe(
            `http://localhost:3000/meta.gif?idtype=1&ccid=1&onid=1&nid=1&name=TEST&isHD=true&sid=${newSid}`,
          );
        }, 10000);

        it("should create stop and start log entries", async () => {
          const logSessionStartEntries = await page.evaluate(`getLogEntries(5)`);
          const logSessionStopEntries = await page.evaluate(`getLogEntries(6)`);
          expect(logSessionStartEntries.length).toBeGreaterThan(0);
          expect(logSessionStopEntries.length).toBeGreaterThan(0);
          expect(logSessionStartEntries.pop()[1]).toMatch(
            new RegExp(`sid=${regexUUID4.source},did=${regexUUID4.source},cid=[0-9]{1,4}`),
          );
        });

        it(`should ${consent ? "" : "NOT"} preserve Device ID `, async () => {
          const newDid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getDID(resolve)}))`);
          if (consent) {
            expect(newDid).toBe(did);
          } else {
            expect(newDid).not.toBe(did);
          }
        });

        it("should update session ID in heartbeat URL", async () => {
          // Wait for the next heartbeat request after switchChannel
          const heartbeatRequest = await page.waitForResponse((response) => response.url().includes("i.gif"), {
            timeout: 10000,
          });

          const heartbeatUrl = heartbeatRequest.url();

          // The heartbeat URL should contain the new session ID
          // URL format: {HEARTBEAT_URL}/{CID}{HEARTBEAT_QUERY}{timestamp}/i.gif?f={interval}
          // HEARTBEAT_QUERY contains the session ID
          expect(heartbeatUrl).toContain(newSid);
          expect(heartbeatUrl).not.toContain(sid);
        }, 15000);
      });
    });
  });
});
