import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AuthGate } from "@/components/AuthGate";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap" });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Notre point du dimanche",
  description: "Le point du dimanche, à deux 💞",
  applicationName: "Notre point",
  appleWebApp: { capable: true, title: "Notre point", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFF8F0",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Applique le thème sombre avant l'affichage (évite le flash blanc) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme')||'auto';var n=new Date();var d=t==='sombre'||(t==='auto'&&((n.getDay()===0&&n.getHours()>=18)||matchMedia('(prefers-color-scheme: dark)').matches));if(d)document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className={`${fraunces.variable} ${dmSans.variable} antialiased`}>
        <Providers>
          <AuthGate>{children}</AuthGate>
        </Providers>
      </body>
    </html>
  );
}
