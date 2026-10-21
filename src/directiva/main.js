import { supabase } from '../lib/supabase.js'; 

// --- 1. CERRAR SESIÓN ---
document.getElementById('btn-logout').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    alert("Error al cerrar sesión: " + error.message);
  } else {
    window.location.href = '/index.html'; 
  }
});

// --- 2. CARGA INICIAL ---
document.addEventListener('DOMContentLoaded', async () => {
  await cargarTrabajosRecientes();
  await cargarAnunciosRecientes();
});

// --- 3. CARGAR TRABAJOS ---
async function cargarTrabajosRecientes() {
  const contenedor = document.getElementById('contenedor-trabajos');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; 

    const { data: trabajos, error } = await supabase
      .from('trabajos')
      .select(`id, titulo, descripcion, fecha_inicio, estado, imagenes_adjuntas (url_imagen)`)
      .eq('conserje_id', user.id)
      .order('fecha_inicio', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (trabajos.length === 0) {
      contenedor.innerHTML = '<p>No has registrado trabajos aún.</p>';
      return;
    }

    contenedor.innerHTML = '';
    trabajos.forEach(trabajo => {
      const fecha = new Date(trabajo.fecha_inicio).toLocaleString();
      let fotosHTML = '';
      if (trabajo.imagenes_adjuntas && trabajo.imagenes_adjuntas.length > 0) {
        fotosHTML = '<div class="fotos-container">';
        trabajo.imagenes_adjuntas.forEach(img => {
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

// --- 4. CARGAR ANUNCIOS ---
async function cargarAnunciosRecientes() {
  const contenedor = document.getElementById('contenedor-anuncios');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: anuncios, error } = await supabase
      .from('avisos')
      .select(`id, titulo, mensaje, created_at, es_importante, imagenes_adjuntas (url_imagen)`)
      .eq('autor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (anuncios.length === 0) {
      contenedor.innerHTML = '<p>No has publicado anuncios aún.</p>';
      return;
    }

    contenedor.innerHTML = '';
    anuncios.forEach(anuncio => {
      const fecha = new Date(anuncio.created_at).toLocaleString();
      let badge = `<span class="badge-urgente">INCIDENTE</span>`;
      let claseExtra = '';
      if (anuncio.es_importante) {
        badge = `<span class="badge-urgente badge-importante">URGENTE</span>`;
        claseExtra = 'importante';
      }
      
      let fotosHTML = '';
      if (anuncio.imagenes_adjuntas && anuncio.imagenes_adjuntas.length > 0) {
        fotosHTML = '<div class="fotos-container">';
        anuncio.imagenes_adjuntas.forEach(img => {
          fotosHTML += `<img src="${img.url_imagen}" onclick="window.open('${img.url_imagen}', '_blank')" alt="Evidencia">`;
        });
        fotosHTML += '</div>';
      }

      const card = document.createElement('div');
      card.className = `card-anuncio ${claseExtra}`; 
      card.innerHTML = `
        ${badge}
        <h3>${anuncio.titulo}</h3>
        <div class="fecha">📅 ${fecha}</div>
        <div class="desc">${anuncio.mensaje}</div>
        ${fotosHTML}
      `;
      contenedor.appendChild(card);
    });
  } catch (error) {
    console.error("Error al cargar anuncios:", error);
    contenedor.innerHTML = '<p>Error al cargar los anuncios.</p>';
  }
}

// --- 5. GUARDAR TRABAJO ---
document.getElementById('form-trabajo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const titulo = document.getElementById('trabajo-titulo').value;
  const descripcion = document.getElementById('trabajo-descripcion').value;
  const fotos = document.getElementById('trabajo-fotos').files;

  if (fotos.length < 1 || fotos.length > 8) return alert("Debes subir entre 1 y 8 fotos.");

  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.textContent = "Subiendo...";

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No hay sesión activa.");

    const { data: trabajo, error: errorTrabajo } = await supabase
      .from('trabajos')
      .insert([{ conserje_id: user.id, titulo, descripcion, estado: 'completado', fecha_inicio: new Date().toISOString() }])
      .select().single();

    if (errorTrabajo) throw errorTrabajo;
    await subirFotos(fotos, trabajo.id, null);
    
    alert("Trabajo guardado con éxito");
    e.target.reset();
    await cargarTrabajosRecientes(); // Recargar lista
  } catch (error) {
    console.error(error);
    alert("Error al guardar trabajo: " + (error.message || JSON.stringify(error)));
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar Trabajo";
  }
});

// --- 6. GUARDAR ANUNCIO ---
document.getElementById('form-anuncio').addEventListener('submit', async (e) => {
  e.preventDefault();
  const titulo = document.getElementById('anuncio-titulo').value;
  const mensaje = document.getElementById('anuncio-mensaje').value;
  const esImportante = document.getElementById('anuncio-importante').checked;
  const fotos = document.getElementById('anuncio-fotos').files;

  if (fotos.length < 1 || fotos.length > 8) return alert("Debes subir entre 1 y 8 fotos.");

  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.textContent = "Publicando...";

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No hay sesión activa");

    const { data: aviso, error: errorAviso } = await supabase
      .from('avisos')
      .insert([{ autor_id: user.id, titulo, mensaje, es_importante: esImportante, created_at: new Date().toISOString() }])
      .select().single();

    if (errorAviso) throw errorAviso;
    await subirFotos(fotos, null, aviso.id);

    alert("Anuncio publicado con éxito");
    e.target.reset();
    await cargarAnunciosRecientes(); // Recargar lista
  } catch (error) {
    console.error(error);
    alert("Error al publicar anuncio: " + (error.message || JSON.stringify(error)));
  } finally {
    btn.disabled = false;
    btn.textContent = "Publicar Anuncio";
  }
});

// --- 7. FUNCIÓN AUXILIAR SUBIR FOTOS ---
async function subirFotos(archivos, trabajoId, avisoId) {
  for (const archivo of archivos) {
    const nombreArchivo = `${Date.now()}-${archivo.name}`;
    
    const { error: uploadError } = await supabase.storage.from('evidencias').upload(nombreArchivo, archivo);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(nombreArchivo);

    const { error: insertImgError } = await supabase
      .from('imagenes_adjuntas')
      .insert([{ trabajo_id: trabajoId, aviso_id: avisoId, url_imagen: publicUrl }]);

    if (insertImgError) throw insertImgError;
  }
}