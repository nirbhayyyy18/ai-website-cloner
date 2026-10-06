import { launchBrowser } from "./browser";
import type { WebsiteAnalysis } from "./types";

type RawWebsiteAnalysis = Omit<WebsiteAnalysis, "url" | "responsive">;

export async function analyzeWebsite(
  url: string
): Promise<WebsiteAnalysis> {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage({
      viewport: {
        width: 1440,
        height: 900,
      },
    });

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const analysis = (await page.evaluate(`
      (() => {
        function uniqueValues(values) {
          return Array.from(
            new Set(values.filter((value) => value && value.trim().length > 0))
          ).slice(0, 50);
        }

        function computedValues(selector, property) {
          const elements = Array.from(
            document.querySelectorAll(selector)
          );

          const values = [];

          for (const element of elements) {
            const value = window
              .getComputedStyle(element)
              .getPropertyValue(property);

            if (value) {
              values.push(value);
            }
          }

          return uniqueValues(values);
        }

        const headings = Array.from(
          document.querySelectorAll("h1, h2, h3, h4, h5, h6")
        ).map((element) => ({
          level: Number(element.tagName.substring(1)),
          text: element.textContent?.trim() || "",
        }));

        const navigation = Array.from(
          document.querySelectorAll("nav a, header a")
        )
          .map((element) => ({
            text: element.textContent?.trim() || "",
            href: element.href || "",
          }))
          .filter((item) => item.text || item.href);

        const images = Array.from(
          document.querySelectorAll("img")
        ).map((element) => ({
          src: element.src || "",
          alt: element.alt || "",
        }));

        const buttons = Array.from(
          document.querySelectorAll(
            "button, input[type='button'], input[type='submit']"
          )
        )
          .map((element) => {
            if (element instanceof HTMLInputElement) {
              return element.value.trim();
            }

            return element.textContent?.trim() || "";
          })
          .filter(Boolean);

        const paragraphs = Array.from(
          document.querySelectorAll("p")
        )
          .map((element) => element.textContent?.trim() || "")
          .filter(Boolean);

        const sections = Array.from(
          document.querySelectorAll(
            "header, nav, main, section, article, footer, aside"
          )
        ).map((element) => ({
          tag: element.tagName.toLowerCase(),
          text: (element.textContent || "")
            .replace(/\\s+/g, " ")
            .trim()
            .slice(0, 500),
          className:
            typeof element.className === "string"
              ? element.className
              : "",
        }));

        const bodyStyles = window.getComputedStyle(document.body);

        const descriptionElement = document.querySelector(
          'meta[name="description"]'
        );

        const metadataDescription =
          descriptionElement?.getAttribute("content") || "";

        const language =
          document.documentElement.getAttribute("lang") || "unknown";

        const fontFamilies = computedValues(
          "body, h1, h2, h3, p, button, a",
          "font-family"
        );

        const fontSizes = computedValues(
          "h1, h2, h3, h4, h5, h6, p, button, a",
          "font-size"
        );

        const fontWeights = computedValues(
          "h1, h2, h3, h4, h5, h6, p, button, a",
          "font-weight"
        );

        const backgroundColors = computedValues(
          "body, header, nav, main, section, article, footer, div",
          "background-color"
        );

        const textColors = computedValues(
          "body, h1, h2, h3, h4, h5, h6, p, span, a, button",
          "color"
        );

        const borderColors = computedValues(
          "*, button, input",
          "border-color"
        );

        const accentColors = computedValues(
          "button, a, input, [class*='primary'], [class*='accent']",
          "color"
        );

        const padding = computedValues(
          "header, nav, main, section, article, footer, div",
          "padding"
        );

        const margin = computedValues(
          "h1, h2, h3, h4, h5, h6, p, section, article, header, footer",
          "margin"
        );

        const gap = computedValues(
          "header, nav, main, section, article, footer, div",
          "gap"
        );

        return {
          metadata: {
            title: document.title,
            description: metadataDescription,
            language,
          },

          navigation,

          headings,

          paragraphs,

          buttons,

          images,

          colors: {
            background: uniqueValues([
              bodyStyles.backgroundColor,
              ...backgroundColors,
            ]),
            text: textColors,
            border: borderColors,
            accent: accentColors,
          },

          typography: {
            fontFamilies,
            fontSizes,
            fontWeights,
          },

          spacing: {
            padding,
            margin,
            gap,
          },

          sections,

          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        };
      })()
    `)) as RawWebsiteAnalysis;

    const screenshotDirectory = "generated-sites/analysis";

    const desktopScreenshot = `${screenshotDirectory}/desktop.png`;
    const tabletScreenshot = `${screenshotDirectory}/tablet.png`;
    const mobileScreenshot = `${screenshotDirectory}/mobile.png`;

    await page.setViewportSize({
      width: 1440,
      height: 900,
    });

    await page.screenshot({
      path: desktopScreenshot,
      fullPage: true,
    });

    await page.setViewportSize({
      width: 768,
      height: 1024,
    });

    await page.screenshot({
      path: tabletScreenshot,
      fullPage: true,
    });

    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    await page.screenshot({
      path: mobileScreenshot,
      fullPage: true,
    });

    const responsive = {
      desktop: {
        width: 1440,
        height: 900,
        screenshot: desktopScreenshot,
      },

      tablet: {
        width: 768,
        height: 1024,
        screenshot: tabletScreenshot,
      },

      mobile: {
        width: 390,
        height: 844,
        screenshot: mobileScreenshot,
      },
    };

    return {
      url,
      ...analysis,
      responsive,
    };
  } finally {
    await browser.close();
  }
}