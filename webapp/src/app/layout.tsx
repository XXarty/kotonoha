import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteCopy } from "@/lib/site-copy";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ことのは｜每天一点日语",
    template: "%s｜ことのは",
  },
  description: siteCopy.home.description,
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
