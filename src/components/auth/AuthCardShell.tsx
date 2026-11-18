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
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      <PageMeta description={metaDescription} title={metaTitle} />
      <BackgroundCanvas />

      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md items-center px-4 py-12">
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
      </div>
    </div>
  );
}
