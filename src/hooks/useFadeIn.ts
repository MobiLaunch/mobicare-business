import { useEffect, useRef, useState } from "react";

// IntersectionObserver-based scroll-reveal: returns a ref to attach to the
// section and a boolean that flips true (and stays true) once the section
// scrolls into view. Pair with the fade-in Tailwind classes, e.g.:
//   className={`transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
export function useFadeIn<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return [ref, visible] as const;
}
