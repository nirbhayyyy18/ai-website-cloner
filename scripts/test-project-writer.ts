import { writeGeneratedProject } from "../src/lib/generator/project-writer";

async function main() {
  const project = {
    files: [
      {
        path: "src/app/page.tsx",
        content: `export default function Home() {
  return (
    <main>
      <h1>AI Website Cloner Test</h1>
      <p>Generated project template is working.</p>
    </main>
  );
}
`,
      },
    ],
    entryFile: "src/app/page.tsx",
  };

  try {
    const directory = await writeGeneratedProject(
      project,
      "template-test"
    );

    console.log("Project created successfully:");
    console.log(directory);
  } catch (error) {
    console.error("Project writer test failed:", error);
    process.exit(1);
  }
}

main();