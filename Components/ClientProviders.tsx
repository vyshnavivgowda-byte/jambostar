"use client";

import BackButtonHandler from "./BackButtonHandler";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackButtonHandler />
      {children}
    </>
  );
}