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
      {/* 자수 이름 폰트는 /api/font-proxy를 통해 주문 텍스트별로 동적 로드된다 (OrderSheet.tsx 참고) —
          Google 폰트 서버가 중국에서 막혀 있어 고정 <link>로는 로드가 실패할 수 있기 때문 */}
      <body className="min-h-full flex flex-col bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}