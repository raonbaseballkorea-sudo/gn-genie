import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GN Glove — Custom Baseball Gloves",
  description: "Your glove. Your way. $169. 30 Days.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 이름 자수 스타일 선택지(필기체/블록체/우아한체)에 쓰이는 언어별 폰트 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&family=Black+Han+Sans&family=Nanum+Myeongjo:wght@400;700&family=Yuji+Syuku&family=Noto+Sans+JP:wght@400;900&family=Noto+Serif+JP:wght@400;700&family=Ma+Shan+Zheng&family=Noto+Sans+SC:wght@400;900&family=Noto+Serif+SC:wght@400;700&family=Mali:wght@400;700&family=Kanit:wght@400;700&family=Charm:wght@400;700&family=Yellowtail&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}