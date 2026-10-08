import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

// Deliberately using system font stacks (defined in tailwind.config.ts)
// instead of next/font/google — this avoids a build-time dependency on
// fonts.googleapis.com, which is one less thing that can fail on
// hackathon-venue wifi. Swap back to next/font/google any time; the
// --font-* CSS variables it produces are drop-in compatible.

export const metadata: Metadata = {
  title: "FORGE-AI | Digital Forensic Investigation Platform",
  description: "AI-assisted digital forensic investigation and evidence analysis command center.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
