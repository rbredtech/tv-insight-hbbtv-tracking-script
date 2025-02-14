const puppeteer = require("puppeteer");

async function get(userAgent = undefined) {
  const browser = await puppeteer.launch({ dumpio: false, args: ["--disable-gpu", "--no-sandbox"] });
  const page = await browser.newPage();
  if (userAgent) {
    page.setUserAgent(userAgent);
  }
  page.on("response", (response) => console.log(response.url(), response.status()));
  return page;
}

module.exports = { get };
