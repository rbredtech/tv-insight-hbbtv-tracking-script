const puppeteer = require("puppeteer");

async function get() {
  const browser = await puppeteer.launch({ dumpio: false, args: ["--disable-gpu"] });
  const page = await browser.newPage();
  page.on("request", (request) => console.log(request.url()));
  page.on("response", (response) => console.log(response.url(), response.status()));

  return page;
}

module.exports = { get };
