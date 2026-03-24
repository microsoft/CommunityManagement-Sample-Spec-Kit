"use client";

import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";
import NavHeader from "@/components/NavHeader";

const MockUserSwitcher = dynamic(
  () =>
    import("@/components/dev/MockUserSwitcher").then(
      (m) => m.MockUserSwitcher,
    ),
  { ssr: false },
);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NavHeader />
      <main>{children}</main>
      <MockUserSwitcher />
    </SessionProvider>
  );
}
