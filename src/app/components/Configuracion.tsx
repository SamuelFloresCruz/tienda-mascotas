import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';

type Especie = {
  id: number;
  nombre: string;
  descripcion: string;
  activa: boolean;
};

type Raza = {
  id: number;
  nombre: string;
  precio_base: number;
  cuidados: string;
  especie: {
    id: number;
    nombre: string;
  } | null;
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

export function Configuracion() {
  const [especies, setEspecies] = useState<Especie[]>([]);
  const [razas, setRazas] = useState<Raza[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEspecieDialog, setShowEspecieDialog] = useState(false);
  const [showRazaDialog, setShowRazaDialog] = useState(false);

  const [nuevaEspecie, setNuevaEspecie] = useState({ nombre: '', descripcion: '' });
  const [nuevaRaza, setNuevaRaza] = useState({ nombre: '', especieId: '', precioBase: '', cuidados: 'Medio' });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const [especiesRes, razasRes] = await Promise.all([
        supabase
          .from('especies')
          .select('id, nombre, descripcion, activa')
          .order('nombre'),
        supabase
          .from('razas')
          .select('id, nombre, precio_base, cuidados, especie:especies(id, nombre)')
          .order('nombre'),
      ]);

      if (especiesRes.error || razasRes.error) {
        setError('No se pudo cargar la configuracion.');
        toast.error('No se pudo cargar la configuracion.');
        setLoading(false);
        return;
      }

      setEspecies(especiesRes.data ?? []);
      setRazas(razasRes.data ?? []);
      setLoading(false);
    };

    loadData();
  }, []);

  const handleAgregarEspecie = async () => {
    if (!nuevaEspecie.nombre || !nuevaEspecie.descripcion) {
      toast.error('Completa el nombre y la descripcion.');
      return;
    }

    const { data, error: insertError } = await supabase
      .from('especies')
      .insert({
        nombre: nuevaEspecie.nombre,
        descripcion: nuevaEspecie.descripcion,
        activa: true,
      })
      .select('id, nombre, descripcion, activa')
      .single();

    if (insertError) {
      toast.error('No se pudo registrar la especie.');
      return;
    }

    setEspecies((prev) => [...prev, data]);
    setNuevaEspecie({ nombre: '', descripcion: '' });
    setShowEspecieDialog(false);
    toast.success('Especie registrada con exito.');
  };

  const handleAgregarRaza = async () => {
    const precioBaseValue = Number(nuevaRaza.precioBase);

    if (!nuevaRaza.nombre || !nuevaRaza.especieId || !nuevaRaza.precioBase) {
      toast.error('Completa todos los campos de la raza.');
      return;
    }

    if (Number.isNaN(precioBaseValue)) {
      toast.error('El precio base debe ser un numero.');
      return;
    }

    const { data, error: insertError } = await supabase
      .from('razas')
      .insert({
        nombre: nuevaRaza.nombre,
        especie_id: Number(nuevaRaza.especieId),
        precio_base: precioBaseValue,
        cuidados: nuevaRaza.cuidados,
      })
      .select('id, nombre, precio_base, cuidados, especie:especies(id, nombre)')
      .single();

    if (insertError) {
      toast.error('No se pudo registrar la raza.');
      return;
    }

    setRazas((prev) => [...prev, data]);
    setNuevaRaza({ nombre: '', especieId: '', precioBase: '', cuidados: 'Medio' });
    setShowRazaDialog(false);
    toast.success('Raza registrada con exito.');
  };

  const eliminarEspecie = async (id: number) => {
    const { error: deleteError } = await supabase
      .from('especies')
      .delete()
      .eq('id', id);

    if (deleteError) {
      toast.error('No se pudo eliminar la especie.');
      return;
    }

    setEspecies((prev) => prev.filter((especie) => especie.id !== id));
    toast.success('Especie eliminada con exito.');
  };

  const eliminarRaza = async (id: number) => {
    const { error: deleteError } = await supabase
      .from('razas')
      .delete()
      .eq('id', id);

    if (deleteError) {
      toast.error('No se pudo eliminar la raza.');
      return;
    }

    setRazas((prev) => prev.filter((raza) => raza.id !== id));
    toast.success('Raza eliminada con exito.');
  };

  return (
    <div className="space-y-6">
      <h1>Configuracion de Tienda</h1>

      {loading && <p className="text-muted-foreground">Cargando configuracion...</p>}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3">
          {error}
        </div>
      )}

      <Tabs.Root defaultValue="especies" className="bg-card border border-border rounded-lg">
        <Tabs.List className="flex border-b border-border">
          <Tabs.Trigger
            value="especies"
            className="flex-1 px-6 py-4 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors"
          >
            Maestro de Especies
          </Tabs.Trigger>
          <Tabs.Trigger
            value="razas"
            className="flex-1 px-6 py-4 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors"
          >
            Diccionario de Razas
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="especies" className="p-6">
          <div className="flex justify-between items-center mb-6">
            <p className="text-muted-foreground">Gestiona las categorias principales de animales</p>
            <button
              onClick={() => setShowEspecieDialog(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Especie
            </button>
          </div>

          {especies.length === 0 ? (
            <p className="text-muted-foreground">No hay especies registradas.</p>
          ) : (
            <div className="space-y-3">
              {especies.map((especie) => (
                <div
                  key={especie.id}
                  className="bg-muted/30 border border-border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <h4>{especie.nombre}</h4>
                    <p className="text-sm text-muted-foreground">{especie.descripcion}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded text-sm ${
                      especie.activa ? 'bg-black text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {especie.activa ? 'Activa' : 'Inactiva'}
                    </span>
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Editar especie">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => eliminarEspecie(especie.id)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                      aria-label="Eliminar especie"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="razas" className="p-6">
          <div className="flex justify-between items-center mb-6">
            <p className="text-muted-foreground">Define las razas disponibles para cada especie</p>
            <button
              onClick={() => setShowRazaDialog(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Raza
            </button>
          </div>

          {razas.length === 0 ? (
            <p className="text-muted-foreground">No hay razas registradas.</p>
          ) : (
            <div className="space-y-3">
              {razas.map((raza) => (
                <div
                  key={raza.id}
                  className="bg-muted/30 border border-border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Raza</p>
                      <p>{raza.nombre}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Especie</p>
                      <p>{raza.especie?.nombre ?? 'Sin especie'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Precio Base</p>
                      <p className="text-primary">{formatCurrency(raza.precio_base)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Nivel de Cuidados</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs ${
                        raza.cuidados === 'Alto' ? 'bg-black text-white' :
                        raza.cuidados === 'Medio' ? 'bg-secondary text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {raza.cuidados}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Editar raza">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => eliminarRaza(raza.id)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                      aria-label="Eliminar raza"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {/* Dialog Nueva Especie */}
      <Dialog.Root open={showEspecieDialog} onOpenChange={setShowEspecieDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-2xl w-[500px] p-6">
            <h3 className="mb-4">Nueva Especie</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2">Nombre de la Especie</label>
                <input
                  type="text"
                  value={nuevaEspecie.nombre}
                  onChange={(e) => setNuevaEspecie({ ...nuevaEspecie, nombre: e.target.value })}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ej: Reptiles"
                />
              </div>
              <div>
                <label className="block mb-2">Descripcion</label>
                <input
                  type="text"
                  value={nuevaEspecie.descripcion}
                  onChange={(e) => setNuevaEspecie({ ...nuevaEspecie, descripcion: e.target.value })}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ej: Animales de sangre fria"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEspecieDialog(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAgregarEspecie}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Agregar
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Dialog Nueva Raza */}
      <Dialog.Root open={showRazaDialog} onOpenChange={setShowRazaDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-2xl w-[500px] p-6">
            <h3 className="mb-4">Nueva Raza</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2">Nombre de la Raza</label>
                <input
                  type="text"
                  value={nuevaRaza.nombre}
                  onChange={(e) => setNuevaRaza({ ...nuevaRaza, nombre: e.target.value })}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ej: Labrador"
                />
              </div>
              <div>
                <label className="block mb-2">Especie</label>
                <select
                  value={nuevaRaza.especieId}
                  onChange={(e) => setNuevaRaza({ ...nuevaRaza, especieId: e.target.value })}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seleccionar especie</option>
                  {especies.map((especie) => (
                    <option key={especie.id} value={especie.id}>{especie.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2">Precio Base</label>
                <input
                  type="number"
                  value={nuevaRaza.precioBase}
                  onChange={(e) => setNuevaRaza({ ...nuevaRaza, precioBase: e.target.value })}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ej: 450"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block mb-2">Nivel de Cuidados</label>
                <select
                  value={nuevaRaza.cuidados}
                  onChange={(e) => setNuevaRaza({ ...nuevaRaza, cuidados: e.target.value })}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Bajo">Bajo</option>
                  <option value="Medio">Medio</option>
                  <option value="Alto">Alto</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowRazaDialog(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAgregarRaza}
                  className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Agregar
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
