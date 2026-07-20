import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/hooks/useAuth";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "UniHaus Lab | Fotografía Profesional para Inmuebles",
  description:
    "Fotografía y video profesional para propiedades en Zona Norte y CABA. Imágenes de alto impacto para destacarte en el mercado inmobiliario.",
  keywords: "fotografía inmobiliaria, video inmuebles, tour 360, drone, planos, Zona Norte",
  openGraph: {
    title: "UniHaus Lab | Fotografía Profesional para Inmuebles",
    description: "Destacate con imágenes de alto impacto",
    images: ["/img/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
