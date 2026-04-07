import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { getLocaleDirection } from "@acroyoga/shared/types/i18n";
import type { Locale } from "@acroyoga/shared/types/i18n";
import Providers from "@/components/Providers";
import { SkipLink } from "@acroyoga/shared-ui/SkipLink";

export const metadata = {
  title: "AcroYoga Community",
  description: "Find your AcroYoga community — events, teachers, and connections.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = getLocaleDirection(locale);

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        <SkipLink targetId="main-content" label="Skip to main content" />
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

