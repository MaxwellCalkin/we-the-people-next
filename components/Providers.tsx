"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: {
            background: "rgba(10, 22, 40, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#f5f1eb",
          },
        }}
      />
    </SessionProvider>
  );
}
