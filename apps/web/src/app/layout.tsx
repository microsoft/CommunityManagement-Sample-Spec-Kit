import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "AcroYoga Community",
  description: "Find your AcroYoga community — events, teachers, and connections.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
