"use client";

import { useEffect, useRef, useState } from "react";

/** Enables non-essential animation only while its region and tab are visible. */
export function useAnimationActivity<T extends Element>() {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let intersecting = false;

    const update = () => {
      setActive(
        intersecting &&
          document.visibilityState === "visible" &&
          !motionQuery.matches,
      );
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        update();
      },
      { threshold: 0.01 },
    );

    if (ref.current) observer.observe(ref.current);
    document.addEventListener("visibilitychange", update);
    motionQuery.addEventListener("change", update);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      motionQuery.removeEventListener("change", update);
    };
  }, []);

  return [ref, active] as const;
}
