const trackingScript = require("./helper/trackingScript.js");
const pageHelper = require("./helper/page");

const regexUUID4 = /[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/;
const { CHANNEL_ID_TEST_A } = [9999];
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

const delivery = 1,
  resolution = 2;

describe.each(cases)("Core Tracking Functionalities - Consent: %s", (consent, host) => {
  let did;

  describe("when tracking is started", () => {
    let trackingScriptResponse, trackingRequestDeferred;
    beforeAll(async () => {
      const content = trackingScript(CHANNEL_ID_TEST_A, host, consent, false, delivery, resolution);
      page.setContent(content);
      trackingScriptResponse = await page.waitForResponse((request) => request.url().includes("tracking.js"));
      trackingRequestDeferred = page.waitForRequest((request) => request.url().includes("ra_if.js"));
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
        expect(trackingRequest.url().includes(`cid=${CHANNEL_ID_TEST_A}`));
      });

      it("should correctly contain delivery", () => {
        expect(trackingRequest.url().includes(`d=${delivery}`));
      });

      it("should correctly contain resolution", () => {
        expect(trackingRequest.url().includes(`r=${resolution}`));
      });
    });
  });
});
