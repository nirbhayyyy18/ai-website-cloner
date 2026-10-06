import { spawn } from "node:child_process";
import path from "node:path";

export interface BuildValidationResult {
  success: boolean;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}

interface RunCommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

function getNpmCommand(): string {
  return "npm";
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  nodeEnv?: "development" | "production" | "test",
): Promise<RunCommandResult> {
  return new Promise((resolve) => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    let settled = false;

    console.log(
      "[validator] NODE_ENV before spawn:",
      process.env.NODE_ENV,
    );

    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      shell: false,
      env: {
        ...process.env,
        ...(nodeEnv ? { NODE_ENV: nodeEnv } : {}),
        TURBOPACK: "",
      },
    });

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;

      try {
        child.kill();
      } catch {
        // Ignore process cleanup errors.
      }

      resolve({
        exitCode: null,
        stdout: stdoutChunks.join(""),
        stderr:
          `${stderrChunks.join("")}\nCommand timed out after ${timeoutMs}ms`.trim(),
      });
    }, timeoutMs);

    const finish = (result: RunCommandResult) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk.toString());
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk.toString());
    });

    child.on("error", (error: Error) => {
      finish({
        exitCode: null,
        stdout: stdoutChunks.join(""),
        stderr:
          `${stderrChunks.join("")}\n${error.message}`.trim(),
      });
    });

    child.on("close", (exitCode: number | null) => {
      finish({
        exitCode,
        stdout: stdoutChunks.join(""),
        stderr: stderrChunks.join(""),
      });
    });
  });
}

async function installDependencies(
  projectDirectory: string,
  npmCommand: string,
): Promise<RunCommandResult> {
  console.log(
    `[validator] Installing dependencies in ${projectDirectory}`,
  );

  return runCommand(
    npmCommand,
    ["install", "--no-audit", "--no-fund"],
    projectDirectory,
    180000,
  );
}

async function ensureRequiredBuildDependencies(
  projectDirectory: string,
  npmCommand: string,
): Promise<RunCommandResult> {
  console.log(
    "[validator] Ensuring required CSS build dependencies...",
  );

  return runCommand(
    npmCommand,
    [
      "install",
      "--save-dev",
      "autoprefixer@10.4.20",
      "postcss@8.4.49",
      "tailwindcss@3.4.17",
      "--no-audit",
      "--no-fund",
    ],
    projectDirectory,
    180000,
  );
}

export async function validateGeneratedBuild(
  projectDirectory: string,
): Promise<BuildValidationResult> {
  const resolvedProjectDirectory =
    path.resolve(projectDirectory);

  const startedAt = Date.now();
  const npmCommand = getNpmCommand();

  try {
    // --------------------------------------------------
    // 1. Install dependencies
    // --------------------------------------------------

    const installResult = await installDependencies(
      resolvedProjectDirectory,
      npmCommand,
    );

    if (installResult.exitCode !== 0) {
      console.error(
        "[validator] npm install failed.",
      );

      console.error(
        "[validator] Exit code:",
        installResult.exitCode,
      );

      console.error(
        "[validator] stdout:",
        installResult.stdout,
      );

      console.error(
        "[validator] stderr:",
        installResult.stderr,
      );

      return {
        success: false,
        command: "npm install",
        exitCode: installResult.exitCode,
        stdout: installResult.stdout,
        stderr: installResult.stderr,
        durationMs: Date.now() - startedAt,
      };
    }

    console.log(
      "[validator] Dependencies installed successfully.",
    );

    // --------------------------------------------------
    // 2. Ensure CSS build dependencies
    // --------------------------------------------------

    const cssDependenciesResult =
      await ensureRequiredBuildDependencies(
        resolvedProjectDirectory,
        npmCommand,
      );

    if (cssDependenciesResult.exitCode !== 0) {
      console.error(
        "[validator] Required CSS dependencies could not be installed.",
      );

      return {
        success: false,
        command: "npm install --save-dev autoprefixer postcss tailwindcss",
        exitCode: cssDependenciesResult.exitCode,
        stdout: cssDependenciesResult.stdout,
        stderr: cssDependenciesResult.stderr,
        durationMs: Date.now() - startedAt,
      };
    }

    console.log(
      "[validator] Required CSS dependencies are ready.",
    );

    // --------------------------------------------------
    // 3. Production build
    // --------------------------------------------------

    console.log(
      "[validator] Running production build...",
    );

    const buildResult = await runCommand(
      npmCommand,
      ["run", "build"],
      resolvedProjectDirectory,
      180000,
      "production",
    );

    const success =
      buildResult.exitCode === 0;

    if (success) {
      console.log(
        "[validator] Production build succeeded.",
      );
    } else {
      console.error(
        "[validator] Production build failed.",
      );

      console.error(
        "[validator] Exit code:",
        buildResult.exitCode,
      );

      console.error(
        "[validator] stdout:",
        buildResult.stdout,
      );

      console.error(
        "[validator] stderr:",
        buildResult.stderr,
      );
    }

    return {
      success,
      command: "npm run build",
      exitCode: buildResult.exitCode,
      stdout: buildResult.stdout,
      stderr: buildResult.stderr,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      success: false,
      command: "npm run build",
      exitCode: null,
      stdout: "",
      stderr:
        error instanceof Error
          ? error.message
          : "Unknown build validation error.",
      durationMs: Date.now() - startedAt,
    };
  }
}