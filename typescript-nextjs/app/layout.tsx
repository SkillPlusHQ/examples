import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkillPlus SDK — Next.js example",
  description: "Every SkillPlus SDK call, rendered as a page",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
