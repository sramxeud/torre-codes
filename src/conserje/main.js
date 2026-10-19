import { supabase } from '../lib/supabase.js'; // Ajusta la ruta a tu archivo

async function subirTrabajo(titulo, descripcion, archivosFotos) {
  // 1. Obtener el usuario actual (conserje)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert("No hay sesión activa");

  // 2. Insertar el trabajo
  const { data: trabajo, error: errorTrabajo } = await supabase
    .from('trabajos')
    .insert([{
      conserje_id: user.id,
      titulo: titulo,
      descripcion: descripcion,
      estado: 'completado', // o 'pendiente' según tu flujo
      fecha_inicio: new Date().toISOString()
    }])
    .select()
    .single();

  if (errorTrabajo) return console.error("Error al crear trabajo:", errorTrabajo);

  // 3. Subir las imágenes (Máximo 8)
  if (archivosFotos.length > 0 && archivosFotos.length <= 8) {
    for (const archivo of archivosFotos) {
      // Generar un nombre único para el archivo
      const nombreArchivo = `${trabajo.id}/${Date.now()}-${archivo.name}`;
      
      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('evidencias')
        .upload(nombreArchivo, archivo);

      if (!uploadError) {
        // Obtener la URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('evidencias')
          .getPublicUrl(nombreArchivo);

        // Guardar la URL en la tabla de imágenes
        await supabase.from('imagenes_adjuntas').insert([{
          trabajo_id: trabajo.id,
          url_imagen: publicUrl
        }]);
      }
    }
  }
  alert("Trabajo y fotos subidos con éxito");
}