import { supabase } from '../lib/supabase.js';

let datosGlobales = { trabajos: [], avisos: [] };

// --- 1. VERIFICACIÓN DE SESIÓN Y ROL ---
async function verificarAcceso() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    window.location.href = '/index.html';
    return;
  }

  // Verificamos si es admin (opcional, si tienes la tabla de roles)
  // Por ahora, si está logueado, lo dejamos pasar.
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
  
  // Cargar datos
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
    // Traer trabajos de la última semana
    const { data: trabajos, error: errTrabajos } = await supabase
      .from('trabajos')
      .select(`*, imagenes_adjuntas (url_imagen)`)
      .gte('fecha_inicio', haceUnaSemana.toISOString())
      .order('fecha_inicio', { ascending: false });

    if (errTrabajos) throw errTrabajos;
    datosGlobales.trabajos = trabajos || [];

    // Traer avisos (última semana O importantes)
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
    contAnuncios.innerHTML = datosGlobales.avisos.map(aviso => {
      const fecha = new Date(aviso.created_at).toLocaleString();
      const importanteClass = aviso.es_importante ? 'importante' : '';
      const badge = aviso.es_importante ? '🔴 <b>URGENTE</b> - ' : '';
      
      let fotosHTML = '';
      if (aviso.imagenes_adjuntas && aviso.imagenes_adjuntas.length > 0) {
        fotosHTML = '<div class="fotos-container">';
        aviso.imagenes_adjuntas.forEach(img => {
          fotosHTML += `<img src="${img.url_imagen}" onclick="window.open('${img.url_imagen}', '_blank')">`;
        });
        fotosHTML += '</div>';
      }

      return `
        <div class="card card-anuncio ${importanteClass}">
          <h3>${aviso.titulo}</h3>
          <div class="meta">${badge} 📅 ${fecha}</div>
          <div class="desc">${aviso.mensaje}</div>
          ${fotosHTML}
        </div>
      `;
    }).join('');
  }

  // Renderizar Trabajos
  if (datosGlobales.trabajos.length === 0) {
    contTrabajos.innerHTML = '<p>No hay trabajos recientes en los últimos 7 días.</p>';
  } else {
    contTrabajos.innerHTML = datosGlobales.trabajos.map(trabajo => {
      const fecha = new Date(trabajo.fecha_inicio).toLocaleString();
      
      let fotosHTML = '';
      if (trabajo.imagenes_adjuntas && trabajo.imagenes_adjuntas.length > 0) {
        fotosHTML = '<div class="fotos-container">';
        trabajo.imagenes_adjuntas.forEach(img => {
          fotosHTML += `<img src="${img.url_imagen}" onclick="window.open('${img.url_imagen}', '_blank')">`;
        });
        fotosHTML += '</div>';
      }

      return `
        <div class="card card-trabajo">
          <h3>${trabajo.titulo}</h3>
          <div class="meta">📅 ${fecha} | Estado: <b>${trabajo.estado}</b></div>
          <div class="desc">${trabajo.descripcion}</div>
          ${fotosHTML}
        </div>
      `;
    }).join('');
  }
}

// --- 5. DESCARGAR RESPALDO CSV ---
window.descargarRespaldoCSV = function() {
  if (datosGlobales.trabajos.length === 0 && datosGlobales.avisos.length === 0) {
    return alert("No hay datos para descargar.");
  }

  let csvContent = "TIPO,TITULO,DESCRIPCION/MENSAJE,FECHA,FOTOS\n";
  
  // Agregar Trabajos
  datosGlobales.trabajos.forEach(t => {
    const fotos = t.imagenes_adjuntas ? t.imagenes_adjuntas.map(img => img.url_imagen).join(" | ") : "";
    // Limpiamos comas y saltos de línea para que no rompan el CSV
    const titulo = t.titulo.replace(/,/g, '');
    const desc = t.descripcion ? t.descripcion.replace(/,/g, '').replace(/\n/g, ' ') : "";
    csvContent += `TRABAJO,"${titulo}","${desc}","${t.fecha_inicio}","${fotos}"\n`;
  });

  // Agregar Avisos
  datosGlobales.avisos.forEach(a => {
    const fotos = a.imagenes_adjuntas ? a.imagenes_adjuntas.map(img => img.url_imagen).join(" | ") : "";
    const importante = a.es_importante ? "SI" : "NO";
    const titulo = a.titulo.replace(/,/g, '');
    const desc = a.mensaje ? a.mensaje.replace(/,/g, '').replace(/\n/g, ' ') : "";
    csvContent += `AVISO (Importante: ${importante}),"${titulo}","${desc}","${a.created_at}","${fotos}"\n`;
  });

  // Generar descarga
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `respaldo_condominio_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Función dummy para las pestañas (por si luego agregas más)
window.cambiarVista = function(vista, event) {
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
  if(event) event.currentTarget.classList.add('active');
  // Aquí podrías ocultar/mostrar divs si tuvieras más secciones.
}

// --- INICIO ---
verificarAcceso();