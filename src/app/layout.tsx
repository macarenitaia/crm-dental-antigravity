import type { Metadata } from "next";
import "./globals.css";
import AuthLayout from "@/components/AuthLayout";

export const metadata: Metadata = {
  title: "Agentic CRM",
  description: "AI-Powered WhatsApp CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased bg-[#f0f2f5] text-gray-900 flex h-screen overflow-hidden font-sans" suppressHydrationWarning>
        <AuthLayout>
          {children}
        </AuthLayout>
      </body>
    </html>
  );
}
