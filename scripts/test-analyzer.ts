import { analyzeWebsite } from "../src/lib/analyzer/website-analyzer";

async function main() {
  const url = "https://example.com";

  console.log(`Analyzing: ${url}\n`);

  try {
    const result = await analyzeWebsite(url);

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Analyzer failed:", error);
    process.exit(1);
  }
}

main();