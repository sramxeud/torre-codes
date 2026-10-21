import { supabase } from '../lib/supabase.js';

let datosGlobales = { trabajos: [], avisos: [] };
let itemSeleccionado = null; 

// --- 1. VERIFICACIÓN DE SESIÓN ---
async function verificarAcceso() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    window.location.href = '/index.html';
    return;
  }

  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
  
  await cargarDatosRecientes();
}

// --- 2. CERRAR SESIÓN ---
document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
});

// --- 3. CARGAR TRABAJOS Y ANUNCIOS ---
async function cargarDatosRecientes() {
  const haceUnaSemana = new Date();
  haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);

  try {
    const { data: trabajos, error: errTrabajos } = await supabase
      .from('trabajos')
      .select(`*, imagenes_adjuntas (url_imagen)`)
      .gte('fecha_inicio', haceUnaSemana.toISOString())
      .order('fecha_inicio', { ascending: false });

    if (errTrabajos) throw errTrabajos;
    datosGlobales.trabajos = trabajos || [];

    const { data: avisos, error: errAvisos } = await supabase
      .from('avisos')
      .select(`*, imagenes_adjuntas (url_imagen)`)
      .or(`created_at.gte.${haceUnaSemana.toISOString()},es_importante.eq.true`)
      .order('created_at', { ascending: false });

    if (errAvisos) throw errAvisos;
    datosGlobales.avisos = avisos || [];

    renderizarDatos();

  } catch (error) {
    console.error("Error al cargar datos:", error);
    alert("Error al cargar la información de la base de datos.");
  }
}

// --- 4. RENDERIZAR EN PANTALLA ---
function renderizarDatos() {
  const contAnuncios = document.getElementById('contenedor-anuncios');
  const contTrabajos = document.getElementById('contenedor-trabajos');

  // Renderizar Anuncios
  if (datosGlobales.avisos.length === 0) {
    contAnuncios.innerHTML = '<p>No hay anuncios recientes.</p>';
  } else {
    contAnuncios.innerHTML = '';
    datosGlobales.avisos.forEach(aviso => {
      const fecha = new Date(aviso.created_at).toLocaleString();
      const importanteClass = aviso.es_importante ? 'importante' : '';
      const badge = aviso.es_importante ? '🔴 <b>URGENTE</b> - ' : '';
      
      const card = document.createElement('div');
      card.className = `card card-anuncio ${importanteClass}`;
      card.innerHTML = `
        <h3>${aviso.titulo}</h3>
        <div class="meta">${badge} 📅 ${fecha}</div>
        <div class="desc">${aviso.mensaje}</div>
      `;
      // Usamos el evento onclick nativo para evitar problemas con comillas
      card.onclick = () => abrirModal('aviso', aviso);
      contAnuncios.appendChild(card);
    });
  }

  // Renderizar Trabajos
  if (datosGlobales.trabajos.length === 0) {
    contTrabajos.innerHTML = '<p>No hay trabajos recientes en los últimos 7 días.</p>';
  } else {
    contTrabajos.innerHTML = '';
    datosGlobales.trabajos.forEach(trabajo => {
      const fecha = new Date(trabajo.fecha_inicio).toLocaleString();
      
      const card = document.createElement('div');
      card.className = 'card card-trabajo';
      card.innerHTML = `
        <h3>${trabajo.titulo}</h3>
        <div class="meta">📅 ${fecha} | Estado: <b>${trabajo.estado}</b></div>
        <div class="desc">${trabajo.descripcion}</div>
      `;
      card.onclick = () => abrirModal('trabajo', trabajo);
      contTrabajos.appendChild(card);
    });
  }
}

// --- 5. LÓGICA DEL MODAL ---
window.abrirModal = function(tipo, data) {
  itemSeleccionado = { tipo, data };
  
  document.getElementById('modal-titulo').innerText = data.titulo;
  document.getElementById('modal-desc').innerText = tipo === 'trabajo' ? data.descripcion : data.mensaje;
  
  // Renderizar fotos
  const contFotos = document.getElementById('modal-fotos');
  if (data.imagenes_adjuntas && data.imagenes_adjuntas.length > 0) {
    contFotos.innerHTML = data.imagenes_adjuntas.map(img => 
      `<img src="${img.url_imagen}" onclick="window.open('${img.url_imagen}', '_blank')">`
    ).join('');
  } else {
    contFotos.innerHTML = '<p style="font-size:12px; color:var(--muted);">Sin fotos adjuntas</p>';
  }

  // Configurar botones
  const contBotones = document.getElementById('modal-botones');
  contBotones.innerHTML = '';

  if (tipo === 'trabajo') {
    if (data.estado !== 'cerrado') {
      contBotones.innerHTML += `<button class="btn-action btn-success" onclick="marcarTrabajoCerrado()">✅ Marcar como Cerrado</button>`;
    }
  } else if (tipo === 'aviso') {
    if (data.es_importante) {
      contBotones.innerHTML += `<button class="btn-action btn-warning" onclick="quitarImportancia()">⚠️ Quitar Urgencia</button>`;
    }
  }

  contBotones.innerHTML += `<button class="btn-action btn-danger" onclick="eliminarRegistro()">🗑️ Eliminar del Sistema</button>`;

  document.getElementById('modal-gestion').classList.add('active');
}

window.cerrarModal = function() {
  document.getElementById('modal-gestion').classList.remove('active');
  itemSeleccionado = null;
}

// --- 6. ACCIONES EN SUPABASE ---

window.marcarTrabajoCerrado = async function() {
  if (!itemSeleccionado) return;
  try {
    const { error } = await supabase
      .from('trabajos')
      .update({ estado: 'cerrado', fecha_cierre: new Date().toISOString() })
      .eq('id', itemSeleccionado.data.id);

    if (error) throw error;
    
    alert("Trabajo marcado como cerrado.");
    cerrarModal();
    await cargarDatosRecientes();
  } catch (error) {
    alert("Error al actualizar: " + error.message);
  }
}

window.quitarImportancia = async function() {
  if (!itemSeleccionado) return;
  try {
    const { error } = await supabase
      .from('avisos')
      .update({ es_importante: false })
      .eq('id', itemSeleccionado.data.id);

    if (error) throw error;
    
    alert("El aviso ya no está marcado como urgente.");
    cerrarModal();
    await cargarDatosRecientes();
  } catch (error) {
    alert("Error al actualizar: " + error.message);
  }
}

window.eliminarRegistro = async function() {
  if (!itemSeleccionado) return;
  
  if (!confirm("¿Estás seguro de que deseas eliminar este registro? Asegúrate de haber descargado el respaldo CSV si lo necesitas.")) {
    return;
  }

  try {
    const tabla = itemSeleccionado.tipo === 'trabajo' ? 'trabajos' : 'avisos';
    const id = itemSeleccionado.data.id;

    // Borrar imágenes de Storage si es necesario (opcional, para no dejar basura)
    if (itemSeleccionado.data.imagenes_adjuntas) {
      const filePaths = itemSeleccionado.data.imagenes_adjuntas.map(img => {
        const parts = img.url_imagen.split('/');
        return parts[parts.length - 1]; // Obtiene solo el nombre del archivo
      });
      await supabase.storage.from('evidencias').remove(filePaths);
    }

    // Borrar de la tabla principal (las imágenes adjuntas se borran por CASCADE)
    const { error } = await supabase.from(tabla).delete().eq('id', id);

    if (error) throw error;
    
    alert("Registro eliminado.");
    cerrarModal();
    await cargarDatosRecientes();
  } catch (error) {
    alert("Error al eliminar: " + error.message);
  }
}

// --- 7. DESCARGAR RESPALDO CSV ---
window.descargarRespaldoCSV = function() {
  if (datosGlobales.trabajos.length === 0 && datosGlobales.avisos.length === 0) {
    return alert("No hay datos para descargar.");
  }

  let csvContent = "TIPO,TITULO,DESCRIPCION/MENSAJE,FECHA,FOTOS\n";
  
  datosGlobales.trabajos.forEach(t => {
    const fotos = t.imagenes_adjuntas ? t.imagenes_adjuntas.map(img => img.url_imagen).join(" | ") : "";
    const titulo = t.titulo.replace(/,/g, '').replace(/"/g, '""');
    const desc = t.descripcion ? t.descripcion.replace(/,/g, '').replace(/\n/g, ' ').replace(/"/g, '""') : "";
    csvContent += `TRABAJO,"${titulo}","${desc}","${t.fecha_inicio}","${fotos}"\n`;
  });

  datosGlobales.avisos.forEach(a => {
    const fotos = a.imagenes_adjuntas ? a.imagenes_adjuntas.map(img => img.url_imagen).join(" | ") : "";
    const importante = a.es_importante ? "SI" : "NO";
    const titulo = a.titulo.replace(/,/g, '').replace(/"/g, '""');
    const desc = a.mensaje ? a.mensaje.replace(/,/g, '').replace(/\n/g, ' ').replace(/"/g, '""') : "";
    csvContent += `AVISO (Importante: ${importante}),"${titulo}","${desc}","${a.created_at}","${fotos}"\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `respaldo_condominio_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- INICIO ---
verificarAcceso();