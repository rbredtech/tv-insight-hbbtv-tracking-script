const pageHelper = require("./helper/page");
const { wait } = require("./helper/wait");

const cases = [true, false]; // iFrame

// On the mock session server's default whitelist
const ELIGIBLE_DID = "00000000-0000-4000-8000-000000000001";
const CHECKED_KEY = "_tvi_eligibility_checked";

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

  async function load({ consent = true, sampler = true, did, checked = false } = {}) {
    await page.evaluateOnNewDocument(
      (sampler, did, checked, checkedKey) => {
        if (window.top !== window) return;
        if (sampler) {
          window.__setEligibleCalls = [];
          window.__tvi_sampler = {
            _setEligible: function (isEligible) {
              window.__setEligibleCalls.push(isEligible);
            },
          };
        }
        if (did) localStorage.setItem("did", did);
        if (checked) localStorage.setItem(checkedKey, "true");
      },
      sampler,
      did,
      checked,
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

  it("should mark a whitelisted device eligible and remember the check", async () => {
    const response = page.waitForResponse((r) => r.url().includes("/set_eligible.js"));
    await load({ did: ELIGIBLE_DID });
    await response;
    await page.waitForFunction((key) => localStorage.getItem(key) === "true", {}, CHECKED_KEY);

    expect(eligibilityRequests).toEqual([`http://localhost:3000/set_eligible.js?did=${ELIGIBLE_DID}`]);
    expect(await page.evaluate(() => window.__setEligibleCalls)).toEqual([true]);
  }, 20000);

  it("should remember the check without marking a device that is not whitelisted", async () => {
    const response = page.waitForResponse((r) => r.url().includes("/set_eligible.js"));
    await load();
    await response;
    await page.waitForFunction((key) => localStorage.getItem(key) === "true", {}, CHECKED_KEY);

    expect(eligibilityRequests).toHaveLength(1);
    expect(eligibilityRequests[0]).not.toContain(ELIGIBLE_DID);
    expect(await page.evaluate(() => window.__setEligibleCalls)).toEqual([]);
  }, 20000);

  it("should not check again once the check is remembered", async () => {
    await load({ did: ELIGIBLE_DID, checked: true });
    await waitForTrackingAndCheck();

    expect(eligibilityRequests).toEqual([]);
    expect(await page.evaluate(() => window.__setEligibleCalls)).toEqual([]);
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
