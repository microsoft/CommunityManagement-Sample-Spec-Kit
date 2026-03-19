"use client";

import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";
import NavHeader from "@/components/NavHeader";

const MockUserSwitcher =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () =>
          import("@/components/dev/MockUserSwitcher").then(
            (m) => m.MockUserSwitcher,
          ),
        { ssr: false },
      )
    : () => null;

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NavHeader />
      <main>{children}</main>
      <MockUserSwitcher />
    </SessionProvider>
  );
}
