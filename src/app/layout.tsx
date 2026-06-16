import type { Metadata } from "next";
import { Huninn } from "next/font/google";
import "./globals.css";

const huninn = Huninn({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "喝水紀錄",
  description: "喝水紀錄 App",

  icons: {
    icon: "/icon-512x512.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className={huninn.className}>
        {children}
      </body>
    </html>
  );
}