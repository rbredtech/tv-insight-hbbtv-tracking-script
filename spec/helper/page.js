const puppeteer = require("puppeteer");

async function get(userAgent = undefined) {
  const browser = await puppeteer.launch({ dumpio: false, args: ["--disable-gpu", "--no-sandbox"] });
  const page = await browser.newPage();
  if (userAgent) {
    await page.setUserAgent(userAgent);
  }
  return page;
}

module.exports = { get };
