import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useSiteStore } from "@/lib/siteStore";

interface PageMetaProps {
  title?: string;
  description?: string;
}

/** Sets the tab title and search description. The admin can override them per page from the design studio. */
export default function PageMeta({ title: defaultTitle, description: defaultDescription }: PageMetaProps) {
  const { pathname } = useLocation();
  const override = useSiteStore((s) => s.meta)?.[pathname];
  const title = override?.title?.trim() || defaultTitle;
  const description = override?.description?.trim() || defaultDescription;

  useEffect(() => {
    if (title) {
      document.title = title;
    }
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');

      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", description);
    }
  }, [title, description]);

  return null;
}
