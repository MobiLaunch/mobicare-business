import type { MouseEvent, ReactNode } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { postDesignStudioMessage, useSiteStore } from "@/lib/siteStore";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const isPreview = useSiteStore((s) => s.isPreview);
  const previewMode = useSiteStore((s) => s.previewMode);

  const handleClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (!isPreview || previewMode !== "edit") return;
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const editable = target.closest("[data-edit]") as HTMLElement | null;
    if (editable) {
      const path = editable.getAttribute("data-edit");
      if (path) {
        e.preventDefault();
        e.stopPropagation();
        postDesignStudioMessage({ type: "edit", path });
        return;
      }
    }

    // Fallback text-map editing for plain headings/paragraphs/buttons in Design Studio
    const textEl = target.closest(
      "h1,h2,h3,h4,p,strong,span,button,a",
    ) as HTMLElement | null;
    if (textEl && textEl.children.length === 0) {
      const text = (textEl.textContent || "").trim();
      if (text.length >= 2 && text.length <= 240) {
        e.preventDefault();
        e.stopPropagation();
        postDesignStudioMessage({ type: "edit", path: `text:${text}` });
      }
    }
  };

  return (
    <div
      className="public-layout-wrapper flex min-h-screen flex-col"
      onClickCapture={handleClickCapture}
    >
      <Header />
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      <Footer />
      <BottomNav />
    </div>
  );
}
