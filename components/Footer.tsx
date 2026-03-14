export function Footer() {
  return (
    <footer className="w-full py-8 border-t border-slate-200/60 bg-slate-50/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">Desarrollado por</span>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <img src="/assets/logo-gennia.png" className="h-6 w-auto object-contain" />
            <span className="text-sm font-black tracking-tight text-slate-800 uppercase ml-1">GENNIA S.A.S</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          &copy; {new Date().getFullYear()} GenniAsistent. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
