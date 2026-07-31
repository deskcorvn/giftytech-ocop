import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hành trình OCOP 30 ngày | GiftyID",
  description: "Bản đồ thực hành chuyển đổi số OCOP: làm từng bước, nộp minh chứng, nhận xác minh và hoàn thành chứng chỉ.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
