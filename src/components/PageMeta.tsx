import { useEffect } from "react";

interface PageMetaProps {
  title?: string;
  description?: string;
}

export default function PageMeta({ title, description }: PageMetaProps) {
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
