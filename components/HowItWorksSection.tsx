"use client";

import { useState } from "react";
import {
  Building2,
  Calendar,
  FileImage,
  Users,
  QrCode,
  ClipboardList,
  Award,
  Mail,
  CheckCircle,
  Zap,
  ArrowRight,
} from "lucide-react";

// ─── Step Data ────────────────────────────────────────────────────────────────
const STEPS = [
  {
    number: 1,
    label: "Configura",
    title: "Configura tu organización y tu evento",
    description:
      "Crea tu espacio de trabajo, define el evento y deja lista la base visual de tus certificados.",
    accentColor: "from-primary to-emerald-500",
    panel: "setup",
  },
  {
    number: 2,
    label: "Registra",
    title: "Registra participantes y valida asistencia",
    description:
      "Importa bases, comparte formularios y acredita asistentes en sitio usando códigos QR.",
    accentColor: "from-violet-500 to-blue-500",
    panel: "attendance",
  },
  {
    number: 3,
    label: "Emite",
    title: "Emite y envía certificados en automático",
    description:
      "Genera certificados masivos y distribúyelos por correo sin procesos manuales.",
    accentColor: "from-amber-500 to-orange-500",
    panel: "certificates",
  },
];

// ─── Visual Panel: Setup ──────────────────────────────────────────────────────
function PanelSetup() {
  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-slate-800/70 rounded-xl px-4 py-3 border border-white/5">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="text-[12px] font-bold text-white">Mi Organización</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/70 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
          Activa
        </span>
      </div>
      {/* Event card */}
      <div className="flex-1 bg-slate-800/50 rounded-xl border border-white/5 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Nuevo Evento</span>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-700 rounded-full w-3/4" />
          <div className="h-2.5 bg-slate-700/70 rounded-full w-full" />
          <div className="h-2.5 bg-slate-700/70 rounded-full w-2/3" />
        </div>
        <div className="mt-auto pt-3 border-t border-white/5 flex items-center gap-3">
          <FileImage className="w-4 h-4 text-primary/60" />
          <div className="flex-1">
            <div className="h-2 bg-primary/20 rounded-full w-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full w-4/5" />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-bold">Plantilla OK</span>
        </div>
      </div>
      {/* Three stat pills */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Org.", value: "Lista" },
          { label: "Evento", value: "Creado" },
          { label: "Diseño", value: "Cargado" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-slate-800/60 border border-white/5 rounded-xl px-2 py-2.5 text-center"
          >
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{s.label}</p>
            <p className="text-[12px] font-black text-emerald-400 mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Visual Panel: Attendance / QR ───────────────────────────────────────────
function PanelAttendance() {
  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-800/70 rounded-xl px-4 py-3 border border-white/5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" />
          <span className="text-[12px] font-bold text-white">Participantes</span>
        </div>
        <span className="text-[11px] font-black text-white bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 rounded-full">
          148 inscritos
        </span>
      </div>
      {/* Participant rows */}
      <div className="flex-1 bg-slate-800/50 rounded-xl border border-white/5 p-3 space-y-2 overflow-hidden">
        {[
          { name: "Ana Martínez", status: "Asistió", color: "text-emerald-400" },
          { name: "Carlos Ruiz", status: "Asistió", color: "text-emerald-400" },
          { name: "Laura Gómez", status: "Asistió", color: "text-emerald-400" },
          { name: "Diego López", status: "Pendiente", color: "text-slate-500" },
        ].map((p) => (
          <div
            key={p.name}
            className="flex items-center justify-between bg-slate-700/40 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center">
                <span className="text-[9px] font-black text-slate-300">
                  {p.name.charAt(0)}
                </span>
              </div>
              <span className="text-[12px] font-semibold text-slate-300">{p.name}</span>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wide ${p.color}`}>
              {p.status}
            </span>
          </div>
        ))}
      </div>
      {/* QR Indicator */}
      <div className="flex items-center gap-3 bg-slate-800/60 border border-white/5 rounded-xl px-4 py-3">
        <QrCode className="w-5 h-5 text-violet-400 shrink-0" />
        <div className="flex-1">
          <p className="text-[11px] font-bold text-white">Validación QR activa</p>
          <p className="text-[10px] text-slate-500 font-medium">Acreditación en tiempo real</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400">En vivo</span>
        </div>
      </div>
    </div>
  );
}

// ─── Visual Panel: Certificates ──────────────────────────────────────────────
function PanelCertificates() {
  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-800/70 rounded-xl px-4 py-3 border border-white/5">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="text-[12px] font-bold text-white">Motor de Emisión</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-black text-amber-400">Procesando</span>
        </div>
      </div>

      {/* Progress block */}
      <div className="bg-slate-800/50 rounded-xl border border-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300">Certificados generados</span>
          <span className="text-[12px] font-black text-white">
            143 <span className="text-slate-500 font-medium">/ 148</span>
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full w-[97%] transition-all duration-1000" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold text-emerald-400">143 enviados por correo</span>
        </div>
      </div>

      {/* Email queue rows */}
      <div className="flex-1 bg-slate-800/50 rounded-xl border border-white/5 p-3 space-y-2 overflow-hidden">
        {[
          { name: "ana.martinez@empresa.com", done: true },
          { name: "carlos.ruiz@empresa.com", done: true },
          { name: "laura.gomez@empresa.com", done: true },
          { name: "diego.lopez@empresa.com", done: false },
        ].map((e) => (
          <div
            key={e.name}
            className="flex items-center gap-2.5 bg-slate-700/30 rounded-lg px-3 py-2"
          >
            <Mail className={`w-3.5 h-3.5 shrink-0 ${e.done ? "text-emerald-400" : "text-slate-600"}`} />
            <span className={`text-[11px] font-medium truncate ${e.done ? "text-slate-300" : "text-slate-600"}`}>
              {e.name}
            </span>
            {e.done && <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 ml-auto" />}
          </div>
        ))}
      </div>
    </div>
  );
}

const PANELS: Record<string, React.ReactNode> = {
  setup: <PanelSetup />,
  attendance: <PanelAttendance />,
  certificates: <PanelCertificates />,
};

// ─── Main Section ─────────────────────────────────────────────────────────────
export default function HowItWorksSection() {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const [panelKey, setPanelKey] = useState(0);

  const handleStep = (index: number) => {
    if (index === active) return;
    setFading(true);
    setTimeout(() => {
      setActive(index);
      setPanelKey((k) => k + 1);
      setFading(false);
    }, 220);
  };

  const step = STEPS[active];

  return (
    <section
      id="como-funciona"
      className="py-24 bg-[#111827] text-white relative overflow-hidden"
    >
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 relative z-10">

        {/* Section header */}
        <div className="mb-14">
          <p className="text-[10.5px] font-black uppercase tracking-[0.25em] text-primary/60 mb-3">
            El flujo operativo
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] max-w-2xl">
            Tres pasos.{" "}
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${step.accentColor} transition-all duration-500`}>
              Un solo sistema.
            </span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-start">

          {/* ── Left: Stepper ──────────────────────────────────── */}
          <div className="space-y-3">
            {STEPS.map((s, i) => {
              const isActive = i === active;
              return (
                <button
                  key={s.number}
                  onClick={() => handleStep(i)}
                  className={`
                    w-full text-left rounded-2xl px-6 py-5 border transition-all duration-300
                    ${isActive
                      ? "bg-white/8 border-white/12 shadow-lg shadow-black/20"
                      : "bg-transparent border-transparent hover:bg-white/4 hover:border-white/6"
                    }
                    group cursor-pointer
                  `}
                >
                  <div className="flex gap-4 items-start">
                    {/* Number badge */}
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 mt-0.5
                        transition-all duration-300
                        ${isActive
                          ? `bg-gradient-to-br ${s.accentColor} text-white shadow-lg`
                          : "bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300"
                        }
                      `}
                    >
                      {s.number}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300 ${
                            isActive ? "text-primary/70" : "text-slate-600"
                          }`}
                        >
                          Paso {s.number}
                        </span>
                        {isActive && (
                          <ArrowRight className="w-3 h-3 text-primary/50" />
                        )}
                      </div>
                      <h4
                        className={`text-[16px] font-bold leading-snug transition-colors duration-300 ${
                          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                        }`}
                      >
                        {s.title}
                      </h4>
                      {/* Description — only visible when active */}
                      <div
                        className={`overflow-hidden transition-all duration-400 ${
                          isActive ? "max-h-24 opacity-100 mt-2" : "max-h-0 opacity-0"
                        }`}
                        style={{ transitionTimingFunction: "cubic-bezier(0.25,0.46,0.45,0.94)" }}
                      >
                        <p className="text-[14px] text-slate-400 leading-relaxed font-medium">
                          {s.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar under active step */}
                  {isActive && (
                    <div className={`mt-4 h-[2px] rounded-full bg-gradient-to-r ${s.accentColor} opacity-40 ml-14`} />
                  )}
                </button>
              );
            })}

            {/* Navigation pills */}
            <div className="flex gap-2 ml-14 pt-2">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleStep(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === active ? "w-8 bg-primary" : "w-3 bg-slate-700 hover:bg-slate-600"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ── Right: Dynamic visual panel ─────────────────────── */}
          <div className="relative lg:sticky lg:top-24">
            {/* Glow behind panel */}
            <div
              className={`
                absolute inset-0 rounded-[2rem] blur-2xl opacity-25 transition-all duration-500
                bg-gradient-to-br ${step.accentColor}
                translate-y-4 translate-x-4 -z-10
              `}
            />

            {/* Panel shell */}
            <div className="bg-[#0d1117] border border-white/8 rounded-[2rem] p-3 shadow-2xl">
              {/* Window chrome */}
              <div className="h-10 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center px-4 gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                <div className="flex-1" />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  {step.label}
                </span>
              </div>

              {/* Content area with crossfade */}
              <div
                key={panelKey}
                className="px-4 pb-4"
                style={{
                  minHeight: "280px",
                  opacity: fading ? 0 : 1,
                  transform: fading ? "translateY(6px)" : "translateY(0)",
                  transition: "opacity 220ms ease, transform 220ms ease",
                }}
              >
                {PANELS[step.panel]}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
