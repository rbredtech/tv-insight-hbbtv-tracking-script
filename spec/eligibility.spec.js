const pageHelper = require("./helper/page");
const { wait } = require("./helper/wait");

const cases = [true, false]; // iFrame

// On the mock session server's default whitelist
const ELIGIBLE_DID = "00000000-0000-4000-8000-000000000001";
const CHECKED_KEY = "_tvi_eligibility_checked";
const ELIGIBLE_REQUEST = new RegExp(`^http://localhost:3000/set_eligible\\.js\\?did=${ELIGIBLE_DID}&ts=\\d+$`);
// The mock session server's default ELIGIBILITY_ROUND
const ROUND = "round-1";

describe.each(cases)("Sampler eligibility - iFrame: %s", (iFrame) => {
  let page;
  let eligibilityRequests;

  beforeEach(async () => {
    page = await pageHelper.get(iFrame);
    eligibilityRequests = [];
    page.on("request", (req) => {
      if (req.url().includes("/set_eligible.js")) {
        eligibilityRequests.push(req.url());
      }
    });
  }, 20000);

  afterEach(async () => {
    await page.browser().close();
  }, 20000);

  async function load({ consent = true, sampler = true, samplerConfirms = true, did, checkedRound } = {}) {
    await page.evaluateOnNewDocument(
      (sampler, samplerConfirms, did, checkedRound, checkedKey) => {
        if (window.top !== window) return;
        if (sampler) {
          window.__setEligibleCalls = [];
          window.__tvi_sampler = {
            _setEligible: function (isEligible, callback) {
              window.__setEligibleCalls.push(isEligible);
              if (samplerConfirms && callback) callback(isEligible);
            },
          };
        }
        if (did) localStorage.setItem("did", did);
        if (checkedRound) localStorage.setItem(checkedKey, checkedRound);
      },
      sampler,
      samplerConfirms,
      did,
      checkedRound,
      CHECKED_KEY,
    );
    await page.goto(`http://localhost:3000/puppeteer.html?cid=9999&r=1&d=1&c=${consent}`, {
      waitUntil: "domcontentloaded",
    });
  }

  async function waitForTrackingAndCheck() {
    await page.waitForRequest((request) => request.url().includes("i.gif"), { timeout: 5000 });
    await wait(1500);
  }

  it("should mark a whitelisted device eligible and remember the round", async () => {
    const response = page.waitForResponse((r) => r.url().includes("/set_eligible.js"));
    await load({ did: ELIGIBLE_DID });
    await response;
    await page.waitForFunction((key, round) => localStorage.getItem(key) === round, {}, CHECKED_KEY, ROUND);

    expect(eligibilityRequests).toHaveLength(1);
    expect(eligibilityRequests[0]).toMatch(ELIGIBLE_REQUEST);
    expect(await page.evaluate(() => window.__setEligibleCalls)).toEqual([true]);
  }, 20000);

  it("should remember the round without marking a device that is not whitelisted", async () => {
    const response = page.waitForResponse((r) => r.url().includes("/set_eligible.js"));
    await load();
    await response;
    await page.waitForFunction((key, round) => localStorage.getItem(key) === round, {}, CHECKED_KEY, ROUND);

    expect(eligibilityRequests).toHaveLength(1);
    expect(eligibilityRequests[0]).not.toContain(ELIGIBLE_DID);
    expect(await page.evaluate(() => window.__setEligibleCalls)).toEqual([]);
  }, 20000);

  it("should not remember the round until the sampler confirms the marking", async () => {
    const response = page.waitForResponse((r) => r.url().includes("/set_eligible.js"));
    await load({ did: ELIGIBLE_DID, samplerConfirms: false });
    await response;
    await wait(1500);

    expect(await page.evaluate(() => window.__setEligibleCalls)).toEqual([true]);
    expect(await page.evaluate((key) => localStorage.getItem(key), CHECKED_KEY)).toBeNull();
  }, 20000);

  it("should not check again in the same round", async () => {
    await load({ did: ELIGIBLE_DID, checkedRound: ROUND });
    await waitForTrackingAndCheck();

    expect(eligibilityRequests).toEqual([]);
    expect(await page.evaluate(() => window.__setEligibleCalls)).toEqual([]);
  }, 20000);

  it("should check again in a new round", async () => {
    const response = page.waitForResponse((r) => r.url().includes("/set_eligible.js"));
    await load({ did: ELIGIBLE_DID, checkedRound: "round-0" });
    await response;
    await page.waitForFunction((key, round) => localStorage.getItem(key) === round, {}, CHECKED_KEY, ROUND);

    expect(eligibilityRequests).toHaveLength(1);
    expect(eligibilityRequests[0]).toMatch(ELIGIBLE_REQUEST);
    expect(await page.evaluate(() => window.__setEligibleCalls)).toEqual([true]);
  }, 20000);

  it("should not check, nor use up the check, without a sampler", async () => {
    await load({ did: ELIGIBLE_DID, sampler: false });
    await waitForTrackingAndCheck();

    expect(eligibilityRequests).toEqual([]);
    expect(await page.evaluate((key) => localStorage.getItem(key), CHECKED_KEY)).toBeNull();
  }, 20000);

  it("should not check without consent", async () => {
    await load({ consent: false });
    await waitForTrackingAndCheck();

    expect(eligibilityRequests).toEqual([]);
    expect(await page.evaluate((key) => localStorage.getItem(key), CHECKED_KEY)).toBeNull();
  }, 20000);
});
