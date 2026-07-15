import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "发射日程 · whenliftoff",
  description: "查看全球火箭发射时间、任务状态、发射机构与发射地点。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
