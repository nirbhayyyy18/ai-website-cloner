import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

export interface PreviewServer {
  projectId: string;
  projectDirectory: string;
  port: number;
  url: string;
  process: ChildProcess;
}

const activePreviewServers =
  new Map<string, PreviewServer>();

function isPortAvailable(
  port: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    const cleanup = () => {
      try {
        server.close();
      } catch {
        // Ignore cleanup errors.
      }
    };

    server.once("error", () => {
      cleanup();
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen({
      port,
      host: "::",
      ipv6Only: false,
    });
  });
}

async function findAvailablePort(
  startPort: number,
): Promise<number> {
  for (
    let port = startPort;
    port < startPort + 100;
    port += 1
  ) {
    const alreadyTracked = [
      ...activePreviewServers.values(),
    ].some(
      (server) => server.port === port,
    );

    if (alreadyTracked) {
      continue;
    }

    const available =
      await isPortAvailable(port);

    if (available) {
      return port;
    }
  }

  throw new Error(
    "No available preview port found.",
  );
}

function getNextBinary(
  projectDirectory: string,
): string {
  const nextBinary = path.join(
    projectDirectory,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );

  if (!fs.existsSync(nextBinary)) {
    throw new Error(
      `Next.js binary not found at ${nextBinary}. Run npm install first.`,
    );
  }

  return nextBinary;
}

function extractRuntimeError(
  responseBody: string,
): string {
  if (!responseBody.trim()) {
    return "Generated preview returned HTTP 500.";
  }

  const text = responseBody
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " ",
    )
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " ",
    )
    .replace(
      /<[^>]+>/g,
      " ",
    )
    .replace(
      /&quot;/g,
      '"',
    )
    .replace(
      /&#x27;/g,
      "'",
    )
    .replace(
      /&amp;/g,
      "&",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();

  if (!text) {
    return "Generated preview returned HTTP 500.";
  }

  const importantPatterns = [
    "Module not found",
    "Cannot find module",
    "Invalid src prop",
    "Failed to compile",
    "TypeError:",
    "ReferenceError:",
    "SyntaxError:",
    "Error:",
  ];

  for (const pattern of importantPatterns) {
    const index = text.indexOf(pattern);

    if (index !== -1) {
      return text.slice(
        index,
        index + 1000,
      );
    }
  }

  return text.slice(0, 1000);
}

async function waitForServer(
  url: string,
  process: ChildProcess,
  timeoutMs = 30000,
): Promise<void> {
  const startedAt = Date.now();

  while (
    Date.now() - startedAt <
    timeoutMs
  ) {
    if (process.exitCode !== null) {
      throw new Error(
        `Preview server exited before becoming ready. Exit code: ${process.exitCode}`,
      );
    }

    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }

      if (response.status >= 500) {
        const responseBody =
          await response.text();

        const runtimeError =
          extractRuntimeError(
            responseBody,
          );

        throw new Error(
          `Generated preview returned HTTP ${response.status}: ${runtimeError}`,
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes(
          "Generated preview returned HTTP",
        )
      ) {
        throw error;
      }
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 500),
    );
  }

  throw new Error(
    `Preview server did not become ready within ${
      timeoutMs / 1000
    } seconds.`,
  );
}

/**
 * Wait until a child process has completely exited.
 *
 * This is especially important on Windows because taskkill
 * may return before the Node/Next.js process has completely
 * released its files and handles.
 */
async function waitForProcessExit(
  process: ChildProcess,
  timeoutMs = 10000,
): Promise<void> {
  if (process.exitCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    const timeout = setTimeout(() => {
      finish();
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
    };

    process.once("exit", () => {
      cleanup();
      finish();
    });

    process.once("close", () => {
      cleanup();
      finish();
    });
  });
}

/**
 * Completely terminate a preview process and wait for it
 * to release its resources.
 */
async function terminatePreviewProcess(
  process: ChildProcess,
): Promise<void> {
  if (process.exitCode !== null) {
    return;
  }

  console.log(
    `[preview] Stopping preview process ${process.pid ?? "unknown"}...`,
  );

  try {
    if (
      os.platform() === "win32" &&
      process.pid
    ) {
      await new Promise<void>((resolve) => {
        let settled = false;

        const finish = () => {
          if (settled) {
            return;
          }

          settled = true;
          resolve();
        };

        const timeout = setTimeout(
          finish,
          10000,
        );

        const cleanup = () => {
          clearTimeout(timeout);
        };

        process.once("exit", () => {
          cleanup();
          finish();
        });

        process.once("close", () => {
          cleanup();
          finish();
        });

        const killer = spawn(
          "taskkill",
          [
            "/pid",
            String(process.pid),
            "/T",
            "/F",
          ],
          {
            windowsHide: true,
            stdio: "ignore",
          },
        );

        killer.once("error", () => {
          finish();
        });

        killer.once("close", () => {
          /*
           * taskkill has completed, but the Node process
           * itself may still need a moment to exit.
           */
          if (process.exitCode !== null) {
            cleanup();
            finish();
          }
        });
      });
    } else {
      try {
        process.kill();
      } catch {
        // Process may already be gone.
      }

      await waitForProcessExit(
        process,
      );
    }
  } catch {
    /*
     * If normal termination fails, make one final attempt
     * to kill the process directly.
     */
    try {
      process.kill("SIGKILL");
    } catch {
      // Ignore final cleanup errors.
    }

    await waitForProcessExit(
      process,
      3000,
    );
  }

  console.log(
    `[preview] Preview process ${process.pid ?? "unknown"} stopped.`,
  );
}

export async function startPreviewServer(
  projectId: string,
  projectDirectory = path.join(
    process.cwd(),
    "generated-sites",
    projectId,
  ),
): Promise<PreviewServer> {
  const existingServer =
    activePreviewServers.get(
      projectId,
    );

  if (existingServer) {
    try {
      const response =
        await fetch(existingServer.url);

      if (
        response.ok ||
        response.status < 500
      ) {
        return existingServer;
      }
    } catch {
      // Existing server is no longer responding.
    }

    await stopPreviewServer(
      projectId,
    );
  }

  const port =
    await findAvailablePort(3100);

  const nextBuildDirectory =
    path.join(
      projectDirectory,
      ".next",
    );

  /*
   * At this point any tracked preview for this project
   * has already been completely stopped.
   */
  await fsPromises.rm(
    nextBuildDirectory,
    {
      recursive: true,
      force: true,
    },
  );

  const nextBinary =
    getNextBinary(
      projectDirectory,
    );

  console.log(
    `[preview] Starting Next.js preview for ${projectId} on port ${port}`,
  );

  const previewProcess = spawn(
    process.execPath,
    [
      nextBinary,
      "dev",
      "-p",
      String(port),
    ],
    {
      cwd: projectDirectory,
      detached: false,
      stdio: [
        "ignore",
        "pipe",
        "pipe",
      ],
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "development",
      },
    },
  );

  previewProcess.stdout?.on(
    "data",
    (data) => {
      console.log(
        `[preview:${projectId}] ${data
          .toString()
          .trim()}`,
      );
    },
  );

  previewProcess.stderr?.on(
    "data",
    (data) => {
      console.error(
        `[preview:${projectId}] ${data
          .toString()
          .trim()}`,
      );
    },
  );

  const server: PreviewServer = {
    projectId,
    projectDirectory,
    port,
    url: `http://localhost:${port}`,
    process: previewProcess,
  };

  activePreviewServers.set(
    projectId,
    server,
  );

  try {
    await waitForServer(
      server.url,
      previewProcess,
    );

    console.log(
      `[preview] Preview ready at ${server.url}`,
    );

    return server;
  } catch (error) {
    activePreviewServers.delete(
      projectId,
    );

    await terminatePreviewProcess(
      previewProcess,
    );

    throw error;
  }
}

export async function stopPreviewServer(
  projectId: string,
): Promise<boolean> {
  const server =
    activePreviewServers.get(
      projectId,
    );

  if (!server) {
    return false;
  }

  /*
   * Remove it from the active map immediately so no new
   * preview operation treats it as a healthy active server.
   */
  activePreviewServers.delete(
    projectId,
  );

  /*
   * IMPORTANT:
   * Wait for the process to actually terminate before
   * returning. This prevents .next from being deleted while
   * the old Next.js process is still using webpack cache files.
   */
  await terminatePreviewProcess(
    server.process,
  );

  return true;
}

export function getPreviewServer(
  projectId: string,
): PreviewServer | undefined {
  return activePreviewServers.get(
    projectId,
  );
}

export function getActivePreviewServers():
  PreviewServer[] {
  return [
    ...activePreviewServers.values(),
  ];
}