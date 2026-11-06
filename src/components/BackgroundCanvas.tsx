import { useEffect, useRef } from "react";

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadiusX: number;
  baseRadiusY: number;
  rotation: number;
  vRot: number;
  colorIndex: number;
  morphSpeed: number;
  phase: number;
  wobble: number;
  opacityBoost: number;
}

/**
 * BackgroundCanvas – Apple Wallpaper-inspired Organic Blob Animation
 * Styled directly after the Apple organic green wallpaper reference (Wallfever).
 * Features layered organic shapes (pine green, emerald, sage, mint) floating
 * and morphing smoothly over a soft ambient backdrop with subtle cursor parallax.
 */
export default function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Mouse tracking for subtle interactive float effect
    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
    };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Organic blob definitions matching the reference image's color layers
    const blobs: Blob[] = Array.from({ length: 15 }, (_, i) => {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        baseRadiusX: Math.random() * 140 + 120,
        baseRadiusY: Math.random() * 200 + 160,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.003,
        colorIndex: i % 5,
        morphSpeed: Math.random() * 0.0012 + 0.00045,
        phase: Math.random() * Math.PI * 2,
        wobble: Math.random() * Math.PI * 2,
        opacityBoost: Math.random() * 0.08,
      };
    });

    const render = (time: number) => {
      // Smooth mouse easing
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      // NOTE (HeroUI v3 rebuild): the original check here was
      // `document.body.classList.contains('dark')`, but this app's theme
      // toggle (applyAppearance() in siteStore.ts) sets a `data-theme`
      // attribute on <html>, not a `.dark` class on <body> — so this check
      // never actually matched the real theme in the original app. Fixed to
      // read the real theme source.
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Base background gradient matching Apple wallpaper background
      if (isDark) {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);

        bgGrad.addColorStop(0, "#09150E");
        bgGrad.addColorStop(0.5, "#0E1F16");
        bgGrad.addColorStop(1, "#08130C");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);

        bgGrad.addColorStop(0, "#EAF4EC");
        bgGrad.addColorStop(0.5, "#E2EFE6");
        bgGrad.addColorStop(1, "#D9E9DE");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Palette: deep greens with a warm coral/peach accent for contrast.
      // The accent stays subtle so the wallpaper still feels cohesive.
      const blobColors = isDark
        ? [
            "rgba(19, 56, 39, 0.40)", // Deep Pine Green
            "rgba(30, 85, 59, 0.35)", // Rich Emerald Green
            "rgba(45, 106, 79, 0.30)", // Sage Green
            "rgba(82, 183, 136, 0.22)", // Vibrant Mint
            "rgba(235, 120, 91, 0.16)", // Warm Coral
          ]
        : [
            "rgba(19, 56, 39, 0.22)", // Deep Pine Green
            "rgba(30, 85, 59, 0.20)", // Rich Emerald Green
            "rgba(45, 106, 79, 0.18)", // Sage Green
            "rgba(116, 198, 157, 0.35)", // Vibrant Soft Mint
            "rgba(235, 120, 91, 0.13)", // Warm Coral
          ];

      // Render overlapping organic shapes with smooth bezier curves
      blobs.forEach((b, idx) => {
        b.x += b.vx;
        b.y += b.vy;
        b.rotation += b.vRot;

        // Soft bounce / wrap around screen bounds
        if (b.x < -200) b.x = width + 200;
        if (b.x > width + 200) b.x = -200;
        if (b.y < -200) b.y = height + 200;
        if (b.y > height + 200) b.y = -200;

        // Parallax offset based on cursor
        const parallaxX = (mouse.x - width / 2) * (0.01 + (idx % 3) * 0.008);
        const parallaxY = (mouse.y - height / 2) * (0.01 + (idx % 3) * 0.008);

        // Morphing animation factors
        const morphTime = time * b.morphSpeed + b.phase;
        const rx =
          b.baseRadiusX *
          (1 +
            Math.sin(morphTime) * 0.15 +
            Math.sin(morphTime * 0.47 + b.wobble) * 0.045);
        const ry =
          b.baseRadiusY *
          (1 +
            Math.cos(morphTime * 0.8) * 0.15 +
            Math.sin(morphTime * 0.61 + b.wobble) * 0.05);

        ctx.save();
        ctx.translate(b.x + parallaxX, b.y + parallaxY);
        ctx.rotate(b.rotation);

        // A soft glow behind each blob adds depth without needing CSS filters.
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));

        glow.addColorStop(0, blobColors[b.colorIndex]);
        glow.addColorStop(0.55, blobColors[b.colorIndex]);
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.globalAlpha = 0.28 + b.opacityBoost;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * 1.12, ry * 1.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Draw organic 4-point bezier blob shape (Apple WWDC wallpaper style)
        ctx.beginPath();
        const p1 = { x: 0, y: -ry };
        const p2 = { x: rx, y: 0 };
        const p3 = { x: 0, y: ry };
        const p4 = { x: -rx, y: 0 };

        const cpFactor = 0.55 + Math.sin(morphTime * 1.2) * 0.08;

        ctx.moveTo(p1.x, p1.y);
        ctx.bezierCurveTo(rx * cpFactor, -ry, rx, -ry * cpFactor, p2.x, p2.y);
        ctx.bezierCurveTo(rx, ry * cpFactor, rx * cpFactor, ry, p3.x, p3.y);
        ctx.bezierCurveTo(-rx * cpFactor, ry, -rx, ry * cpFactor, p4.x, p4.y);
        ctx.bezierCurveTo(-rx, -ry * cpFactor, -rx * cpFactor, -ry, p1.x, p1.y);
        ctx.closePath();

        ctx.fillStyle = blobColors[b.colorIndex];
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 h-screen w-screen overflow-hidden"
      id="homepage-background-canvas-wrapper"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block h-full w-full"
        id="homepage-background-canvas"
      />
      {/* Frosted-glass blur overlay — softens blobs so page content stays legible */}
      <div
        aria-hidden="true"
        className="absolute inset-0 backdrop-blur-[18px]"
        id="homepage-background-blur-overlay"
      />
    </div>
  );
}
