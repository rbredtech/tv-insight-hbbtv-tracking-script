const fs = require("fs");
const path = require("path");

const pageHelper = require("./helper/page");
const { wait } = require("./helper/wait");

const cases = [true, false]; // iFrame

// Another origin than the session server's (localhost:3000), as for a real HbbTV app, so the page
// and the session iframe each have their own localStorage.
const PAGE_URL = "http://127.0.0.1:3000/puppeteer-eligibility.html";
const PAGE_DID = "00000000-0000-4000-8000-000000000001";
const IFRAME_DID = "00000000-0000-4000-8000-000000000002";

describe.each(cases)("Sampler eligibility - iFrame: %s", (iFrame) => {
  let page;
  let eligibilityIframeRequests;

  beforeEach(async () => {
    page = await pageHelper.get(iFrame);
    eligibilityIframeRequests = [];
    page.on("request", (req) => {
      if (req.url().includes("/eligibility.html")) {
        eligibilityIframeRequests.push(req.url());
      }
    });
  }, 20000);

  afterEach(async () => {
    await page.browser().close();
  }, 20000);

  async function load({ pageDid, iframeDid, sampler = true } = {}) {
    await page.evaluateOnNewDocument(
      (pageDid, iframeDid, sampler) => {
        if (window.top !== window) {
          if (iframeDid) localStorage.setItem("did", iframeDid);
          return;
        }
        if (pageDid) localStorage.setItem("did", pageDid);
        window.__checkEligibilityCalls = [];
        if (sampler) {
          window.__tvi_sampler = {
            _checkEligibility: function (did) {
              window.__checkEligibilityCalls.push(did);
            },
          };
        }
      },
      pageDid,
      iframeDid,
      sampler,
    );
    const loaded = page.waitForResponse((r) => r.url().includes(iFrame ? "/eligibility.html" : "/eligibility.js"));
    await page.goto(PAGE_URL, { waitUntil: "domcontentloaded" });
    await loaded;
  }

  function checkEligibilityCalls() {
    return page.evaluate(() => window.__checkEligibilityCalls);
  }

  it("should hand the device ID tracking stored to the sampler", async () => {
    await load({ pageDid: PAGE_DID, iframeDid: IFRAME_DID });
    await page.waitForFunction(() => window.__checkEligibilityCalls.length > 0, { timeout: 3000 });

    expect(await checkEligibilityCalls()).toEqual([iFrame ? IFRAME_DID : PAGE_DID]);
  }, 20000);

  it(`should ${iFrame ? "remove its iframe once answered" : "not load an iframe"}`, async () => {
    await load({ pageDid: PAGE_DID, iframeDid: IFRAME_DID });
    await page.waitForFunction(() => window.__checkEligibilityCalls.length > 0, { timeout: 3000 });

    expect(await page.evaluate(() => document.getElementsByTagName("iframe").length)).toBe(0);
    expect(eligibilityIframeRequests).toHaveLength(iFrame ? 1 : 0);
  }, 20000);

  it("should tell the sampler when no device ID is stored", async () => {
    await load({ pageDid: iFrame ? PAGE_DID : undefined, iframeDid: iFrame ? undefined : IFRAME_DID });
    await page.waitForFunction(() => window.__checkEligibilityCalls.length > 0, { timeout: 3000 });

    expect(await checkEligibilityCalls()).toEqual([""]);
  }, 20000);

  it("should not fail without a sampler", async () => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error));
    await load({ pageDid: PAGE_DID, iframeDid: IFRAME_DID, sampler: false });
    await wait(1000);

    expect(errors).toEqual([]);
  }, 20000);
});

describe("Sampler eligibility iframe mode", () => {
  // Tracking stores the device ID where iframe-loader.js decides, so both must decide alike.
  it("should be decided as in iframe-loader.js", () => {
    const blockedUserAgents = (file) =>
      fs.readFileSync(path.join(__dirname, "../src", file), "utf8").match(/var BLOCKED_USER_AGENTS = (\[[^\]]*\]);/)[1];

    expect(blockedUserAgents("eligibility.js")).toEqual(blockedUserAgents("iframe-loader.js"));
  });
});
