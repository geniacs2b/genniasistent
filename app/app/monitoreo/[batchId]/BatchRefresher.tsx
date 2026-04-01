"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refresca la página del batch en intervalos mientras el status sea in_progress.
 * Se monta solo cuando el servidor detecta que el batch está activo.
 */
export function BatchRefresher({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
