import { chromium, type Browser } from "playwright";

export async function launchBrowser(): Promise<Browser> {
  const browser = await chromium.launch({
    headless: true,
  });

  return browser;
}