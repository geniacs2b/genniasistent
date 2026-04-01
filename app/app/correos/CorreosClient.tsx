"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfigCorreoTab } from "./ConfigCorreoTab";
import { PlantillasCorreoTab } from "./PlantillasCorreoTab";
import { Settings, Mail } from "lucide-react";

interface CorreosClientProps {
  initialConfig: any;
  initialTemplates: any[];
  eventos: any[];
  oauthConfig: {
    id: string;
    provider: string;
    sender_email: string;
    is_active: boolean;
    token_expires_at: string | null;
  } | null;
}

export function CorreosClient({ initialConfig, initialTemplates, eventos, oauthConfig }: CorreosClientProps) {
  const [activeTab, setActiveTab] = useState("config");

  return (
    <div className="space-y-6">
      {/* Selector de Pestañas Premium */}
      <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl w-fit border border-slate-200/60 dark:border-slate-800 shadow-sm">
        <button
          onClick={() => setActiveTab("config")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "config"
              ? "bg-white dark:bg-slate-800 text-primary shadow-md border border-slate-200/50 dark:border-slate-700"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:dark:text-slate-200"
          }`}
        >
          <Settings className="w-4 h-4" />
          Configuración Institucional
        </button>
        <button
          onClick={() => setActiveTab("plantillas")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "plantillas"
              ? "bg-white dark:bg-slate-800 text-primary shadow-md border border-slate-200/50 dark:border-slate-700"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:dark:text-slate-200"
          }`}
        >
          <Mail className="w-4 h-4" />
          Plantillas de Correo
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-top-2 duration-500">
        {activeTab === "config" ? (
          <ConfigCorreoTab config={initialConfig} oauthConfig={oauthConfig} />
        ) : (
          <PlantillasCorreoTab 
            initialTemplates={initialTemplates} 
            eventos={eventos} 
            config={initialConfig}
          />
        )}
      </div>
    </div>
  );
}
