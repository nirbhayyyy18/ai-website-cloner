
import { analyzeWebsite } from "../src/lib/analyzer/website-analyzer";
import { getAIProvider } from "../src/lib/ai/provider";
import { planWebsite } from "../src/lib/ai/planner";
import { generateFrontend } from "../src/lib/generator/code-generator";

async function main() {
  const url = "https://example.com";

  console.log("=================================");
  console.log("AI WEBSITE CODE GENERATOR TEST");
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

  console.log("Generation plan created.");
  console.log(`Components planned: ${plan.components.length}`);
  console.log(`Files planned: ${plan.files.length}`);
  console.log("");

  console.log("4. Generating frontend code...");
  const project = await generateFrontend(provider, {
    analysis,
    plan,
  });

  console.log("");
  console.log("=================================");
  console.log("GENERATED PROJECT");
  console.log("=================================");
  console.log("");

  console.log(`Entry file: ${project.entryFile}`);
  console.log(`Generated files: ${project.files.length}`);
  console.log("");

  for (const file of project.files) {
    console.log("---------------------------------");
    console.log(`FILE: ${file.path}`);
    console.log("---------------------------------");
    console.log(file.content);
    console.log("");
  }

  console.log("=================================");
  console.log("CODE GENERATION TEST SUCCESS");
  console.log("=================================");
}

main().catch((error) => {
  console.error("");
  console.error("=================================");
  console.error("CODE GENERATION TEST FAILED");
  console.error("=================================");
  console.error("");

  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});