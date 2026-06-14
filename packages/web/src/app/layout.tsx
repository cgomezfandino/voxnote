import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Voxnote - Transcripción de reuniones",
  description: "Convierte tus reuniones en notas estructuradas con IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Apply the saved theme before first paint to avoid a dark→light flash (FOUC). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('voxnote-theme')==='light')document.documentElement.classList.add('light-theme')}catch(e){}",
          }}
        />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
