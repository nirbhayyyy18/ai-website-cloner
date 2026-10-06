import path from "node:path";
import {
  startPreviewServer,
  stopPreviewServer,
} from "../src/lib/preview/preview-server";

const projectId = "template-test";

const projectDirectory = path.join(
  process.cwd(),
  "generated-sites",
  projectId,
);

async function main() {
  console.log("Starting preview server...");

  try {
    const server = await startPreviewServer(
      projectId,
      projectDirectory,
    );

    console.log(`Preview available at: ${server.url}`);
    console.log("Press Ctrl+C to stop.");

    process.on("SIGINT", async () => {
      await stopPreviewServer(projectId);
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await stopPreviewServer(projectId);
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start preview server:");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

void main();