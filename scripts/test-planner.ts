
import { analyzeWebsite } from "../src/lib/analyzer/website-analyzer";
import { getAIProvider } from "../src/lib/ai/provider";
import { planWebsite } from "../src/lib/ai/planner";

async function main() {
  const url = "https://example.com";

  console.log("=================================");
  console.log("AI WEBSITE PLANNER TEST");
  console.log("=================================");
  console.log("");

  console.log("1. Analyzing website...");
  const analysis = await analyzeWebsite(url);

  console.log("Analysis complete.");
  console.log(`Title: ${analysis.metadata.title}`);
  console.log(`Headings: ${analysis.headings.length}`);
  console.log(`Images: ${analysis.images.length}`);
  console.log("");

  console.log("2. Connecting to AI provider...");
  const provider = getAIProvider();

  console.log(`Provider: ${provider.name}`);
  console.log(`Model: ${provider.model}`);
  console.log("");

  console.log("3. Creating frontend generation plan...");

  const plan = await planWebsite(provider, {
    analysis,
  });

  console.log("");
  console.log("=================================");
  console.log("GENERATION PLAN");
  console.log("=================================");
  console.log("");

  console.log("Page Structure:");
  console.log(plan.pageStructure);

  console.log("");
  console.log("Components:");

  for (const component of plan.components) {
    console.log(`- ${component.name}`);
    console.log(`  ${component.description}`);
  }

  console.log("");
  console.log("Files:");

  for (const file of plan.files) {
    console.log(`- ${file.path}`);
    console.log(`  ${file.purpose}`);
  }

  console.log("");
  console.log("Styling Strategy:");
  console.log(plan.stylingStrategy);

  console.log("");
  console.log("Responsive Strategy:");
  console.log(plan.responsiveStrategy);

  console.log("");
  console.log("Asset Strategy:");
  console.log(plan.assetStrategy);

  console.log("");
  console.log("=================================");
  console.log("PLANNER TEST SUCCESS");
  console.log("=================================");
}

main().catch((error) => {
  console.error("");
  console.error("=================================");
  console.error("PLANNER TEST FAILED");
  console.error("=================================");
  console.error("");

  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});