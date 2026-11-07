import type { ReactNode } from "react";

import { Card, Chip } from "@heroui/react";

import PageMeta from "@/components/PageMeta";
import BackgroundCanvas from "@/components/BackgroundCanvas";

interface AuthCardShellProps {
  metaTitle: string;
  metaDescription: string;
  icon?: ReactNode;
  chipLabel?: string;
  title?: string;
  description?: string;
  children: ReactNode;
}

// Shared layout for every auth page (Login, Signup, ForgotPassword,
// ResetPassword) — background, centered card, icon chip + heading. Pulled
// out because all four pages were otherwise identical wrapper markup around
// different form content. Header (icon/chip/title/description) is optional:
// the "success" state of Signup/ForgotPassword/ResetPassword shows a single
// standalone icon+heading of its own (see AuthSuccessPanel) instead of this
// header, so passing no `title` skips it rather than showing both.
export default function AuthCardShell({
  metaTitle,
  metaDescription,
  icon,
  chipLabel,
  title,
  description,
  children,
}: AuthCardShellProps) {
  return (
    <div className="relative min-h-screen">
      <PageMeta description={metaDescription} title={metaTitle} />
      <BackgroundCanvas />

      <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
        <Card className="w-full p-6 sm:p-8">
          {title && (
            <Card.Header className="flex flex-col items-center gap-2 pb-2 text-center">
              {chipLabel && (
                <Chip className="gap-1.5" color="accent" variant="soft">
                  {icon}
                  <Chip.Label>{chipLabel}</Chip.Label>
                </Chip>
              )}

              <Card.Title className="text-2xl">{title}</Card.Title>
              {description && (
                <Card.Description>{description}</Card.Description>
              )}
            </Card.Header>
          )}

          <Card.Content className="flex flex-col gap-4 pt-4">
            {children}
          </Card.Content>
        </Card>
      </main>
    </div>
  );
}
