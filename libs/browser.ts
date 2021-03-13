import chrome from "chrome-aws-lambda";
import puppeteer from "puppeteer";
import core from "puppeteer-core";

let _browser: core.Browser | puppeteer.Browser | null;

export async function getBrowser(isLocal: boolean) {
  if (!_browser) {
    const options = await getOptions();
    if (isLocal) {
      _browser = await puppeteer.launch();
    } else {
      _browser = await core.launch(options);
    }
  }
  return _browser;
}

export async function getOptions() {
  const options = {
    args: chrome.args,
    executablePath: await chrome.executablePath,
    headless: chrome.headless,
  };
  return options;
}
