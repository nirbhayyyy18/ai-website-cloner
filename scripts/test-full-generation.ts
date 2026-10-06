import { analyzeWebsite } from "../src/lib/analyzer/website-analyzer";
import { getAIProvider } from "../src/lib/ai/provider";
import { planWebsite } from "../src/lib/ai/planner";
import { generateFrontend } from "../src/lib/generator/code-generator";
import { writeGeneratedProject } from "../src/lib/generator/project-writer";

async function main() {
  const url = "https://example.com";
  const projectId = "example-domain";

  console.log("=================================");
  console.log("FULL AI WEBSITE GENERATION TEST");
  console.log("=================================");
  console.log("");

  console.log("1. Analyzing website...");
  const analysis = await analyzeWebsite(url);

  console.log(`Title: ${analysis.metadata.title}`);
  console.log(`Headings: ${analysis.headings.length}`);
  console.log(`Images: ${analysis.images.length}`);
  console.log("");

  console.log("2. Connecting to AI provider...");
  const provider = getAIProvider();

  console.log(`Provider: ${provider.name}`);
  console.log(`Model: ${provider.model}`);
  console.log("");

  console.log("3. Creating generation plan...");
  const plan = await planWebsite(provider, {
    analysis,
  });

  console.log(`Components planned: ${plan.components.length}`);
  console.log(`Files planned: ${plan.files.length}`);
  console.log("");

  console.log("4. Generating frontend code...");
  const project = await generateFrontend(provider, {
    analysis,
    plan,
  });

  console.log(`Generated files: ${project.files.length}`);
  console.log(`Entry file: ${project.entryFile}`);
  console.log("");

  console.log("5. Writing generated project...");

  const projectDirectory = await writeGeneratedProject(
    project,
    projectId
  );

  console.log("");
  console.log("=================================");
  console.log("PROJECT CREATED SUCCESSFULLY");
  console.log("=================================");
  console.log("");

  console.log(`Project ID: ${projectId}`);
  console.log(`Project directory: ${projectDirectory}`);
  console.log("");

  console.log("Generated files:");

  for (const file of project.files) {
    console.log(`- ${file.path}`);
  }

  console.log("");
  console.log("FULL GENERATION TEST SUCCESS");
  console.log("=================================");
}

main().catch((error) => {
  console.error("");
  console.error("=================================");
  console.error("FULL GENERATION TEST FAILED");
  console.error("=================================");
  console.error("");

  console.error(
    error instanceof Error ? error.message : error
  );

  process.exit(1);
});