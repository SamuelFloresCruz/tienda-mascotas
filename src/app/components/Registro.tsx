import { useEffect, useState } from 'react';
import { Upload, Plus } from 'lucide-react';
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

const BUCKET_NAME = 'animal-images';

export function Registro() {
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
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const [especiesRes, razasRes] = await Promise.all([
        supabase
          .from('especies')
          .select('id, nombre')
          .order('nombre'),
        supabase
          .from('razas')
          .select('id, nombre, especie:especies(id, nombre)')
          .order('nombre'),
      ]);

      if (especiesRes.error || razasRes.error) {
        setError('No se pudo cargar el registro.');
        toast.error('No se pudo cargar el registro.');
        setLoading(false);
        return;
      }

      setEspecies(especiesRes.data ?? []);
      setRazas(razasRes.data ?? []);
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));

    if (selectedFiles.length === 0) {
      setPreviewUrls([]);
      return;
    }

    const nextPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(nextPreviews);

    return () => {
      nextPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
  };

  const uploadImages = async () => {
    if (selectedFiles.length === 0) {
      return { imagen: null as string | null, galeria: [] as string[] };
    }

    const uploadedUrls: string[] = [];

    for (const file of selectedFiles) {
      const safeName = file.name.replace(/\s+/g, '-');
      const uniqueName = `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;
      const path = `animals/${uniqueName}`;

      const { data, error: uploadError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .upload(path, file, { upsert: false });

      if (uploadError || !data?.path) {
        toast.error('No se pudieron subir las fotos.');
        return null;
      }

      const { data: publicData } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      if (!publicData?.publicUrl) {
        toast.error('No se pudo obtener la URL publica de la imagen.');
        return null;
      }

      uploadedUrls.push(publicData.publicUrl);
    }

    return {
      imagen: uploadedUrls[0] ?? null,
      galeria: uploadedUrls,
    };
  };

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

    const uploadResult = await uploadImages();

    if (!uploadResult) {
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
        estado: 'Disponible',
        imagen: uploadResult.imagen,
        galeria: uploadResult.galeria,
      })
      .select('id')
      .single();

    if (insertError || !data) {
      toast.error('No se pudo registrar el animal.');
      return;
    }

    setFormData({
      nombre: '',
      especieId: '',
      razaId: '',
      edad: '',
      precio: '',
    });
    setSelectedFiles([]);
    setPreviewUrls([]);
    setFileInputKey((prev) => prev + 1);
    toast.success('Animal registrado con exito.');
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

      <div className="bg-card border border-border rounded-lg p-6">
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
          </div>

          <div>
            <label className="block mb-2">Fotos del Animal</label>
            <label
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer block"
            >
              <input
                key={fileInputKey}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesChange}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">Arrastra fotos aqui o haz clic para seleccionar</p>
              <p className="text-sm text-muted-foreground">Puedes subir multiples fotos (JPG, PNG, hasta 5MB cada una)</p>
            </label>

            {previewUrls.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {previewUrls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Vista previa ${index + 1}`}
                    className="h-24 w-full object-cover rounded-lg border border-border"
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Registrar Animal
          </button>
        </form>
      </div>
    </div>
  );
}
