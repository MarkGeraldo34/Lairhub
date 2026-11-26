import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Providers from "./providers";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "LairHub — a bed for one night, paid once you confirm",
  description:
    "Find a local host for a single night. Your payment is held in escrow on QIE and released to the host when you confirm the stay took place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e1120",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main className="wrap">{children}</main>
          <footer className="wrap foot">
            Payments are held by the StayEscrow contract on QIE and released to the host only after you confirm your stay
            (from 09:00 UTC the morning after your night).
          </footer>
        </Providers>
      </body>
    </html>
  );
}
