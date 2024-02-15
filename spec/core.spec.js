/* eslint-disable no-undef */
const pageHelper = require("./helper/page");

const regexUUID4 = /[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/;

const cases = [
  [true, true], // [consent, iFrame]
  [false, true],
  [true, false],
  [false, false],
];

const channelId = 9999;
const delivery = 1;
const resolution = 2;
const suspended = false;
const ls = true;

let page;

describe.each(cases)("Core Tracking Functionalities - Consent: %s - iFrame: %s", (consent, iFrame) => {
  let did;

  beforeAll(async () => {
    const userAgent = !iFrame
      ? "HbbTV/1.1.1 (+PVR;Humax;HD FOX+;1.00.20;1.0;)CE-HTML/1.0 ANTGalio/3.3.0.26.03"
      : undefined;
    page = await pageHelper.get(userAgent);
  }, 20000);

  afterAll(async () => {
    await page.browser().close();
  }, 20000);

  describe("when tracking is started", () => {
    let trackingScriptResponse, trackingRequestDeferred;
    beforeAll(async () => {
      page.goto(
        `http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=${consent}&suspended=${suspended}`,
        {
          waitUntil: "domcontentloaded",
        },
      );
      trackingScriptResponse = await page.waitForResponse((request) => request.url().includes("tracking.js"));
      trackingRequestDeferred = page.waitForRequest((request) => request.url().includes(iFrame ? "ra_if.js" : "ra.js"));
    }, 20000);

    it("should return tracking script", async () => {
      expect(trackingScriptResponse.ok()).toBe(true);
    });

    it("should create heartbeat request", async () => {
      const httpResponse = await page.waitForResponse((response) => response.url().includes("i.gif"));
      expect(httpResponse.status()).toBe(200);
    });

    it("should create device ID", async () => {
      did = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getDID(resolve)}))`);
      expect(did).toMatch(regexUUID4);
    }, 10000);

    describe("when tracking parameters are sent over", () => {
      let trackingRequest;
      beforeAll(async () => {
        trackingRequest = await trackingRequestDeferred;
      }, 10000);

      it("should correctly contain channel ID", () => {
        expect(trackingRequest.url().includes(`cid=${channelId}`)).toBeTruthy();
      });

      it("should correctly contain delivery", () => {
        expect(trackingRequest.url().includes(`d=${delivery}`)).toBeTruthy();
      });

      it("should correctly contain resolution", () => {
        expect(trackingRequest.url().includes(`r=${resolution}`)).toBeTruthy();
      });

      it("should correctly contain suspended", () => {
        expect(trackingRequest.url().includes(`suspended=${suspended}`)).toBeTruthy();
      });

      it("should correctly contain localStorage availability", () => {
        expect(trackingRequest.url().includes(`ls=${ls}`)).toBeTruthy();
      });
    });
  });
});
