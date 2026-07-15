import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteCopy } from "@/lib/site-copy";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://kotonoha-japanese-learning.vercel.app"),
  title: {
    default: "ことのは｜每天一点日语",
    template: "%s｜ことのは",
  },
  description: siteCopy.home.description,
  openGraph: {
    title: "ことのは｜每天一点日语",
    description: siteCopy.home.description,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "KOTONOHA ことのは" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ことのは｜每天一点日语",
    description: siteCopy.home.description,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="zh-CN">
      <body>
        <SiteHeader />
        <div className="site-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
