const puppeteer = require("puppeteer");

const NON_IFRAME_USER_AGENT = "HbbTV/1.1.1 (+PVR;Humax;HD FOX+;1.00.20;1.0;)CE-HTML/1.0 ANTGalio/3.3.0.26.03";

async function get(iFrameEnabled = true) {
  const browser = await puppeteer.launch({ dumpio: false, args: ["--disable-gpu", "--no-sandbox"] });
  const page = await browser.newPage();
  if (!iFrameEnabled) {
    await page.setUserAgent(NON_IFRAME_USER_AGENT);
  }
  return page;
}

module.exports = { get };
