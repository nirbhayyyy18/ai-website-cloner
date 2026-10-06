# AI Website Cloner

> An AI-powered local-first agent that analyzes a public website and generates a new responsive React/Next.js frontend from it.

AI Website Cloner takes a publicly accessible website URL, analyzes its rendered UI and visual structure, creates a structured generation plan, generates a new React/Next.js implementation, validates the generated project, automatically repairs build errors when possible, starts a local preview, and supports further changes through natural-language instructions.

The generated website is implemented as a **new frontend**. The original website is **not embedded using an iframe**.

---

## ✨ What It Does

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
AI Repair Loop
        ↓
Local Preview
        ↓
Natural-Language Modification
        ↓
Rebuild + Validation
        ↓
Updated Preview
```

The system is designed to work with different public websites rather than being hardcoded to a single target.

---
🚀 Features
- Analyze publicly accessible websites using Playwright + Chromium
- Extract navigation, headings, paragraphs, buttons, images and sections
- Inspect colors, typography, spacing and layout information
- Capture desktop, tablet and mobile screenshots
- Generate a new responsive React / Next.js frontend
- Generate reusable components instead of one monolithic page
- Validate generated projects using a production build
- Detect common generated-code and Next.js issues
- Automatically send build failures to an AI repair loop
- Retry failed builds with targeted code fixes
- Start generated projects on dynamically selected local ports
- Preview generated websites locally
- Modify generated websites using natural-language prompts
- Preserve existing design during targeted modifications
- Rebuild and restart the preview after modifications
- Run locally without requiring production hosting

---
🧠 Architecture
```text
                         ┌─────────────────────┐
                         │   Public Website    │
                         │        URL          │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  Website Analyzer   │
                         │ Playwright/Chromium  │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  Structured Website│
                         │      Analysis       │
                         │                     │
                         │ • Layout            │
                         │ • Navigation        │
                         │ • Content           │
                         │ • Images            │
                         │ • Colors            │
                         │ • Typography        │
                         │ • Spacing           │
                         │ • Responsive Data   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     AI Planner      │
                         │       Gemini        │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Code Generator    │
                         │                     │
                         │ React / Next.js     │
                         │ TypeScript          │
                         │ Reusable Components │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Build Validator   │
                         │      next build     │
                         └──────────┬──────────┘
                                    │
                              ┌─────┴─────┐
                              │           │
                            Failed      Success
                              │           │
                              ▼           ▼
                       ┌──────────────┐ ┌───────────────┐
                       │   AI Repair  │ │ Local Preview │
                       │     Loop     │ └───────┬───────┘
                       └──────┬───────┘         │
                              │                 ▼
                              └──────────► ┌─────────────────┐
                                          │   AI Modifier   │
                                          │ Natural Language│
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                           Build + Validation
                                                   │
                                                   ▼
                                             Updated Preview
```
---
### Architecture Diagram

For a visual Mermaid version of the architecture:

[View Architecture Diagram](./architecture/architecture.mmd)

---
🛠️ Tech Stack
Main Application
- Next.js
- React
- TypeScript
- Tailwind CSS
- Next.js App Router
  
Website Analysis
- Playwright
- Chromium

AI
- Google Gemini
- Configurable model through environment variables
- Provider abstraction for future AI-provider support
  
Generated Projects
Generated websites use:
- React
- Next.js
- TypeScript
- Tailwind CSS
  
Generated websites are created dynamically under generated-sites/ during local execution. This directory is intentionally ignored by Git.

---
🔍 How It Works
1. Website Analysis
The user provides a publicly accessible URL.
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
The result is converted into structured data for the AI planning stage.

2. AI Planning
The structured website analysis is sent to the AI planner.
The planner determines:
- Required pages
- Page structure
- Components
- Styling approach
- Layout structure
- Generated files
- Entry point
Separating planning from code generation gives the generator a more structured representation of the website instead of asking the model to directly produce an entire application from raw observations.

3. Code Generation
The generator converts the AI plan and website analysis into a new Next.js project.

Generated code is instructed to:
- Use Next.js App Router
- Use TypeScript
- Use responsive layouts
- Use reusable components
- Avoid iframe-based recreation
- Avoid embedding the original website
- Handle external images safely
- Avoid unsupported Next.js APIs
- Stay within the expected project structure
Generated projects are written under:
generated-sites/<project-id>

4. Build Validation
Every generated project is validated using a production build:
npm run build

The validation step catches problems such as:
- Invalid imports
- Missing dependencies
- Client / Server Component mistakes
- TypeScript errors
- Syntax errors
- Tailwind configuration issues
- Invalid Next.js APIs
- Generated project configuration problems
- 
5. AI Repair Loop
Generated code can fail even when the overall generation plan is correct.
When a build fails, the actual compiler/build error is sent to the AI repair system.
```text
Generated Project
       ↓
   next build
       ↓
   Build Failed
       ↓
AI Reads Actual Error
       ↓
Targeted File Changes
       ↓
   next build
       ↓
    Success
```
---
The repair system:
1. Reads the generated project files
2. Reads the actual build error
3. Generates targeted changes
4. Applies the changes
5. Runs the build again
The repair process is limited to a small number of attempts to prevent endless retries.

---
🖥️ Local Preview

After successful validation, the generated project is started locally.
Preview ports are selected dynamically to avoid collisions between generated projects.
Example:
http://localhost:3100
http://localhost:3101
http://localhost:3102

The preview server also handles the lifecycle of generated projects by stopping the previous preview before rebuilding and starting a fresh preview.

---
✏️ Natural-Language Modification
After generation, the user can modify the generated website using normal language.
Example:
Make the navbar sticky and change the primary
accent color to wine red while preserving
the existing design.

The modifier reads the current generated project and makes targeted changes.
Modification Flow
```text
Natural-Language Prompt
          ↓
Read Current Project
          ↓
AI Modification
          ↓
Build Validation
          ↓
AI Repair if Required
          ↓
Restart Preview
```
---
The modifier is instructed to preserve:
- Existing layout
- Typography
- Spacing
- Images
- Responsive behavior
- Existing components
- Styling architecture
- Functionality
This prevents a small requested change from unnecessarily redesigning the entire generated website.
---
🤖 AI Provider Configuration

The application uses a provider abstraction so the AI implementation can be changed without rewriting the generation workflow.
The current setup uses Google Gemini.

Create a .env.local file:
```text
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
```
---
Never commit .env.local or expose the API key publicly.
The repository .gitignore already excludes environment files.

---
⚙️ Getting Started
1. Clone the repository
```text
git clone https://github.com/nirbhayyyy18/ai-website-cloner.git
cd ai-website-cloner
```
---
3. Install dependencies
```text
npm install
```
---
5. Install Playwright Chromium
```text
npx playwright install chromium
```
---
7. Configure Gemini
Create:
```text
.env.local
```
---
Add:
```text
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
```
---
5. Start the application
```text
npm run dev -- --webpack
```
---
Open:

http://localhost:3000

🎯 Usage

Generate a Website
Enter a publicly accessible URL, for example:

https://www.apple.com/

Then click:
Generate Frontend

```text
The application performs:
Analyze
   ↓
Plan
   ↓
Generate
   ↓
Validate
   ↓
Repair if needed
   ↓
Start Preview
```
---
Modify a Generated Website
After generation, use the AI modification section.

Example prompts:

Make the navbar sticky.

Change the primary accent color to wine red.

Add a testimonials section below the hero.

Remove the pricing section while preserving the rest of the design.

The generated project is rebuilt and a fresh preview is started after the modification.

---
🧪 Validation Strategy
The system uses multiple validation layers.
Generated Code Validation
Generated file paths and project structure are checked before writing the project.

Next.js Validation
The generated project is checked for unsupported patterns, including accidental Pages Router APIs when using the App Router.

Production Build
The generated project must successfully pass:
next build

Runtime Preview Validation
The preview server waits for the generated application to become responsive.
HTTP 500 responses and common runtime failures are surfaced instead of being silently ignored.

---
🧩 Design Decisions

Why Playwright?
The target website is analyzed after rendering so the system can inspect the actual rendered UI instead of relying only on raw HTML.

Why an AI Planning Step?
Planning is separated from code generation so the generator receives structured information about pages, components, styling and files.

Why a Repair Loop?
AI-generated code can fail because of imports, dependencies, client/server boundaries or framework-specific constraints. Passing the real compiler error back to the model makes the generation workflow more resilient.

Why Local Preview?
The assignment requires local execution and does not require production hosting.

Why Dynamic Preview Ports?
Multiple generated projects can exist simultaneously. Dynamic port selection reduces collisions between preview processes.

Why Targeted Modification?
Regenerating the entire website for every user request could destroy previously generated design decisions. The modifier therefore focuses on the requested change while preserving the existing implementation.

---

🌐 Generalization

The implementation is not hardcoded to a specific website.
The evaluator can provide different public websites, and the system follows the same pipeline:
```text
URL
 ↓
Analyze
 ↓
Understand
 ↓
Plan
 ↓
Generate
 ↓
Validate
 ↓
Preview
 ↓
Modify
```
---
The analyzer extracts website-specific information dynamically, while the generator uses that information to produce the frontend.

---
🎬 Demo Flow

The recommended demonstration follows the complete agent workflow:
```text
1. Enter website URL
        ↓
2. Analyze website
        ↓
3. Generate frontend
        ↓
4. Show generated preview
        ↓
5. Show responsive/mobile layout
        ↓
6. Give natural-language modification
        ↓
7. Show modified website
        ↓
8. Explain validation + AI repair loop
```
