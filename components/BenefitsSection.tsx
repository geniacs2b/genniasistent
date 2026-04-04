"use client";

import { useEffect, useRef } from "react";
import { Zap, LayoutGrid, Mail } from "lucide-react";

// ─── Beneficios Data ──────────────────────────────────────────────────────────
const BENEFITS = [
  {
    icon: Zap,
    iconBg: "from-emerald-50 to-emerald-100/60",
    iconColor: "text-emerald-600",
    accentShadow: "group-hover:shadow-emerald-100",
    title: "Motor de emisión en paralelo",
    description:
      "Procesa miles de certificados simultáneamente sin bloquear tu sistema. Arquitectura basada en colas y ejecución distribuida para máxima estabilidad.",
  },
  {
    icon: LayoutGrid,
    iconBg: "from-violet-50 to-violet-100/60",
    iconColor: "text-violet-600",
    accentShadow: "group-hover:shadow-violet-100",
    title: "Arquitectura multi-tenant real",
    description:
      "Cada organización opera en su propio entorno aislado, con sus configuraciones, plantillas y control total de sus datos.",
  },
  {
    icon: Mail,
    iconBg: "from-sky-50 to-sky-100/60",
    iconColor: "text-sky-600",
    accentShadow: "group-hover:shadow-sky-100",
    title: "Envío automatizado con tu dominio",
    description:
      "Envía certificados desde tu propio correo corporativo de forma automática, manteniendo tu identidad y credibilidad.",
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BenefitsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Always mark visible if reduced motion is preferred
    if (prefersReduced) {
      sectionRef.current
        ?.querySelectorAll<HTMLElement>("[data-anim]")
        .forEach((el) => {
          el.style.opacity = "1";
          el.style.transform = "none";
        });
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = parseInt(el.dataset.delay ?? "0", 10);
            setTimeout(() => {
              el.style.opacity = "1";
              el.style.transform = "translateY(0)";
            }, delay);
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    sectionRef.current
      ?.querySelectorAll<HTMLElement>("[data-anim]")
      .forEach((el) => {
        el.style.opacity = "0";
        el.style.transform = "translateY(22px)";
        observer.observe(el);
      });

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="beneficios"
      ref={sectionRef}
      className="relative py-24 overflow-hidden"
    >
      {/* Background wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/60 to-white pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, hsl(74 55% 51% / 0.06), transparent)",
        }}
      />

      <div className="relative container max-w-6xl mx-auto px-4 sm:px-6">

        {/* ── Editorial Header ──────────────────────────────── */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-5">

          {/* Eyebrow */}
          <p
            data-anim
            data-delay="0"
            className="text-[10.5px] font-black uppercase tracking-[0.28em] text-primary/60 transition-all duration-700 ease-out"
          >
            Infraestructura diseñada para operación real
          </p>

          {/* Title */}
          <h2
            data-anim
            data-delay="100"
            className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1] transition-all duration-700 ease-out"
          >
            Todo lo que necesitas,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500 italic">
              integrado.
            </span>
          </h2>

          {/* Subtitle */}
          <p
            data-anim
            data-delay="200"
            className="text-[17px] text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto transition-all duration-700 ease-out"
          >
            Reemplaza múltiples herramientas por una sola plataforma diseñada para
            escalar, automatizar y operar sin fricción.
          </p>
        </div>

        {/* ── Cards ───────────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {BENEFITS.map(({ icon: Icon, iconBg, iconColor, accentShadow, title, description }, i) => (
            <div
              key={title}
              data-anim
              data-delay={String(300 + i * 120)}
              className="
                group relative bg-white rounded-[1.75rem]
                border border-slate-100
                p-8 flex flex-col gap-6
                shadow-[0_2px_20px_-6px_rgba(15,23,42,0.06)]
                hover:shadow-[0_20px_56px_-12px_rgba(15,23,42,0.13)]
                hover:-translate-y-[6px]
                transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                overflow-hidden cursor-default
                transition-[transform,box-shadow] will-change-transform
              "
              style={{
                transition:
                  "opacity 0.7s cubic-bezier(0.25,0.46,0.45,0.94), transform 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.5s ease",
              }}
            >
              {/* Corner glow */}
              <div className="absolute inset-0 rounded-[1.75rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-white via-transparent to-slate-50/80" />

              {/* Icon */}
              <div
                className={`
                  w-14 h-14 rounded-2xl flex items-center justify-center shrink-0
                  bg-gradient-to-br ${iconBg}
                  shadow-sm ${accentShadow}
                  group-hover:shadow-md group-hover:-translate-y-0.5
                  transition-all duration-400 ease-out
                `}
              >
                <Icon
                  className={`w-6 h-6 ${iconColor} transition-transform duration-300 group-hover:scale-110`}
                />
              </div>

              {/* Text */}
              <div className="space-y-2.5">
                <h3 className="text-[18px] font-bold text-slate-900 leading-snug tracking-tight">
                  {title}
                </h3>
                <p className="text-[15px] text-slate-500 leading-[1.68] font-medium">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer tagline ────────────────────────────────── */}
        <p
          data-anim
          data-delay="640"
          className="text-center mt-14 text-[11.5px] text-slate-400 font-bold tracking-[0.18em] uppercase transition-all duration-700 ease-out"
        >
          Diseñado para equipos que necesitan velocidad, control y confiabilidad en cada emisión.
        </p>
      </div>
    </section>
  );
}
