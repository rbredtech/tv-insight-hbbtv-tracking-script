const puppeteer = require("puppeteer");

async function get(userAgent = undefined) {
  const browser = await puppeteer.launch({ dumpio: false, args: ["--disable-gpu"] });
  const page = await browser.newPage();
  if (userAgent) {
    await page.setUserAgent(userAgent);
  }
  page.on("response", (response) => console.log(response.url(), response.status()));
  return page;
}

module.exports = { get };
