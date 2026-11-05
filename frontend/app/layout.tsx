import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./brand.css";
export const viewport: Viewport = { themeColor: "#123C2C" };
export const metadata: Metadata = {
  title: "GreenSite EMS — Điều phối năng lượng công trường",
  description:
    "Mô phỏng và quản lý điện lưới, điện mặt trời, BESS và diesel. So sánh chi phí, kiểm soát Zero-Export và phân tích năng lượng với trợ lý AI.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/mark.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
