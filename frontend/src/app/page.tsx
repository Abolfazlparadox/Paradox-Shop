export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
      <div className="max-w-2xl text-center bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200 mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Phase 1 Foundation Active
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">
          Shop Project Platform
        </h1>
        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
          Production-grade Modular Monolith E-Commerce Platform Architecture built with Next.js, Django REST Framework, PostgreSQL, Redis, and Celery.
        </p>
        <div className="grid grid-cols-2 gap-4 text-left border-t border-slate-100 pt-6">
          <div className="p-4 bg-slate-50 rounded-lg">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Backend Engine</span>
            <span className="block font-medium text-slate-800 mt-1">Django 5.x REST API</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Frontend App</span>
            <span className="block font-medium text-slate-800 mt-1">Next.js 14 App Router</span>
          </div>
        </div>
      </div>
    </main>
  );
}
