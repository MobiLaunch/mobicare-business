import type { ReactNode } from "react";

import PageMeta from "@/components/PageMeta";

interface AuthCardShellProps {
  metaTitle: string;
  metaDescription: string;
  title?: string;
  description?: string;
  children: ReactNode;
}

// Shared layout for every auth page (Login, Signup, ForgotPassword,
// ResetPassword): one centered column with a heading and the form.
export default function AuthCardShell({ metaTitle, metaDescription, title, description, children }: AuthCardShellProps) {
  return (
    <div className="mc-page mc-section">
      <PageMeta description={metaDescription} title={metaTitle} />
      <div className="mc-stack" style={{ maxWidth: "26rem", marginInline: "auto", gap: "var(--space-6)" }}>
        {title && (
          <header className="mc-stack-sm">
            <h1 className="mc-h2">{title}</h1>
            {description && <p className="mc-text">{description}</p>}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
