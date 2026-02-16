const pageHelper = require("./helper/page");

const cases = [true, false]; // iFrame

const channelId = 9999;
const delivery = 1;
const resolution = 2;

let page;

describe.each(cases)("API Surface Tests - iFrame: %s", (iFrame) => {
  beforeEach(async () => {
    page = await pageHelper.get(iFrame);
  }, 20000);

  afterEach(async () => {
    await page.browser().close();
  }, 20000);

  describe("API method availability", () => {
    it("should expose all required public API methods", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      const apiMethods = await page.evaluate(() => {
        const api = __hbb_tracking_tgt;
        return {
          hasStart: typeof api.start === "function",
          hasStop: typeof api.stop === "function",
          hasSwitchChannel: typeof api.switchChannel === "function",
          hasGetSID: typeof api.getSID === "function",
          hasGetDID: typeof api.getDID === "function",
          hasOnLogEvent: typeof api.onLogEvent === "function",
        };
      });

      expect(apiMethods.hasStart).toBe(true);
      expect(apiMethods.hasStop).toBe(true);
      expect(apiMethods.hasSwitchChannel).toBe(true);
      expect(apiMethods.hasGetSID).toBe(true);
      expect(apiMethods.hasGetDID).toBe(true);
      expect(apiMethods.hasOnLogEvent).toBe(true);
    });
  });

  describe("API parameter validation", () => {
    it("should handle start() with valid callback", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      const callbackCalled = await page.evaluate(`(new Promise((resolve) => {
        let called = false;
        __hbb_tracking_tgt.start(() => {
          called = true;
        });
        setTimeout(() => resolve(called), 100);
      }))`);

      expect(callbackCalled).toBe(true);
    });

    it("should handle start() without callback", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      await expect(page.evaluate(`__hbb_tracking_tgt.start()`)).resolves.not.toThrow();

      const sid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
      expect(sid).toBeDefined();
    });

    it("should handle stop() with valid callback", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.start(resolve)}))`);

      const callbackCalled = await page.evaluate(`(new Promise((resolve) => {
        let called = false;
        __hbb_tracking_tgt.stop(() => {
          called = true;
        });
        setTimeout(() => resolve(called), 100);
      }))`);

      expect(callbackCalled).toBe(true);
    });

    it("should handle switchChannel() with valid parameters", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.start(resolve)}))`);

      const result = await page.evaluate(
        `(new Promise((resolve)=>{__hbb_tracking_tgt.switchChannel(9998, 1, 1, resolve)}))`,
      );

      expect(result).toBe(true);
    });

    it("should handle switchChannel() with missing optional parameters", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.start(resolve)}))`);

      await expect(
        page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.switchChannel(9998, null, null, resolve)}))`),
      ).resolves.toBe(true);
    });

    it("should handle getSID() callback", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      const sid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);

      expect(sid).toBeDefined();
      expect(typeof sid).toBe("string");
      expect(sid).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
    });

    it("should handle getDID() callback", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      const did = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getDID(resolve)}))`);

      expect(did).toBeDefined();
      expect(did).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
    });

    it("should handle onLogEvent() with valid callback", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      const logEventReceived = await page.evaluate(`(new Promise((resolve) => {
        let received = false;
        __hbb_tracking_tgt.onLogEvent((type, message) => {
          received = true;
        });
        __hbb_tracking_tgt.start();
        setTimeout(() => resolve(received), 500);
      }))`);

      expect(logEventReceived).toBe(true);
    });
  });

  describe("start() with contextId", () => {
    it("should include contextId as &i= query param in new.js request", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForResponse((request) => request.url().includes("i.gif"));

      await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.stop(resolve)}))`);

      const newSessionRequest = page.waitForResponse((response) => response.url().includes("/new.js"));
      await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.start(resolve, null, "start-ctx-42")}))`);
      const response = await newSessionRequest;

      expect(response.url()).toContain("&i=start-ctx-42");
    });
  });

  describe("API return values", () => {
    it("should return session ID from getSID()", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      const sid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
      expect(sid).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
    });

    it("should return device ID from getDID()", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      const did = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getDID(resolve)}))`);
      expect(did).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
    });

    it("should return true from switchChannel() callback", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.start(resolve)}))`);

      const result = await page.evaluate(
        `(new Promise((resolve)=>{__hbb_tracking_tgt.switchChannel(9998, 1, 1, resolve)}))`,
      );

      expect(result).toBe(true);
    });
  });

  describe("API error handling", () => {
    it("should handle errors in start() callback gracefully", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      await expect(
        page.evaluate(`__hbb_tracking_tgt.start(() => { throw new Error('Test error'); })`),
      ).resolves.not.toThrow();

      const sid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
      expect(sid).toBeDefined();
    });

    it("should handle errors in onLogEvent() callback gracefully", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      await expect(
        page.evaluate(`__hbb_tracking_tgt.onLogEvent(() => { throw new Error('Test error'); })`),
      ).resolves.not.toThrow();

      await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.start(resolve)}))`);

      const sid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
      expect(sid).toBeDefined();
    });

    it("should handle multiple start() calls without errors", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.start(resolve)}))`);
      await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.start(resolve)}))`);
      await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.start(resolve)}))`);

      const sid = await page.evaluate(`(new Promise((resolve)=>{__hbb_tracking_tgt.getSID(resolve)}))`);
      expect(sid).toBeDefined();
    });
  });

  describe("API callback execution order", () => {
    it("should execute callbacks in FIFO order", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      const executionOrder = await page.evaluate(`(new Promise((resolve) => {
        const order = [];
        __hbb_tracking_tgt.getSID(() => order.push(1));
        __hbb_tracking_tgt.getSID(() => order.push(2));
        __hbb_tracking_tgt.getSID(() => order.push(3));
        setTimeout(() => resolve(order), 100);
      }))`);

      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it("should execute start callback before subsequent API calls", async () => {
      await page.goto(`http://localhost:3000/puppeteer.html?cid=${channelId}&r=${resolution}&d=${delivery}&c=true`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => typeof __hbb_tracking_tgt !== "undefined");

      const result = await page.evaluate(`(new Promise((resolve) => {
        let startCalled = false;
        __hbb_tracking_tgt.start(() => {
          startCalled = true;
        });
        setTimeout(() => {
          __hbb_tracking_tgt.getSID((sid) => {
            resolve({ startCalled, sid });
          });
        }, 50);
      }))`);

      expect(result.startCalled).toBe(true);
      expect(result.sid).toBeDefined();
    });
  });
});
