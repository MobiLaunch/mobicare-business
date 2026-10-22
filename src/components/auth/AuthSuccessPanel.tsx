import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/arc/button/button";

interface AuthSuccessPanelProps {
  title: string;
  message: ReactNode;
  ctaLabel: string;
  ctaTo: string;
}

// Shared "you're done" state used by three auth flows (Signup's
// email-verification notice, ForgotPassword's inbox notice, ResetPassword's
// confirmation): heading, message, one action.
export default function AuthSuccessPanel({ title, message, ctaLabel, ctaTo }: AuthSuccessPanelProps) {
  return (
    <div className="mc-stack">
      <h1 className="mc-h2">{title}</h1>
      <p className="mc-text">{message}</p>
      <Link style={{ textDecoration: "none" }} to={ctaTo}><Button tabIndex={-1}>{ctaLabel}</Button></Link>
    </div>
  );
}
