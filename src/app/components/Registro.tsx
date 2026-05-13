import { useEffect, useState } from 'react';
import { Upload, Plus, Pencil, Trash2 } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';

type Especie = {
  id: number;
  nombre: string;
};

type Raza = {
  id: number;
  nombre: string;
  especie: {
    id: number;
    nombre: string;
  } | null;
};

type Animal = {
  id: number;
  nombre: string;
  edad: string;
  precio: number;
  estado: string;
  imagen: string | null;
  galeria: string[] | null;
  especie: {
    id: number;
    nombre: string;
  } | null;
  raza: {
    id: number;
    nombre: string;
  } | null;
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

export function Registro() {
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [especies, setEspecies] = useState<Especie[]>([]);
  const [razas, setRazas] = useState<Raza[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    especieId: '',
    razaId: '',
    edad: '',
    precio: '',
    estado: 'Disponible',
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const [animalesRes, especiesRes, razasRes] = await Promise.all([
        supabase
          .from('animales')
          .select('id, nombre, edad, precio, estado, imagen, galeria, especie:especies(id, nombre), raza:razas(id, nombre)')
          .order('created_at', { ascending: false }),
        supabase
          .from('especies')
          .select('id, nombre')
          .order('nombre'),
        supabase
          .from('razas')
          .select('id, nombre, especie:especies(id, nombre)')
          .order('nombre'),
      ]);

      if (animalesRes.error || especiesRes.error || razasRes.error) {
        setError('No se pudo cargar el registro.');
        toast.error('No se pudo cargar el registro.');
        setLoading(false);
        return;
      }

      setAnimales(animalesRes.data ?? []);
      setEspecies(especiesRes.data ?? []);
      setRazas(razasRes.data ?? []);
      setLoading(false);
    };

    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const precioValue = Number(formData.precio);

    if (!formData.nombre || !formData.especieId || !formData.razaId || !formData.edad || !formData.precio) {
      toast.error('Completa todos los campos obligatorios.');
      return;
    }

    if (Number.isNaN(precioValue)) {
      toast.error('El precio debe ser un numero.');
      return;
    }

    const { data, error: insertError } = await supabase
      .from('animales')
      .insert({
        nombre: formData.nombre,
        especie_id: Number(formData.especieId),
        raza_id: Number(formData.razaId),
        edad: formData.edad,
        precio: precioValue,
        estado: formData.estado,
        imagen: null,
        galeria: [],
      })
      .select('id, nombre, edad, precio, estado, imagen, galeria, especie:especies(id, nombre), raza:razas(id, nombre)')
      .single();

    if (insertError) {
      toast.error('No se pudo registrar el animal.');
      return;
    }

    setAnimales((prev) => [data, ...prev]);
    setFormData({
      nombre: '',
      especieId: '',
      razaId: '',
      edad: '',
      precio: '',
      estado: 'Disponible',
    });
    toast.success('Animal registrado con exito.');
  };

  const handleEliminarAnimal = async (id: number) => {
    const { error: deleteError } = await supabase
      .from('animales')
      .delete()
      .eq('id', id);

    if (deleteError) {
      toast.error('No se pudo eliminar el animal.');
      return;
    }

    setAnimales((prev) => prev.filter((animal) => animal.id !== id));
    toast.success('Animal eliminado con exito.');
  };

  const razasFiltradas = razas.filter((raza) => {
    if (!formData.especieId) {
      return false;
    }

    return raza.especie?.id === Number(formData.especieId);
  });

  return (
    <div className="space-y-6">
      <h1>Registro de Entradas</h1>

      {loading && <p className="text-muted-foreground">Cargando registro...</p>}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3">
          {error}
        </div>
      )}

      <Tabs.Root defaultValue="nuevo" className="bg-card border border-border rounded-lg">
        <Tabs.List className="flex border-b border-border">
          <Tabs.Trigger
            value="nuevo"
            className="flex-1 px-6 py-4 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors"
          >
            Nuevo Animal
          </Tabs.Trigger>
          <Tabs.Trigger
            value="inventario"
            className="flex-1 px-6 py-4 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors"
          >
            Inventario Actual
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="nuevo" className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block mb-2">Nombre del Animal</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ej: Max"
                  required
                />
              </div>

              <div>
                <label className="block mb-2">Especie</label>
                <select
                  value={formData.especieId}
                  onChange={(e) => setFormData({ ...formData, especieId: e.target.value, razaId: '' })}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Seleccionar especie</option>
                  {especies.map((especie) => (
                    <option key={especie.id} value={especie.id}>{especie.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2">Raza</label>
                <select
                  value={formData.razaId}
                  onChange={(e) => setFormData({ ...formData, razaId: e.target.value })}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={!formData.especieId}
                  required
                >
                  <option value="">Seleccionar raza</option>
                  {razasFiltradas.map((raza) => (
                    <option key={raza.id} value={raza.id}>{raza.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2">Edad</label>
                <input
                  type="text"
                  value={formData.edad}
                  onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ej: 2 anos"
                  required
                />
              </div>

              <div>
                <label className="block mb-2">Precio</label>
                <input
                  type="number"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Ej: 500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block mb-2">Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Disponible">Disponible</option>
                  <option value="Reservado">Reservado</option>
                  <option value="Vendido">Vendido</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-2">Fotos del Animal</label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">Arrastra fotos aqui o haz clic para seleccionar</p>
                <p className="text-sm text-muted-foreground">Puedes subir multiples fotos (JPG, PNG, hasta 5MB cada una)</p>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Registrar Animal
            </button>
          </form>
        </Tabs.Content>

        <Tabs.Content value="inventario" className="p-6">
          {animales.length === 0 ? (
            <p className="text-muted-foreground">No hay animales registrados.</p>
          ) : (
            <div className="space-y-4">
              {animales.map((animal) => (
                <div
                  key={animal.id}
                  className="bg-muted/30 border border-border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Nombre</p>
                      <p>{animal.nombre}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Especie</p>
                      <p>{animal.especie?.nombre ?? 'Sin especie'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Raza</p>
                      <p>{animal.raza?.nombre ?? 'Sin raza'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Estado</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs ${
                        animal.estado === 'Disponible' ? 'bg-black text-white' :
                        animal.estado === 'Reservado' ? 'bg-secondary text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {animal.estado}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Precio</p>
                      <p>{formatCurrency(animal.precio)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Editar animal">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEliminarAnimal(animal.id)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                      aria-label="Eliminar animal"
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
    </div>
  );
}
