import { supabase } from '../lib/supabase.js';

let datosGlobales = { trabajos: [], avisos: [] };

// --- 1. LÓGICA DE PESTAÑAS (Event Listeners) ---
// Esto asegura que los clics funcionen siempre, sin depender del HTML
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    // Quitar la clase 'active' de todas las pestañas y secciones
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.vista-seccion').forEach(s => s.classList.remove('active'));
    
    // Añadir 'active' a la pestaña clickeada y a su sección correspondiente
    const vistaId = e.target.getAttribute('data-vista');
    e.target.classList.add('active');
    
    const seccion = document.getElementById(`vista-${vistaId}`);
    if (seccion) seccion.classList.add('active');
  });
});

// --- 2. VERIFICACIÓN DE SESIÓN ---
async function verificarAcceso() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { 
      window.location.href = '/index.html'; 
      return; 
    }

    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    
    // Cargamos cada sección de forma independiente. 
    // Si una falla, las demás se cargan y las pestañas siguen funcionando.
    await cargarDatosRecientes().catch(e => console.error("Error en Monitoreo:", e));
    await cargarBienesPendientes().catch(e => console.error("Error en Bienes:", e));
    await cargarPagosPendientes().catch(e => console.error("Error en Pagos:", e));
    await cargarUsuarios().catch(e => console.error("Error en Usuarios:", e));

  } catch (error) {
    console.error("Error crítico al verificar acceso:", error);
  }
}

// --- 3. CERRAR SESIÓN ---
document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
});

// =====================================================================
// SECCIÓN A: MONITOREO (TRABAJOS Y ANUNCIOS)
// =====================================================================
async function cargarDatosRecientes() {
  const haceUnaSemana = new Date();
  haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);

  try {
    const { data: trabajos } = await supabase
      .from('trabajos')
      .select(`*, imagenes_adjuntas (url_imagen)`)
      .gte('fecha_inicio', haceUnaSemana.toISOString())
      .order('fecha_inicio', { ascending: false });

    const { data: avisos } = await supabase
      .from('avisos')
      .select(`*, imagenes_adjuntas (url_imagen)`)
      .or(`created_at.gte.${haceUnaSemana.toISOString()},es_importante.eq.true`)
      .order('created_at', { ascending: false });

    datosGlobales.trabajos = trabajos || [];
    datosGlobales.avisos = avisos || [];
    renderizarMonitoreo();
  } catch (error) { 
    console.error("Error en cargarDatosRecientes:", error); 
  }
}

function renderizarMonitoreo() {
  const contAnuncios = document.getElementById('contenedor-anuncios');
  const contTrabajos = document.getElementById('contenedor-trabajos');

  if (!contAnuncios || !contTrabajos) return;

  contAnuncios.innerHTML = datosGlobales.avisos.map(aviso => {
    const fecha = new Date(aviso.created_at).toLocaleString();
    const importanteClass = aviso.es_importante ? 'importante' : '';
    const badge = aviso.es_importante ? '🔴 <b>URGENTE</b> - ' : '';
    return `
      <div class="card card-anuncio ${importanteClass}">
        <h3>${aviso.titulo}</h3>
        <div class="meta">${badge} 📅 ${fecha}</div>
        <div>${aviso.mensaje}</div>
      </div>`;
  }).join('') || '<p>No hay anuncios recientes.</p>';

  contTrabajos.innerHTML = datosGlobales.trabajos.map(trabajo => {
    const fecha = new Date(trabajo.fecha_inicio).toLocaleString();
    return `
      <div class="card card-trabajo">
        <h3>${trabajo.titulo}</h3>
        <div class="meta">📅 ${fecha} | Estado: <b>${trabajo.estado}</b></div>
        <div>${trabajo.descripcion}</div>
      </div>`;
  }).join('') || '<p>No hay trabajos recientes.</p>';
}

// =====================================================================
// SECCIÓN B: VALIDAR BIENES
// =====================================================================
async function cargarBienesPendientes() {
  const contenedor = document.getElementById('contenedor-bienes');
  if (!contenedor) return;

  try {
    const { data: bienes, error } = await supabase
      .from('bienes')
      .select(`*, usuarios (email)`)
      .eq('estado_validacion', 'pendiente');

    if (error) throw error;

    if (bienes.length === 0) {
      contenedor.innerHTML = '<p>No hay bienes pendientes de validación.</p>';
      return;
    }

    contenedor.innerHTML = bienes.map(b => {
      const montoSugerido = (b.superficie_m2 * 4.49).toFixed(2);
      return `
        <div class="card">
          <h3>${b.tipo.toUpperCase()} ${b.identificador}</h3>
          <div class="meta">Usuario: ${b.usuarios ? b.usuarios.email : 'Desconocido'}</div>
          <div>Superficie: <b>${b.superficie_m2} m²</b></div>
          <div>Monto Sugerido: <b>Bs. ${montoSugerido}</b></div>
          <div class="fotos-container">
            <a href="${b.foto_documento_url}" target="_blank" class="btn-sm btn-info">Ver Documento</a>
          </div>
          <div class="acciones-card">
            <button class="btn-sm btn-aprobar" onclick="aprobarBien('${b.id}', ${b.superficie_m2})">Aprobar</button>
            <button class="btn-sm btn-rechazar" onclick="rechazarBien('${b.id}')">Rechazar</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) { 
    console.error("Error al cargar bienes:", error);
    contenedor.innerHTML = '<p>Error al cargar bienes.</p>';
  }
}

window.aprobarBien = async function(id, superficie) {
  const montoEstandar = (superficie * 4.49).toFixed(2);
  const customMonto = prompt(`Monto estándar: Bs. ${montoEstandar}.\n¿Deseas asignar un monto especial? (Deja vacío para mantener el estándar)`, "");
  
  let montoEspecial = null;
  let razon = null;

  if (customMonto !== null && customMonto.trim() !== "") {
    montoEspecial = parseFloat(customMonto);
    razon = prompt("Ingresa la razón del monto especial (ej: descuento, arreglo):");
    if (!razon) return alert("Debes ingresar una razón.");
  }

  const { error } = await supabase.from('bienes').update({ 
    estado_validacion: 'aprobado',
    monto_especial: montoEspecial,
    razon_monto_especial: razon
  }).eq('id', id);

  if (error) alert("Error: " + error.message);
  else { alert("Bien aprobado."); cargarBienesPendientes(); }
}

window.rechazarBien = async function(id) {
  if (!confirm("¿Seguro que deseas rechazar este bien?")) return;
  const { error } = await supabase.from('bienes').update({ estado_validacion: 'rechazado' }).eq('id', id);
  if (error) alert("Error: " + error.message);
  else cargarBienesPendientes();
}

// =====================================================================
// SECCIÓN C: VALIDAR PAGOS
// =====================================================================
async function cargarPagosPendientes() {
  const contenedor = document.getElementById('contenedor-pagos');
  if (!contenedor) return;

  try {
    const { data: pagos, error } = await supabase
      .from('pagos')
      .select(`*, usuarios (email), bienes (identificador, tipo)`)
      .eq('estado', 'pendiente');

    if (error) throw error;

    if (pagos.length === 0) {
      contenedor.innerHTML = '<p>No hay pagos pendientes.</p>';
      return;
    }

    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    contenedor.innerHTML = pagos.map(p => {
      const bien = p.bienes || { tipo: '?', identificador: '?' };
      const mesesFormateados = p.meses_pagados.map(m => {
        const [year, month] = m.split('-');
        return `${nombresMeses[parseInt(month)-1]} ${year}`;
      }).join(", ");

      return `
        <div class="card">
          <h3>Pago: ${bien.tipo} ${bien.identificador}</h3>
          <div class="meta">Usuario: ${p.usuarios ? p.usuarios.email : '?'} | Dep: ${p.nombre_depositante}</div>
          <div>Monto: <b>Bs. ${p.monto_total}</b></div>
          <div>Meses: <b>${mesesFormateados}</b></div>
          <div class="fotos-container">
            <a href="${p.foto_comprobante_url}" target="_blank" class="btn-sm btn-info">Ver Comprobante</a>
          </div>
          <div class="acciones-card">
            <button class="btn-sm btn-aprobar" onclick="aprobarPago('${p.id}', '${p.bien_id}', '${JSON.stringify(p.meses_pagados).replace(/"/g, '&quot;')}', ${p.monto_total})">Aprobar</button>
            <button class="btn-sm btn-rechazar" onclick="rechazarPago('${p.id}')">Rechazar</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) { 
    console.error("Error al cargar pagos:", error);
    contenedor.innerHTML = '<p>Error al cargar pagos.</p>';
  }
}

window.aprobarPago = async function(pagoId, bienId, mesesJson, monto) {
  if (!confirm("¿Aprobar este pago? Esto actualizará el historial del copropietario.")) return;

  try {
    const meses = JSON.parse(mesesJson.replace(/&quot;/g, '"'));
    
    const { error: errPago } = await supabase.from('pagos').update({ estado: 'aprobado' }).eq('id', pagoId);
    if (errPago) throw errPago;

    const montoPorMes = monto / meses.length;
    for (const m of meses) {
      const [anio, mes] = m.split('-');
      const { error: errHistorial } = await supabase.from('historial_pagos').upsert({
        bien_id: bienId,
        anio: parseInt(anio),
        mes: parseInt(mes),
        estado: 'pagado',
        monto_pagado: montoPorMes,
        pago_id: pagoId
      }, { onConflict: 'bien_id, anio, mes' });

      if (errHistorial) console.error("Error en historial mes " + m, errHistorial);
    }

    alert("Pago aprobado e historial actualizado.");
    cargarPagosPendientes();
  } catch (error) {
    alert("Error al aprobar pago: " + error.message);
  }
}

window.rechazarPago = async function(pagoId) {
  const motivo = prompt("Ingresa el motivo del rechazo (se enviará al copropietario):");
  if (motivo === null) return;

  const { error } = await supabase.from('pagos').update({ estado: 'rechazado', mensaje_admin: motivo }).eq('id', pagoId);
  if (error) alert("Error: " + error.message);
  else { alert("Pago rechazado."); cargarPagosPendientes(); }
}

// =====================================================================
// SECCIÓN D: GESTIÓN DE USUARIOS
// =====================================================================
async function cargarUsuarios() {
  const contenedor = document.getElementById('contenedor-usuarios');
  if (!contenedor) return;

  try {
    const { data: usuarios, error } = await supabase.from('usuarios').select('*');
    
    if (error) throw error;

    contenedor.innerHTML = usuarios.map(u => {
      const suspendido = u.estado_cuenta === 'suspendido';
      const btnAccion = suspendido 
        ? `<button class="btn-sm btn-aprobar" onclick="reactivarUsuario('${u.id}')">Reactivar Cuenta</button>`
        : `<button class="btn-sm btn-rechazar" onclick="suspenderUsuario('${u.id}')">Suspender Cuenta</button>`;
      
      const badgeEstado = suspendido ? '<span style="color:var(--danger)">SUSPENDIDO</span>' : '<span style="color:var(--success)">ACTIVO</span>';

      return `
        <div class="card">
          <h3>${u.email}</h3>
          <div class="meta">Estado: ${badgeEstado} ${u.es_master ? '| 👑 MASTER' : ''}</div>
          ${suspendido ? `<p style="color:var(--danger); font-size:12px;">Motivo: ${u.motivo_suspension}</p>` : ''}
          <div class="acciones-card">
            ${btnAccion}
          </div>
        </div>
      `;
    }).join('') || '<p>No hay usuarios registrados.</p>';
  } catch (error) { 
    console.error("Error al cargar usuarios (posible 403 por RLS):", error);
    contenedor.innerHTML = '<p style="color:var(--danger)">No se pudieron cargar los usuarios. Verifica las políticas RLS en Supabase.</p>';
  }
}

window.suspenderUsuario = async function(id) {
  const motivo = prompt("Ingresa el motivo de la suspensión (el usuario lo verá):");
  if (!motivo) return alert("Debes dar un motivo.");

  const { error } = await supabase.from('usuarios').update({ estado_cuenta: 'suspendido', motivo_suspension: motivo }).eq('id', id);
  if (error) alert("Error: " + error.message);
  else cargarUsuarios();
}

window.reactivarUsuario = async function(id) {
  const { error } = await supabase.from('usuarios').update({ estado_cuenta: 'activo', motivo_suspension: null }).eq('id', id);
  if (error) alert("Error: " + error.message);
  else cargarUsuarios();
}

// =====================================================================
// SECCIÓN E: DESCARGAR RESPALDO CSV
// =====================================================================
window.descargarRespaldoCSV = function() {
  if (datosGlobales.trabajos.length === 0 && datosGlobales.avisos.length === 0) {
    return alert("No hay datos para descargar.");
  }

  let csvContent = "\uFEFFTIPO,TITULO,DESCRIPCION/MENSAJE,FECHA,FOTOS\n";
  
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

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `respaldo_admin_${new Date().toISOString().split('T')[0]}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- INICIO ---
verificarAcceso();