"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

/**
 * Children sao SEMPRE montados (pra preservar dimensao do card e nao
 * causar layout shift), mas inicia invisivel e desliza pra cima quando
 * o card entra no viewport. Resultado: animacao "rise + fade" suave
 * conforme o usuario scrolla.
 */
export function ScrollReveal({
  children,
  threshold = 0.15,
  className = ""
}: {
  children: ReactNode;
  threshold?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
