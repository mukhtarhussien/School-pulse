import type { Metadata } from "next";
import { Suspense } from "react";
import { headers, cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { VisitTracker } from "@/components/visit-tracker";
import { LOCALE_COOKIE, localeFromGeo, localeInfo, isLocale } from "@/lib/locale";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "مدارس | بوابة الطالب", template: "%s | مدارس" },
  description: "بوابة الطالب المدرسية — درجاتك، واجباتك، وحضورك في مكان واحد.",
};

// Locale and session are derived from request headers/cookies at the root.
// This app-wide request-time rendering is intentional with Cache Components.
export const instant = false;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [requestHeaders, cookieStore, user] = await Promise.all([headers(), cookies(), getCurrentUser()]);
  const saved = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : isLocale(user?.preferences?.language) ? user.preferences.language : localeFromGeo(
    requestHeaders.get('x-vercel-ip-country'), requestHeaders.get('x-vercel-ip-country-region'), requestHeaders.get('x-vercel-ip-city'),
  );
  const info = localeInfo[locale];
  return (
    <html lang={info.htmlLang} dir={info.dir}>
      <body><Suspense fallback={null}><VisitTracker /></Suspense>{children}</body>
    </html>
  );
}
