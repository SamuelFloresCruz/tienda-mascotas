import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
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

type EspecieCard = {
  nombre: string;
  imagen: string | null;
  count: number;
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

export function Home() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
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
        setError('No se pudo cargar la portada.');
        setLoading(false);
        return;
      }

      setAnimales(data ?? []);
      setLoading(false);
    };

    loadData();
  }, []);

  const destacados = animales.slice(0, 3);
  const recientes = animales.slice(0, 6);

  const especies = animales.reduce<EspecieCard[]>((acc, animal) => {
    const nombre = animal.especie?.nombre;
    if (!nombre) {
      return acc;
    }

    const existing = acc.find((item) => item.nombre === nombre);
    if (existing) {
      existing.count += 1;
      if (!existing.imagen) {
        existing.imagen = animal.imagen;
      }
      return acc;
    }

    acc.push({
      nombre,
      imagen: animal.imagen,
      count: 1,
    });

    return acc;
  }, []);

  const nextSlide = () => {
    if (destacados.length === 0) {
      return;
    }
    setCurrentSlide((prev) => (prev + 1) % destacados.length);
  };

  const prevSlide = () => {
    if (destacados.length === 0) {
      return;
    }
    setCurrentSlide((prev) => (prev - 1 + destacados.length) % destacados.length);
  };

  useEffect(() => {
    if (currentSlide >= destacados.length) {
      setCurrentSlide(0);
    }
  }, [currentSlide, destacados.length]);

  const handleOpenEspecie = (nombre: string) => {
    navigate(`/catalogo?especie=${encodeURIComponent(nombre)}`);
  };

  return (
    <div className="space-y-12">
      {loading && <p className="text-muted-foreground">Cargando portada...</p>}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3">
          {error}
        </div>
      )}

      <section className="relative h-[500px] bg-black rounded-xl overflow-hidden">
        {destacados.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/80">
            No hay animales destacados
          </div>
        ) : (
          <>
            <img
              src={destacados[currentSlide].imagen ?? ''}
              alt={destacados[currentSlide].nombre}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <h2 className="mb-2">{destacados[currentSlide].nombre}</h2>
              <p className="text-white/80">
                {destacados[currentSlide].especie?.nombre ?? 'Sin especie'} • {destacados[currentSlide].raza?.nombre ?? 'Sin raza'}
              </p>
            </div>

            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {destacados.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
                  }`}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-6">Explorar por Especie</h2>
        {especies.length === 0 ? (
          <p className="text-muted-foreground">No hay especies para mostrar.</p>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {especies.map((especie) => (
              <div
                key={especie.nombre}
                onClick={() => handleOpenEspecie(especie.nombre)}
                className="group relative h-48 bg-card border border-border rounded-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all"
              >
                {especie.imagen ? (
                  <img
                    src={especie.imagen}
                    alt={especie.nombre}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                    Sin imagen
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="text-white mb-1">{especie.nombre}</h3>
                  <p className="text-sm text-white/70">{especie.count} disponibles</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-6">Recien Llegados</h2>
        {recientes.length === 0 ? (
          <p className="text-muted-foreground">No hay ingresos recientes.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {recientes.map((animal) => (
              <div
                key={animal.id}
                onClick={() => setSelectedAnimal(animal)}
                className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              >
                {animal.imagen ? (
                  <img
                    src={animal.imagen}
                    alt={animal.nombre}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground">
                    Sin imagen
                  </div>
                )}
                <div className="p-4">
                  <h4>{animal.nombre}</h4>
                  <p className="text-sm text-muted-foreground">
                    {animal.especie?.nombre ?? 'Sin especie'} • {animal.raza?.nombre ?? 'Sin raza'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
