export default function CertificadosPage() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Emisión de Certificados</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
            Automatiza la generación y el envío de certificados personalizados a las personas que asistieron a tus eventos.
          </p>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-[2rem] border-slate-300/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl min-h-[400px]">
        <div className="h-20 w-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center shadow-sm mb-6 border border-indigo-100 dark:border-indigo-500/20">
          <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
        </div>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Próximamente Disponible</p>
        <p className="text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto">El motor avanzado de generación masiva de PDFs y envíos por correo se incluirá en la próxima actualización de la plataforma.</p>
        
        <div className="mt-8 flex gap-4">
          <div className="flex flex-col items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 w-32">
            <span className="text-2xl mb-2">✨</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Diseño Visual</span>
          </div>
          <div className="flex flex-col items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 w-32">
            <span className="text-2xl mb-2">⚡️</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Automatización</span>
          </div>
          <div className="flex flex-col items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 w-32">
            <span className="text-2xl mb-2">📧</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Envío Masivo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
