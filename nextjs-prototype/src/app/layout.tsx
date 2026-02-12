import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Voxnote - Transcripción inteligente con IA",
  description: "Pipeline local: Audio → Whisper → LLM → Obsidian",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${plusJakarta.variable} ${inter.variable} font-body bg-cyber-bg text-white antialiased`}
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 0%, rgba(159, 122, 234, 0.15) 0%, #0D0D12 50%)",
          backgroundAttachment: "fixed",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
