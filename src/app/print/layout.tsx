
import { ReactNode } from "react";

export default function PrintLayout({ children }: { children: ReactNode }) {
  // This layout wrapper ensures that print routes do not inherit the
  // main application's navigation, sidebars, etc. It provides a clean
  // slate for a print-friendly document structure. The root layout's
  // <html> and <body> tags are handled by Next.js, and we avoid
  // nesting them here to prevent hydration errors.
  return <>{children}</>;
}

    