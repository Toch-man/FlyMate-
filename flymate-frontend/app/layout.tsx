import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Navbar from "../app/components/navbar";

export const metadata: Metadata = {
  title: "FlyMate",
  description: "AI-powered flight booking for Nigeria",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
