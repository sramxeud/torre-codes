import { supabase } from '../lib/supabase.js'; // Asegúrate de que esta ruta sea correcta

// --- LÓGICA PARA EL FORMULARIO DE TRABAJOS ---
document.getElementById('form-trabajo').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const titulo = document.getElementById('trabajo-titulo').value;
  const descripcion = document.getElementById('trabajo-descripcion').value;
  const fotos = document.getElementById('trabajo-fotos').files;

  if (fotos.length < 1 || fotos.length > 8) {
    return alert("Debes subir entre 1 y 8 fotos.");
  }

  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.textContent = "Subiendo...";

  try {
    // 1. Obtener usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No hay sesión activa");

    // 2. Guardar el trabajo en la BD
    const { data: trabajo, error: errorTrabajo } = await supabase
      .from('trabajos')
      .insert([{
        conserje_id: user.id,
        titulo: titulo,
        descripcion: descripcion,
        estado: 'completado', 
        fecha_inicio: new Date().toISOString()
      }])
      .select()
      .single();

    if (errorTrabajo) throw errorTrabajo;

    // 3. Subir fotos y guardarlas en imagenes_adjuntas
    await subirFotos(fotos, trabajo.id, null);
    
    alert("Trabajo guardado con éxito");
    e.target.reset();

  } catch (error) {
    console.error(error);
    alert("Error al guardar trabajo: " + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar Trabajo";
  }
});

// --- LÓGICA PARA EL FORMULARIO DE ANUNCIOS ---
document.getElementById('form-anuncio').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const titulo = document.getElementById('anuncio-titulo').value;
  const mensaje = document.getElementById('anuncio-mensaje').value;
  const esImportante = document.getElementById('anuncio-importante').checked;
  const fotos = document.getElementById('anuncio-fotos').files;

  if (fotos.length < 1 || fotos.length > 8) {
    return alert("Debes subir entre 1 y 8 fotos.");
  }

  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.textContent = "Publicando...";

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No hay sesión activa");

    // 1. Guardar el aviso en la BD
    const { data: aviso, error: errorAviso } = await supabase
      .from('avisos')
      .insert([{
        autor_id: user.id,
        titulo: titulo,
        mensaje: mensaje,
        es_importante: esImportante,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (errorAviso) throw errorAviso;

    // 2. Subir fotos y guardarlas en imagenes_adjuntas
    await subirFotos(fotos, null, aviso.id);

    alert("Anuncio publicado con éxito");
    e.target.reset();

  } catch (error) {
    console.error(error);
    alert("Error al publicar anuncio: " + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Publicar Anuncio";
  }
});

// --- FUNCIÓN AUXILIAR PARA SUBIR FOTOS ---
async function subirFotos(archivos, trabajoId, avisoId) {
  for (const archivo of archivos) {
    const nombreArchivo = `evidencias/${Date.now()}-${archivo.name}`;
    
    // Subir a storage
    const { error: uploadError } = await supabase.storage
      .from('evidencias') // <-- Nombre del bucket
      .upload(nombreArchivo, archivo);

    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('evidencias')
      .getPublicUrl(nombreArchivo);

    // Insertar en la tabla imagenes_adjuntas
    await supabase.from('imagenes_adjuntas').insert([{
      trabajo_id: trabajoId,
      aviso_id: avisoId,
      url_imagen: publicUrl
    }]);
  }
}