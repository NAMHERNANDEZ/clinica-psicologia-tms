import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Mail, ArrowRight, Edit, Trash2 } from 'lucide-react';
import { patients, type Patient } from '../../lib/api';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/Misc';

export default function PatientsPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', birthdate: '', status: 'active' as 'active' | 'inactive' | 'discharged' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await patients.list();
      setList(res.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const filtered = list.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search) ||
    (p.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setForm({ name: '', phone: '', email: '', birthdate: '', status: 'active' }); setEditing(null); setShowForm(true); };
  const openEdit = (p: Patient) => { setForm({ name: p.name, phone: p.phone, email: p.email || '', birthdate: p.birthdate || '', status: p.status }); setEditing(p); setShowForm(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await patients.update(editing.id, form);
      } else {
        await patients.create(form);
      }
      setShowForm(false);
      load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!deleting) return;
    try { await patients.delete(deleting.id); load(); } catch { /* silent */ } finally { setDeleting(null); }
  };

  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'neutral' => {
    switch (s) { case 'active': return 'success'; case 'inactive': return 'warning'; case 'discharged': return 'danger'; default: return 'neutral'; }
  };

  const statusLabel = (s: string) => {
    const m: Record<string, string> = { active: 'Activo', inactive: 'Inactivo', discharged: 'Dado de alta' };
    return m[s] || s;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
          <p className="text-sm text-slate-500">{list.length} pacientes registrados</p>
        </div>
        <button onClick={openCreate} className="flex items-center space-x-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /><span>Nuevo Paciente</span>
        </button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, teléfono o email..." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center text-base font-bold text-slate-600">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.phone}</p>
                  </div>
                </div>
                <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>
              </div>

              {p.email && (
                <div className="flex items-center space-x-2 mt-3 text-xs text-slate-500">
                  <Mail className="w-3.5 h-3.5" /><span>{p.email}</span>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <button onClick={() => navigate(`/app/pacientes/${p.id}`)} className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center space-x-1">
                  <span>Ver detalle</span><ArrowRight className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center space-x-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setDeleting(p)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{search ? 'Sin resultados' : 'Sin pacientes registrados'}</p>
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Paciente' : 'Nuevo Paciente'} size="md"
        footer={
          <>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono *</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de nacimiento</label>
              <input type="date" value={form.birthdate} onChange={e => setForm({ ...form, birthdate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' | 'discharged' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500">
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="discharged">Dado de alta</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove}
        title="Eliminar Paciente" message={`¿Eliminar a ${deleting?.name}? Esta acción no se puede deshacer.`} confirmLabel="Eliminar" />
    </div>
  );
}

function Users(props: { className?: string }) {
  return <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}
