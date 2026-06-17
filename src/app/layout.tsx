import type { Metadata } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { VividBackdrop } from "@/components/theme/VividBackdrop";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Content Tracker — Wenger B2B",
  description: "Wenger B2B content calendar and campaign tracker.",
  icons: { icon: "/brand/mark.png", apple: "/brand/mark.png" },
};

// Runs before paint: sets the theme on <html> from localStorage (or the OS
// preference) so there's no flash of the wrong theme on first load. Vivid is
// opt-in only (never auto-selected): `.dark` class for dark, data-theme for vivid.
const noFlashTheme = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var e=document.documentElement;if(t==='dark'){e.classList.add('dark');}else if(t==='vivid'){e.setAttribute('data-theme','vivid');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${hankenGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
        <VividBackdrop />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
