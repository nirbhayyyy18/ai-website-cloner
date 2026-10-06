# AI Website Cloner

An AI-powered local-first tool that takes a publicly accessible website URL, analyzes its visual structure and content, generates a new responsive React/Next.js frontend, validates the generated project, automatically repairs build errors, and allows further modification using natural-language prompts.

The generated website is implemented as a new frontend. It does not embed the original website using an iframe.

---

## Demo Flow

```text
Public Website URL
        ↓
Website Analysis
        ↓
UI / Layout Understanding
        ↓
AI Generation Plan
        ↓
React / Next.js Code Generation
        ↓
Build Validation
        ↓
AI Repair Loop (when needed)
        ↓
Local Preview
        ↓
Natural-Language Modification
        ↓
Rebuild + Validation
        ↓
Updated Local Preview

Features
- Analyze publicly accessible websites using a headless browser.
- Extract navigation, headings, paragraphs, buttons, images, sections and visual styles.
- Inspect colors, typography and spacing used by the source website.
- Capture desktop, tablet and mobile layouts during analysis.
- Generate a new responsive React / Next.js frontend.
- Use reusable components instead of generating one monolithic page.
- Validate generated code with a production build.
- Automatically send build failures back to the AI for repair.
- Start generated websites on dynamically selected local ports.
- Modify generated websites using natural-language instructions.
- Preserve the existing design during targeted AI modifications.
- Rebuild and restart the preview after modifications.
- Run completely locally without requiring website hosting.
Tech Stack
Main Application
- Next.js
- React
- TypeScript
- Tailwind CSS
- App Router
Website Analysis
- Playwright
- Chromium
AI
- Google Gemini
- Configurable model through environment variables
Generated Projects
- Next.js
- React
- TypeScript
- Tailwind CSS
Architecture
┌─────────────────────┐
│   Public Website    │
│        URL          │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Website Analyzer   │
│      Playwright     │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Website Analysis   │
│                     │
│ • Structure         │
│ • Navigation        │
│ • Content           │
│ • Images            │
│ • Colors            │
│ • Typography        │
│ • Spacing           │
│ • Responsive data   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│      AI Planner     │
│       Gemini        │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│   Code Generator    │
│                     │
│ React / Next.js     │
│ Reusable Components │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│   Build Validator   │
│     next build      │
└──────────┬──────────┘
           ↓
        Failed?
       /       \
     Yes       No
      ↓         ↓
┌──────────┐  ┌───────────────┐
│ AI Repair│  │ Local Preview │
└────┬─────┘  └───────┬───────┘
     │                ↓
     └──────→ ┌─────────────────┐
              │   AI Modifier   │
              │ Natural Language│
              └────────┬────────┘
                       ↓
                Build + Preview

Project Structure
ai-website-cloner/
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/
│   │   │   ├── generate/
│   │   │   └── modify/
│   │   │
│   │   └── page.tsx
│   │
│   └── lib/
│       ├── ai/
│       │   ├── gemini.ts
│       │   ├── planner.ts
│       │   ├── provider.ts
│       │   └── types.ts
│       │
│       ├── analyzer/
│       │   ├── browser.ts
│       │   ├── types.ts
│       │   └── website-analyzer.ts
│       │
│       ├── generator/
│       │   ├── code-generator.ts
│       │   ├── project-template.ts
│       │   ├── project-writer.ts
│       │   └── types.ts
│       │
│       ├── modifier/
│       │   └── modifier.ts
│       │
│       ├── preview/
│       │   └── preview-server.ts
│       │
│       └── validator/
│           ├── build-validator.ts
│           └── repair.ts
│
├── generated-sites/
│   └── <generated-projects>/
│
├── .env.local
├── package.json
├── tsconfig.json
└── README.md

How It Works
1. Website Analysis
The user provides a public website URL.
The analyzer launches Chromium through Playwright and inspects the rendered page.
It extracts information such as:
- Page metadata
- Navigation links
- Headings
- Paragraphs
- Buttons
- Images and image URLs
- Sections
- Colors
- Font families
- Font sizes
- Font weights
- Padding
- Margins
- Gaps
- Viewport information
- Responsive screenshots
The analysis is converted into structured data that is passed to the AI planning stage.
2. AI Planning
The AI receives the extracted website analysis and creates a generation plan.
The plan describes:
- Required pages
- Components
- Styling approach
- Layout structure
- Files that need to be generated
- Entry point
The planner is designed so that optional component metadata does not break generation when a generated file does not map to a reusable component.
3. Code Generation
The generator converts the AI plan and website analysis into a new Next.js project.
Generated code follows rules such as:
- Use React / Next.js App Router.
- Use TypeScript.
- Use responsive layouts.
- Prefer reusable components.
- Avoid embedding the original website.
- Avoid iframe-based recreation.
- Use external images safely.
- Avoid unsupported Next.js APIs in generated projects.
- Keep generated code within the expected project structure.
The generated project is written under:
generated-sites/<project-id>

4. Build Validation
Every generated project is validated with a production build.
npm run build

This catches issues such as:
- Invalid imports
- Missing dependencies
- Client / Server Component mistakes
- TypeScript errors
- Syntax errors
- Tailwind configuration problems
- Invalid Next.js usage
5. AI Repair Loop
When a generated project fails to build, the build error is passed back to the AI repair system.
The repair system:
1. Reads the generated project files.
2. Reads the actual build error.
3. Produces targeted file changes.
4. Applies the changes.
5. Runs the build again.
The process is limited to a small number of repair attempts to avoid an endless loop.
Example:
Generated code
      ↓
next build
      ↓
Build failed
      ↓
AI reads compiler error
      ↓
AI repairs affected files
      ↓
next build
      ↓
Success

6. Local Preview
After successful validation, the application starts the generated project locally.
Preview ports are selected dynamically to avoid collisions between multiple generated projects.
Example:
http://localhost:3100
http://localhost:3101
http://localhost:3102

The preview lifecycle also stops the previous generated-project process before rebuilding and restarting a fresh preview.
7. Natural-Language Modification
After generation, the user can describe a change in normal language.
Example:
Make the navbar sticky and change the primary accent
color to wine red while preserving the existing design.

The modifier AI reads the current generated files and makes targeted changes.
The modification workflow is:
Natural-language prompt
        ↓
Read current project
        ↓
AI modification
        ↓
Build validation
        ↓
AI repair if required
        ↓
Restart preview

The modification prompt explicitly asks the AI to preserve:
- Existing layout
- Typography
- Spacing
- Images
- Responsive behavior
- Existing components
- Styling architecture
- Functionality
This helps avoid unnecessarily redesigning the generated website.
AI Provider Configuration
The project currently supports provider abstraction so the AI implementation can be changed without rewriting the generation workflow.
The current setup uses Google Gemini.
Create a .env.local file:
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite

Do not commit .env.local or expose the API key publicly.
Getting Started
1. Install dependencies
npm install

2. Install Playwright Chromium
npx playwright install chromium

3. Configure environment variables
Create:
.env.local

and add the Gemini configuration.
4. Start the application
npm run dev -- --webpack

Open:
http://localhost:3000

Usage
Generate a Website
Enter a publicly accessible URL:
https://www.apple.com/

Then click:
Generate Frontend

The application will:
Analyze
→ Plan
→ Generate
→ Validate
→ Repair if needed
→ Start Preview

Modify a Generated Website
After generation, use the AI editing section.
Example prompts:
Make the navbar sticky.

Change the primary accent color to wine red.

Add a testimonials section below the hero.

Remove the pricing section while preserving the rest of the design.

The generated project is rebuilt and a fresh preview is started after the modification.
Validation Strategy
The project uses multiple layers of validation.
Generated Code Validation
Generated file paths and project structure are checked before writing the project.
Next.js Validation
Generated projects are checked for unsupported patterns such as accidental Pages Router APIs when using the App Router.
Production Build
The generated project must pass:
next build

Runtime Preview Validation
The preview server is considered ready only after the generated page responds successfully.
Runtime HTTP 500 responses are surfaced as useful errors rather than being silently ignored.
Design Decisions
Why Playwright?
The target website is analyzed after rendering so the system can inspect the visual result rather than relying only on raw HTML.
Why an intermediate AI planning step?
Separating planning from code generation provides structured context before generating files and makes the generation process easier to control.
Why a repair loop?
Generative code can fail for many reasons. Feeding the real compiler error back into the model makes the system more resilient than assuming the first generated result will always compile.
Why local previews?
The assignment requires local execution and does not require production hosting.
Why dynamic preview ports?
Multiple generated websites may exist at the same time. Dynamic port selection reduces collisions between preview processes.
Why targeted AI modification?
Replacing the entire project for every user request can unnecessarily destroy previously generated design decisions. The modifier therefore asks the AI to make focused changes and preserve the existing implementation.
Cost Awareness
The project is designed as a local-first MVP and uses a configurable AI provider.
The current implementation is configured for Gemini so the application can be demonstrated without introducing an additional paid infrastructure layer.
No website hosting is required for the demo.
Limitations
This is a 48-hour take-home MVP rather than a production website recreation platform.
Potential limitations include:
- Highly dynamic websites may not expose all content during initial analysis.
- Authentication-protected pages are outside the public-URL workflow.
- Interactive behavior of the original site may not always be reproduced exactly.
- Complex JavaScript applications may require additional analysis strategies.
- External image hosts can have restrictions or change independently.
- Pixel-perfect visual reproduction is not guaranteed for every website.
- AI-generated code can still require multiple repair attempts.
- Preview environments are intended for local development rather than production deployment.
Future Improvements
Possible next steps include:
- Visual screenshot comparison between source and generated site.
- Automatic visual similarity scoring.
- Better asset downloading and local asset management.
- Multi-page website generation.
- Component-level modification history.
- Streaming generation progress.
- Persistent project sessions.
- Sandboxed generated-project execution.
- More advanced runtime error repair.
- Support for additional AI providers.
- More detailed responsive breakpoint inference.
Evaluation-Oriented Workflow
The application is designed around the main requirements of the take-home assignment:
URL
 ↓
Analyze Website
 ↓
Understand UI / Layout
 ↓
Generate React / Next.js Frontend
 ↓
Run & Validate
 ↓
Local Preview
 ↓
Natural-Language Modification

The implementation is intentionally generalized rather than hardcoded to a single website.
License
This project was created as a take-home assignment / proof-of-concept MVP.