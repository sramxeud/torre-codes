import { supabase } from '../lib/supabase.js'; 

// --- 1. CERRAR SESIÓN ---
document.getElementById('btn-logout').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    alert("Error al cerrar sesión: " + error.message);
  } else {
    window.location.href = '/index.html'; // Redirige al login (ajusta si tu login está en otra ruta)
  }
});

// --- 2. CARGAR TRABAJOS RECIENTES AL INICIAR ---
document.addEventListener('DOMContentLoaded', async () => {
  await cargarTrabajosRecientes();
});

async function cargarTrabajosRecientes() {
  const contenedor = document.getElementById('contenedor-trabajos');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Si no hay sesión, el login debería redirigir

    // Traemos los trabajos del conserje logueado, incluyendo sus imágenes (JOIN)
    const { data: trabajos, error } = await supabase
      .from('trabajos')
      .select(`
        id, titulo, descripcion, fecha_inicio, estado,
        imagenes_adjuntas (url_imagen)
      `)
      .eq('conserje_id', user.id)
      .order('fecha_inicio', { ascending: false })
      .limit(10); // Mostramos solo los últimos 10 para no saturar

    if (error) throw error;

    if (trabajos.length === 0) {
      contenedor.innerHTML = '<p>No has registrado trabajos aún.</p>';
      return;
    }

    // Renderizar las tarjetas
    contenedor.innerHTML = '';
    trabajos.forEach(trabajo => {
      const fecha = new Date(trabajo.fecha_inicio).toLocaleString();
      
      // Generar las miniaturas de las fotos
      let fotosHTML = '';
      if (trabajo.imagenes_adjuntas && trabajo.imagenes_adjuntas.length > 0) {
        fotosHTML = '<div class="fotos-container">';
        trabajo.imagenes_adjuntas.forEach(img => {
          // Abre la imagen en una pestaña nueva al hacer clic
          fotosHTML += `<img src="${img.url_imagen}" onclick="window.open('${img.url_imagen}', '_blank')" alt="Evidencia">`;
        });
        fotosHTML += '</div>';
      }

      const card = document.createElement('div');
      card.className = 'card-trabajo';
      card.innerHTML = `
        <h3>${trabajo.titulo}</h3>
        <div class="fecha">📅 ${fecha} | Estado: <b>${trabajo.estado}</b></div>
        <div class="desc">${trabajo.descripcion}</div>
        ${fotosHTML}
      `;
      contenedor.appendChild(card);
    });

  } catch (error) {
    console.error("Error al cargar trabajos:", error);
    contenedor.innerHTML = '<p>Error al cargar los trabajos.</p>';
  }
}

// --- 3. LÓGICA PARA EL FORMULARIO DE TRABAJOS (GUARDAR) ---
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No hay sesión activa.");

    // Insertar trabajo
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

    // Subir fotos
    await subirFotos(fotos, trabajo.id, null);
    
    alert("Trabajo guardado con éxito");
    e.target.reset();
    
    // RECARGAR LA LISTA DE TRABAJOS PARA QUE APAREZCA EL NUEVO
    await cargarTrabajosRecientes();

  } catch (error) {
    console.error(error);
    alert("Error al guardar trabajo: " + (error.message || JSON.stringify(error)));
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar Trabajo";
  }
});

// --- 4. LÓGICA PARA EL FORMULARIO DE ANUNCIOS (GUARDAR) ---
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

    await subirFotos(fotos, null, aviso.id);

    alert("Anuncio publicado con éxito");
    e.target.reset();

  } catch (error) {
    console.error(error);
    alert("Error al publicar anuncio: " + (error.message || JSON.stringify(error)));
  } finally {
    btn.disabled = false;
    btn.textContent = "Publicar Anuncio";
  }
});

// --- 5. FUNCIÓN AUXILIAR PARA SUBIR FOTOS ---
async function subirFotos(archivos, trabajoId, avisoId) {
  for (const archivo of archivos) {
    const nombreArchivo = `${Date.now()}-${archivo.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('evidencias') 
      .upload(nombreArchivo, archivo);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('evidencias')
      .getPublicUrl(nombreArchivo);

    const { error: insertImgError } = await supabase
      .from('imagenes_adjuntas')
      .insert([{
        trabajo_id: trabajoId,
        aviso_id: avisoId,
        url_imagen: publicUrl
      }]);

    if (insertImgError) throw insertImgError;
  }
}