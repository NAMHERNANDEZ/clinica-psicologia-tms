

export function Progress({ value, max = 100, color = 'bg-teal-500' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, color = 'bg-teal-500', sublabel }: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  sublabel?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
          {sublabel && <p className="text-xs text-slate-400">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

export function Timeline({ events }: { events: Array<{ id: number; type: string; title: string; description?: string; created_at: string }> }) {
  if (events.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-4">Sin eventos</p>;
  }
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="relative pl-10">
            <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-teal-500 border-2 border-white" />
            <div>
              <p className="text-sm font-medium text-slate-900">{event.title}</p>
              {event.description && <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>}
              <p className="text-xs text-slate-400 mt-1">{new Date(event.created_at).toLocaleDateString('es-MX')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all"
      />
    </div>
  );
}
