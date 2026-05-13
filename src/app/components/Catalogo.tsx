import { useEffect, useState } from 'react';
import { Filter, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { supabase } from '../../lib/supabaseClient';

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

export function Catalogo() {
  const [selectedEspecie, setSelectedEspecie] = useState('Todos');
  const [selectedRaza, setSelectedRaza] = useState('Todos');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('animales')
        .select('id, nombre, edad, precio, estado, imagen, galeria, especie:especies(id, nombre), raza:razas(id, nombre)')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError('No se pudo cargar el catalogo.');
        setLoading(false);
        return;
      }

      setAnimales(data ?? []);
      setLoading(false);
    };

    loadData();
  }, []);

  const especies = [
    'Todos',
    ...Array.from(
      new Set(animales.map((animal) => animal.especie?.nombre).filter(Boolean) as string[])
    ),
  ];

  const razas = [
    'Todos',
    ...Array.from(
      new Set(
        animales
          .filter((animal) => selectedEspecie === 'Todos' || animal.especie?.nombre === selectedEspecie)
          .map((animal) => animal.raza?.nombre)
          .filter(Boolean) as string[]
      )
    ),
  ];

  const filteredAnimales = animales.filter((animal) => {
    const especieNombre = animal.especie?.nombre ?? '';
    const razaNombre = animal.raza?.nombre ?? '';
    const matchEspecie = selectedEspecie === 'Todos' || especieNombre === selectedEspecie;
    const matchRaza = selectedRaza === 'Todos' || razaNombre === selectedRaza;
    return matchEspecie && matchRaza;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Catalogo de Animales</h1>
      </div>

      {loading && <p className="text-muted-foreground">Cargando catalogo...</p>}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h3>Filtros</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-sm">Especie</label>
            <select
              value={selectedEspecie}
              onChange={(e) => {
                setSelectedEspecie(e.target.value);
                setSelectedRaza('Todos');
              }}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {especies.map((especie) => (
                <option key={especie} value={especie}>{especie}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm">Raza</label>
            <select
              value={selectedRaza}
              onChange={(e) => setSelectedRaza(e.target.value)}
              className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {razas.map((raza) => (
                <option key={raza} value={raza}>{raza}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedEspecie('Todos');
                setSelectedRaza('Todos');
              }}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {filteredAnimales.length === 0 ? (
        <p className="text-muted-foreground">No hay animales para mostrar.</p>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {filteredAnimales.map((animal) => (
            <div
              key={animal.id}
              onClick={() => setSelectedAnimal(animal)}
              className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="relative h-48 overflow-hidden">
                {animal.imagen ? (
                  <img
                    src={animal.imagen}
                    alt={animal.nombre}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                    Sin imagen
                  </div>
                )}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs ${
                  animal.estado === 'Disponible' ? 'bg-black text-white' :
                  animal.estado === 'Reservado' ? 'bg-secondary text-white' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {animal.estado}
                </div>
              </div>
              <div className="p-4">
                <h4 className="mb-1">{animal.nombre}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {animal.especie?.nombre ?? 'Sin especie'} • {animal.raza?.nombre ?? 'Sin raza'}
                </p>
                <p className="text-primary">{formatCurrency(animal.precio)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog.Root open={!!selectedAnimal} onOpenChange={(open) => !open && setSelectedAnimal(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-2xl w-[800px] max-h-[90vh] overflow-y-auto">
            {selectedAnimal && (
              <div>
                <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
                  <h2>{selectedAnimal.nombre}</h2>
                  <Dialog.Close className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </Dialog.Close>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAnimal.galeria && selectedAnimal.galeria.length > 0 ? (
                      selectedAnimal.galeria.map((img, index) => (
                        <img
                          key={index}
                          src={img}
                          alt={`${selectedAnimal.nombre} - foto ${index + 1}`}
                          className="w-full h-64 object-cover rounded-lg"
                        />
                      ))
                    ) : (
                      <div className="col-span-2 bg-muted rounded-lg h-64 flex items-center justify-center text-muted-foreground">
                        Sin fotos registradas
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Especie</p>
                      <p>{selectedAnimal.especie?.nombre ?? 'Sin especie'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Raza</p>
                      <p>{selectedAnimal.raza?.nombre ?? 'Sin raza'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Edad</p>
                      <p>{selectedAnimal.edad}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Precio</p>
                      <p className="text-primary">{formatCurrency(selectedAnimal.precio)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Estado</p>
                      <p className={
                        selectedAnimal.estado === 'Disponible' ? 'text-black' :
                        selectedAnimal.estado === 'Reservado' ? 'text-secondary' :
                        'text-muted-foreground'
                      }>{selectedAnimal.estado}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
                      Consultar
                    </button>
                    <button className="flex-1 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg hover:bg-secondary/90 transition-colors">
                      Comprar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
