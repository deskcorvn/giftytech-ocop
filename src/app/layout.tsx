import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GiftyID OCOP Platform",
  description: "Backend and certificate verification service for the OCOP 30-day learning journey.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
