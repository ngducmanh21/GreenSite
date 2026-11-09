import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./brand.css";
export const viewport: Viewport = { themeColor: "#123C2C" };
export const metadata: Metadata = {
  title: "GreenSite EMS — Điều phối năng lượng công trường",
  description:
    "Khám phá GreenSite EMS: mô phỏng điều phối điện lưới, mặt trời, BESS và diesel cho công trường; so sánh phương án và báo cáo năng lượng có nguồn giả định.",
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
