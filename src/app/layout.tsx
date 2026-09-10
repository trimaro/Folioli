import type { Metadata } from "next";
import { Fraunces, Outfit, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const outfit = Outfit({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
});

const fraunces = Fraunces({
    subsets: ["latin"],
    variable: "--font-display",
    display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "500"],
    variable: "--font-mono",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Folioli",
    description: "A Tauri App",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${outfit.variable} ${fraunces.variable} ${ibmPlexMono.variable}`}>
            <body className="font-sans antialiased">
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
