"use client";

import type { FormEvent } from "react";
import { useState } from "react";

interface WebsiteAnalysis {
  url: string;
  metadata: {
    title: string;
    description: string;
    language: string;
  };
  viewport: {
    width: number;
    height: number;
  };
  navigation: {
    text: string;
    href: string;
  }[];
  headings: {
    level: number;
    text: string;
  }[];
  paragraphs: string[];
  buttons: string[];
  images: {
    src: string;
    alt: string;
  }[];
  colors: {
    background: string[];
    text: string[];
    border: string[];
    accent: string[];
  };
  typography: {
    fontFamilies: string[];
    fontSizes: string[];
    fontWeights: string[];
  };
  spacing: {
    padding: string[];
    margin: string[];
    gap: string[];
  };
  sections: {
    tag: string;
    text: string;
    className: string;
  }[];
  responsive: {
    desktop: {
      width: number;
      height: number;
      screenshot: string;
    };
    tablet: {
      width: number;
      height: number;
      screenshot: string;
    };
    mobile: {
      width: number;
      height: number;
      screenshot: string;
    };
  };
}

interface GenerateResponse {
  success: boolean;
  error?: string;
  preview?: {
    url: string;
    port: number;
    projectId: string;
  };
  analysis?: WebsiteAnalysis;
  provider?:
    | string
    | {
        name: string;
        model: string;
      };
  model?: string;
  validation?: {
    success: boolean;
    command: string;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    durationMs: number;
  };
}

interface ModifyResponse {
  success: boolean;
  projectId?: string;
  explanation?: string;
  modifiedFiles?: string[];
  validation?: {
    success: boolean;
    command: string;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    durationMs: number;
  };
  repairAttempts?: number;
  provider?: string;
  model?: string;
  previewUrl?: string;
  error?: string;
}

const workflowSteps = [
  {
    number: "01",
    title: "Analyze",
    description: "Inspect structure, content, assets and styles.",
  },
  {
    number: "02",
    title: "Understand",
    description: "Extract layout, typography, colors and sections.",
  },
  {
    number: "03",
    title: "Generate",
    description: "Create a reusable React / Next.js frontend.",
  },
  {
    number: "04",
    title: "Validate",
    description: "Build the generated project and repair errors.",
  },
  {
    number: "05",
    title: "Preview",
    description: "Run the generated website locally.",
  },
];

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-400/30 hover:bg-white/[0.05]">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold tracking-tight text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function TagList({
  items,
  emptyText = "None detected",
}: {
  items: string[];
  emptyText?: string;
}) {
  if (!items.length) {
    return (
      <span className="text-sm text-slate-600">
        {emptyText}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 8).map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-300"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const [analysis, setAnalysis] =
    useState<WebsiteAnalysis | null>(null);

  const [previewUrl, setPreviewUrl] = useState("");
  const [projectId, setProjectId] = useState("");

  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [modificationPrompt, setModificationPrompt] =
    useState("");

  const [modificationStatus, setModificationStatus] =
    useState("");

  const [modificationError, setModificationError] =
    useState("");

  const [modificationExplanation, setModificationExplanation] =
    useState("");

  const [isModifying, setIsModifying] =
    useState(false);

  async function handleGenerate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setStatus("");
    setAnalysis(null);
    setPreviewUrl("");
    setProjectId("");
    setProvider("");
    setModel("");
    setModificationStatus("");
    setModificationError("");
    setModificationExplanation("");

    if (!url.trim()) {
      setError("Please enter a website URL.");
      return;
    }

    try {
      setIsGenerating(true);
      setStatus(
        "Analyzing website and generating frontend...",
      );

      const response = await fetch(
        "/api/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: url.trim(),
          }),
        },
      );

      const data =
        (await response.json()) as GenerateResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Frontend generation failed.",
        );
      }

      setStatus(
        "Frontend generated, validated and ready for preview.",
      );

      if (data.analysis) {
        setAnalysis(data.analysis);
      }

      if (data.preview?.url) {
        setPreviewUrl(data.preview.url);
      }

      if (data.preview?.projectId) {
        setProjectId(data.preview.projectId);
      }

      if (data.provider) {
        if (
          typeof data.provider ===
          "string"
        ) {
          setProvider(data.provider);
        } else {
          setProvider(
            data.provider.name,
          );
          setModel(
            data.provider.model,
          );
        }
      }

      if (data.model) {
        setModel(data.model);
      }
    } catch (generationError) {
      setStatus("");

      setError(
        generationError instanceof Error
          ? generationError.message
          : "Something went wrong while generating the frontend.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleModify(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setModificationError("");
    setModificationStatus("");
    setModificationExplanation("");

    if (!projectId) {
      setModificationError(
        "Generate a website first before modifying it.",
      );
      return;
    }

    if (!modificationPrompt.trim()) {
      setModificationError(
        "Please enter a modification request.",
      );
      return;
    }

    try {
      setIsModifying(true);

      setModificationStatus(
        "AI is modifying the generated frontend...",
      );

      const response = await fetch(
        "/api/modify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            prompt:
              modificationPrompt.trim(),
          }),
        },
      );

      const data =
        (await response.json()) as ModifyResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Frontend modification failed.",
        );
      }

      setModificationStatus(
        "Modification applied, build validated and preview restarted.",
      );

      setModificationExplanation(
        data.explanation ||
          "The generated frontend was modified successfully.",
      );

      if (data.previewUrl) {
        setPreviewUrl(data.previewUrl);
      }

      setModificationPrompt("");
    } catch (modificationErrorValue) {
      setModificationStatus("");

      setModificationError(
        modificationErrorValue instanceof Error
          ? modificationErrorValue.message
          : "Something went wrong while modifying the frontend.",
      );
    } finally {
      setIsModifying(false);
    }
  }

  const generated =
    Boolean(previewUrl);

  return (
    <main className="min-h-screen overflow-hidden bg-[#070b14] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-240px] h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-300px] right-[-150px] h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
                AI Website Cloner
              </div>

              <h1 className="max-w-4xl text-4xl font-bold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                Turn any public website into a{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                  new React frontend.
                </span>
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-400 sm:text-lg">
                Analyze a public website, understand its
                visual structure, generate a responsive
                frontend, automatically repair build
                errors, preview it locally, and modify it
                using natural language.
              </p>
            </div>

            <div className="hidden rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 lg:block">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-600">
                Runtime
              </p>
              <p className="mt-1 font-mono text-sm text-emerald-400">
                Local / Free AI
              </p>
            </div>
          </div>
        </header>

        {/* Generator */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 sm:p-7">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <div className="mb-5">
              <p className="text-sm font-semibold text-cyan-300">
                Start a new generation
              </p>

              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                Enter website URL
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                The URL must be publicly accessible.
              </p>
            </div>

            <form onSubmit={handleGenerate}>
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-600">
                    ↗
                  </div>

                  <input
                    id="website-url"
                    type="url"
                    value={url}
                    onChange={(event) =>
                      setUrl(event.target.value)
                    }
                    placeholder="https://example.com"
                    disabled={isGenerating}
                    className="min-h-14 w-full rounded-2xl border border-white/10 bg-[#050810] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/5 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="min-h-14 rounded-2xl bg-cyan-300 px-7 font-semibold text-slate-950 transition hover:bg-cyan-200 hover:shadow-lg hover:shadow-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating
                    ? "Generating..."
                    : "Generate Frontend →"}
                </button>
              </div>

              {status && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] px-4 py-3 text-sm text-cyan-300">
                  {isGenerating && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
                  )}
                  {status}
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm leading-6 text-red-300">
                  {error}
                </div>
              )}
            </form>
          </div>
        </section>

        {/* Workflow */}
        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                How it works
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Agent workflow
              </h2>
            </div>

            <span className="hidden text-xs text-slate-600 sm:block">
              URL → Code → Preview
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {workflowSteps.map(
              (step, index) => (
                <div
                  key={step.number}
                  className={`rounded-2xl border p-4 transition ${
                    generated && index === 4
                      ? "border-emerald-400/30 bg-emerald-400/[0.05]"
                      : "border-white/10 bg-white/[0.025] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-600">
                      {step.number}
                    </span>

                    {generated &&
                      index === 4 && (
                        <span className="text-xs text-emerald-400">
                          ✓
                        </span>
                      )}
                  </div>

                  <h3 className="mt-5 text-sm font-semibold text-slate-200">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {step.description}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>

        {/* Preview */}
        {previewUrl && (
          <section className="mt-10 overflow-hidden rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.035]">
            <div className="flex flex-col gap-5 border-b border-emerald-400/10 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />

                  <p className="text-sm font-semibold text-emerald-300">
                    Local Preview Ready
                  </p>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Generated frontend is running locally.
                </p>
              </div>

              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
              >
                Open Preview ↗
              </a>
            </div>

            <div className="p-5 sm:p-6">
              <div className="rounded-xl border border-white/10 bg-[#050810] px-4 py-3 font-mono text-xs text-slate-500">
                {previewUrl}
              </div>
            </div>
          </section>
        )}

        {/* AI Provider */}
        {provider && (
          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                AI Provider
              </p>

              <p className="mt-2 font-medium text-slate-200">
                {provider}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Model
              </p>

              <p className="mt-2 font-medium text-slate-200">
                {model || "Not specified"}
              </p>
            </div>
          </section>
        )}

        {/* Website Analysis */}
        {analysis && (
          <section className="mt-10">
            <div className="mb-6">
              <p className="text-sm font-semibold text-cyan-300">
                Website Analysis
              </p>

              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                {analysis.metadata.title ||
                  "Analyzed Website"}
              </h2>

              <p className="mt-2 break-all font-mono text-xs text-slate-600">
                {analysis.url}
              </p>
            </div>

            {/* Metrics */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Navigation"
                value={analysis.navigation.length}
                description="links detected"
              />

              <MetricCard
                label="Headings"
                value={analysis.headings.length}
                description="headings detected"
              />

              <MetricCard
                label="Images"
                value={analysis.images.length}
                description="assets detected"
              />

              <MetricCard
                label="Sections"
                value={analysis.sections.length}
                description="page sections detected"
              />
            </div>

            {/* Analysis details */}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <h3 className="font-semibold">
                  Typography
                </h3>

                <div className="mt-5 space-y-5 text-sm">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-600">
                      Font families
                    </p>
                    <TagList
                      items={
                        analysis.typography
                          .fontFamilies
                      }
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-600">
                      Font sizes
                    </p>
                    <TagList
                      items={
                        analysis.typography
                          .fontSizes
                      }
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-600">
                      Font weights
                    </p>
                    <TagList
                      items={
                        analysis.typography
                          .fontWeights
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <h3 className="font-semibold">
                  Visual system
                </h3>

                <div className="mt-5 space-y-5 text-sm">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-600">
                      Background colors
                    </p>
                    <TagList
                      items={
                        analysis.colors
                          .background
                      }
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-600">
                      Text colors
                    </p>
                    <TagList
                      items={
                        analysis.colors.text
                      }
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-600">
                      Accent colors
                    </p>
                    <TagList
                      items={
                        analysis.colors.accent
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Content snapshot */}
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-600">
                  Page language
                </p>

                <p className="mt-2 font-medium text-slate-200">
                  {analysis.metadata.language ||
                    "Not detected"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-600">
                  Desktop viewport
                </p>

                <p className="mt-2 font-mono text-sm text-slate-300">
                  {analysis.viewport.width} ×{" "}
                  {analysis.viewport.height}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-600">
                  Detected buttons
                </p>

                <p className="mt-2 font-medium text-slate-200">
                  {analysis.buttons.length}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* AI Modification */}
        <section className="mt-10 overflow-hidden rounded-3xl border border-violet-400/20 bg-violet-400/[0.035]">
          <div className="border-b border-violet-400/10 p-6 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-violet-300">
                  AI Editing
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-tight">
                  Modify with natural language
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Describe a visual or functional change.
                  The AI modifies the existing generated
                  code, validates the build, and restarts
                  the local preview.
                </p>
              </div>

              <div className="hidden rounded-xl border border-violet-400/10 bg-violet-400/[0.04] px-3 py-2 text-xs text-violet-300 sm:block">
                AI → Edit → Validate
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-7">
            <form onSubmit={handleModify}>
              <textarea
                value={modificationPrompt}
                onChange={(event) =>
                  setModificationPrompt(
                    event.target.value,
                  )
                }
                disabled={isModifying}
                rows={5}
                placeholder='Example: "Change the primary color to wine red and make the navbar sticky while preserving the existing design."'
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#050810] px-4 py-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-700 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-400/5 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-slate-600">
                    {projectId
                      ? `Editing project: ${projectId}`
                      : "Generate a website first to enable AI editing."}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={
                    isModifying ||
                    !projectId
                  }
                  className="min-h-12 rounded-xl bg-violet-300 px-6 font-semibold text-slate-950 transition hover:bg-violet-200 hover:shadow-lg hover:shadow-violet-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isModifying
                    ? "Applying changes..."
                    : "Apply Modification →"}
                </button>
              </div>

              {modificationStatus && (
                <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm leading-6 text-emerald-300">
                  {modificationStatus}
                </div>
              )}

              {modificationExplanation && (
                <div className="mt-3 rounded-xl border border-violet-400/15 bg-violet-400/[0.05] p-4 text-sm leading-6 text-violet-200">
                  <span className="font-semibold">
                    AI:
                  </span>{" "}
                  {modificationExplanation}
                </div>
              )}

              {modificationError && (
                <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm leading-6 text-red-300">
                  {modificationError}
                </div>
              )}
            </form>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-14 border-t border-white/5 pt-6">
          <div className="flex flex-col gap-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              AI Website Cloner · Local-first MVP
            </p>

            <p>
              Analyze · Generate · Validate · Modify
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}