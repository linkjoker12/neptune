import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "neptune | Type beat BPM & key analyzer",
  description:
    "YouTube type beat metadata, comments, and authorized audio analysis for BPM, key, and converted downloads.",
  icons: [{ rel: "icon", url: "/icon.svg", type: "image/svg+xml" }]
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
