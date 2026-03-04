import type { Metadata } from "next";
import "./globals.css";
import { Noto_Sans_Hebrew } from "next/font/google";
import { Providers } from "./providers";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { AuthGuard } from "@/components/AuthGuard";
import { UserMenu } from "@/components/UserMenu";

const noto = Noto_Sans_Hebrew({
  subsets: ["hebrew"],
  weight: ["400", "900"],
  display: "swap",
  variable: "--font-noto-hebrew",
});

export const metadata: Metadata = {
  title: "Production Board | לוח הפקה",
  description: "לוח הפקה מובנה במקום סטטוס וואטסאפ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${noto.variable} font-app min-h-screen antialiased bg-app text-app`}>
        <Providers>
          <AuthGuard>

            <header className="sticky top-0 z-20 bg-app border-b border-app">
              <div className="max-w-6xl mx-auto w-full px-6 py-4 flex items-center justify-end gap-4">
                <UserMenu />
                <ThemeSwitch />
              </div>
            </header>

            <main className="w-full">
              <div className="max-w-6xl mx-auto w-full px-6 py-8">
                {children}
              </div>
            </main>

          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}