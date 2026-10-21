import { supabase } from '../lib/supabase.js';

let datosGlobales = { trabajos: [], avisos: [] };

// --- 1. VERIFICACIÓN DE SESIÓN ---
async function verificarAcceso() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    window.location.href = '/index.html';
    return;
  }

  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('panel-directiva').style.display = 'block';
  
  // Calcular quién está de turno y cargar los datos
  calcularConserjeTurno();
  await cargarDatosRecientes();
}

// --- 2. LÓGICA DEL CONSERJE DE TURNO ---
function calcularConserjeTurno() {
  // Definimos los conserjes con sus días (0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado)
  const conserjes = [
    {
      nombre: "Milton Diego Yujra Medina",
      dias: [1, 3, 6], // Lunes, Miércoles, Sábado
      telefono: "62397180",
      foto: "/milton.jpg" // Asumiendo que está en la carpeta public
    },
    {
      nombre: "Esteban Alberto Flores",
      dias: [5, 0], // Viernes, Domingo
      telefono: "69713524",
      foto: "/esteban.jpg"
    },
    {
      nombre: "Cesar Augusto Ghinea Guevara",
      dias: [2, 4], // Martes, Jueves
      telefono: "76791936",
      foto: "/cesar.jpg"
    }
  ];

  const hoy = new Date().getDay(); // 0 al 6
  let conserjeHoy = null;

  // Buscamos quién tiene el día de hoy en su arreglo
  for (const c of conserjes) {
    if (c.dias.includes(hoy)) {
      conserjeHoy = c;
      break;
    }
  }

  const tarjeta = document.getElementById('tarjeta-turno');

  if (conserjeHoy) {
    document.getElementById('turno-foto').src = conserjeHoy.foto;
    document.getElementById('turno-nombre').innerText = conserjeHoy.nombre;
    document.getElementById('turno-dias').innerText = "Turno activo hasta las 8:15 AM del día siguiente";
    
    const telLink = document.getElementById('turno-telefono');
    telLink.href = `tel:${conserjeHoy.telefono}`;
    telLink.innerHTML = `📞 Llamar al ${conserjeHoy.telefono}`;
    
    tarjeta.style.display = 'flex';
  } else {
    // Por si acaso hay un día sin asignar
    tarjeta.style.display = 'none'; 
  }
}

// --- 3. CERRAR SESIÓN ---
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/index.html';
  });
}

// --- 4. CARGAR TRABAJOS Y ANUNCIOS ---
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

// --- 5. RENDERIZAR EN PANTALLA ---
function renderizarDatos() {
  const contAnuncios = document.getElementById('contenedor-anuncios');
  const contTrabajos = document.getElementById('contenedor-trabajos');

  if (!contAnuncios || !contTrabajos) {
    console.error("No se encontraron los contenedores en el HTML.");
    return; 
  }

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
      contTrabajos.appendChild(card);
    });
  }
}

// --- 6. DESCARGAR RESPALDO CSV ---
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
  link.setAttribute("download", `respaldo_directiva_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- INICIO ---
verificarAcceso();