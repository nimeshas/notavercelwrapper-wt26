import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Clircel Sign In",
  description: "Sign in with GitHub and grant repository access to Clircel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
