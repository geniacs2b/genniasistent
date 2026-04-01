"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
const CHECK_INTERVAL = 60 * 1000; // 1 minute

export function SessionMonitor() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(async (reason: string) => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("session_start_time");
      localStorage.removeItem("last_activity_time");
      
      toast({
        title: "Sesión cerrada por seguridad",
        description: reason,
        variant: "destructive",
      });
      
      router.push("/admin/login?expired=true");
      router.refresh();
    } catch (error) {
      console.error("Error during session logout:", error);
    }
  }, [supabase.auth, router, toast]);

  const checkSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // If no session, clean up but don't redirect (middleware handles protection)
    if (!session) {
      localStorage.removeItem("session_start_time");
      localStorage.removeItem("last_activity_time");
      return;
    }

    const now = Date.now();
    const startTimeStr = localStorage.getItem("session_start_time");
    let startTime = startTimeStr ? parseInt(startTimeStr) : 0;

    // Initialize session start time if not present
    if (startTime === 0) {
      startTime = now;
      localStorage.setItem("session_start_time", now.toString());
    }

    // 1. Check Max Duration (8 hours)
    if (now - startTime > MAX_SESSION_DURATION) {
      handleLogout("Tu sesión ha expirado por tiempo máximo (8 horas).");
      return;
    }

    // 2. Check Inactivity (30 minutes)
    const lastActivity = lastActivityRef.current;
    if (now - lastActivity > INACTIVITY_TIMEOUT) {
      handleLogout("Tu sesión ha expirado por inactividad (30 minutos).");
      return;
    }
  }, [supabase.auth, handleLogout]);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    localStorage.setItem("last_activity_time", lastActivityRef.current.toString());
  }, []);

  useEffect(() => {
    // Check session every minute
    const interval = setInterval(checkSession, CHECK_INTERVAL);
    
    // Activity listeners
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove", "click"];
    const handleActivity = () => updateActivity();
    
    events.forEach((event) => window.addEventListener(event, handleActivity));

    // Initial check
    checkSession();

    return () => {
      clearInterval(interval);
      events.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [checkSession, updateActivity]);

  return null;
}
