import type { ReactNode } from "react";

import { Link } from "react-router-dom";
import { buttonVariants } from "@heroui/react";

interface AuthSuccessPanelProps {
  icon: ReactNode;
  title: string;
  message: ReactNode;
  ctaLabel: string;
  ctaTo: string;
}

// Shared "you're done" state used by three different auth flows (Signup's
// email-verification notice, ForgotPassword's inbox notice, ResetPassword's
// confirmation) — same icon-over-heading-over-message-over-CTA shape each
// time, just with different copy.
export default function AuthSuccessPanel({
  icon,
  title,
  message,
  ctaLabel,
  ctaTo,
}: AuthSuccessPanelProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      {icon}
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-muted">{message}</p>
      <Link
        className={buttonVariants({
          variant: "primary",
          size: "lg",
          fullWidth: true,
        })}
        to={ctaTo}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
