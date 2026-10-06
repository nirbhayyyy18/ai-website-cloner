export interface ProjectTemplateFile {
  path: string;
  content: string;
}

export interface GeneratedProjectTemplate {
  files: ProjectTemplateFile[];
}

export function createProjectTemplate(): GeneratedProjectTemplate {
  return {
    files: [
      {
        path: "package.json",
        content: JSON.stringify(
          {
            name: "generated-website",
            version: "1.0.0",
            private: true,
            scripts: {
              dev: "next dev",
              build: "next build",
              start: "next start",
            },
            dependencies: {
              next: "14.2.32",
              react: "18.3.1",
              "react-dom": "18.3.1",
            },
            devDependencies: {
              "@types/node": "20.17.30",
              "@types/prop-types":"15.7.15",
              "@types/react": "18.3.18",
              "@types/react-dom": "18.3.5",
              autoprefixer: "10.4.20",
              postcss: "8.4.49",
              tailwindcss: "3.4.17",
              typescript: "5.8.2",
            },
          },
          null,
          2,
        ),
      },

      {
        path: "tsconfig.json",
        content: JSON.stringify(
          {
            compilerOptions: {
              target: "ES2017",
              lib: ["dom", "dom.iterable", "esnext"],
              allowJs: false,
              skipLibCheck: true,
              strict: true,
              noEmit: true,
              esModuleInterop: true,
              module: "esnext",
              moduleResolution: "bundler",
              resolveJsonModule: true,
              isolatedModules: true,
              jsx: "preserve",
              incremental: true,
              plugins: [
                {
                  name: "next",
                },
              ],
              paths: {
                "@/*": ["./src/*"],
              },
            },
            include: [
              "next-env.d.ts",
              ".next/types/**/*.ts",
              "**/*.ts",
              "**/*.tsx",
            ],
            exclude: ["node_modules"],
          },
          null,
          2,
        ),
      },

      {
        path: "next.config.mjs",
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`,
      },

      {
        path: "postcss.config.mjs",
        content: `const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
`,
      },

      {
        path: "tailwind.config.ts",
        content: `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
`,
      },

      {
        path: "next-env.d.ts",
        content: `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// https://nextjs.org/docs/basic-features/typescript
`,
      },

      {
        path: "src/app/layout.tsx",
        content: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generated Website",
  description: "AI generated website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
      },

      {
        path: "src/app/globals.css",
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-height: 100vh;
}
`,
      },
    ],
  };
}