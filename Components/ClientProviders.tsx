"use client";

import dynamic from "next/dynamic";

// Now ssr: false is allowed because THIS file is a Client Component
const BackButtonHandler = dynamic(
  () => import("./BackButtonHandler"),
  { ssr: false }
);

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackButtonHandler />
      {children}
    </>
  );
}