import { supabase } from '../lib/supabase.js';

let usuarioActual = null;
let misBienes = [];
const TARIFA_M2 = 4.49;

// --- 1. INICIALIZACIÓN ---
async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = '/index.html';
    return;
  }

  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('panel-copropietario').style.display = 'block';
  document.getElementById('user-email').innerText = user.email;

  // Obtener datos del perfil (para ver si está suspendido o es master)
  const { data: perfil } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
  usuarioActual = { ...user, ...perfil };

  // Verificar suspensión
  if (usuarioActual.estado_cuenta === 'suspendido') {
    document.getElementById('alerta-suspension').style.display = 'block';
    document.getElementById('motivo-suspension-texto').innerText = usuarioActual.motivo_suspension || 'Contacte al administrador.';
    document.getElementById('seccion-pagos').style.display = 'none'; // Bloquear pagos
  }

  await cargarBienes();
  await cargarHistorial();
  generarMesesParaPago();
}

// --- 2. CERRAR SESIÓN ---
document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
});

// --- 3. CARGAR BIENES ---
async function cargarBienes() {
  const contenedor = document.getElementById('lista-bienes');
  const selectPago = document.getElementById('pago-bien-id');
  
  try {
    let query = supabase.from('bienes').select('*');
    
    // Si NO es master, solo ve sus bienes. Si es master, ve TODOS.
    if (!usuarioActual.es_master) {
      query = query.eq('usuario_id', usuarioActual.id);
    }
    
    const { data: bienes, error } = await query;
    if (error) throw error;

    misBienes = bienes || [];
    contenedor.innerHTML = '';
    selectPago.innerHTML = '<option value="">Selecciona un bien...</option>';

    if (misBienes.length === 0 && !usuarioActual.es_master) {
      contenedor.innerHTML = '<p>No tienes bienes registrados. Agrega uno abajo.</p>';
      return;
    }

    let hayAprobados = false;

    misBienes.forEach(bien => {
      // Renderizar en la lista
      let estadoBadge = '';
      if (bien.estado_validacion === 'aprobado') { estadoBadge = '<span style="color:var(--success)">✅ Aprobado</span>'; hayAprobados = true; }
      else if (bien.estado_validacion === 'rechazado') { estadoBadge = '<span style="color:var(--danger)">❌ Rechazado</span>'; }
      else { estadoBadge = '<span style="color:var(--warning)">⏳ Pendiente</span>'; }

      const montoBase = (bien.superficie_m2 * TARIFA_M2).toFixed(2);
      const montoFinal = bien.monto_especial ? bien.monto_especial : montoBase;
      const razon = bien.razon_monto_especial ? `<br><small style="color:var(--warning)">Nota Admin: ${bien.razon_monto_especial}</small>` : '';

      contenedor.innerHTML += `
        <div style="padding: 10px; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 10px;">
          <b>${bien.tipo.toUpperCase()} ${bien.identificador}</b> - ${bien.superficie_m2} m² <br>
          Monto a pagar: <b>Bs. ${montoFinal}</b> ${razon} <br>
          Estado: ${estadoBadge}
        </div>
      `;

      // Llenar el select de pagos (solo los aprobados)
      if (bien.estado_validacion === 'aprobado') {
        selectPago.innerHTML += `<option value="${bien.id}">${bien.tipo} ${bien.identificador} (Bs. ${montoFinal})</option>`;
      }
    });

    // Mostrar el formulario de pagos si tiene al menos un bien aprobado y no está suspendido
    if (hayAprobados && usuarioActual.estado_cuenta !== 'suspendido') {
      document.getElementById('seccion-pagos').style.display = 'block';
    }

    // Ocultar el formulario de agregar bien si ya tiene bienes (opcional, depende de tu regla)
    // document.getElementById('seccion-agregar-bien').style.display = 'none';

  } catch (error) {
    console.error("Error al cargar bienes:", error);
  }
}

// --- 4. REGISTRAR NUEVO BIEN ---
document.getElementById('form-bien').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true; btn.innerText = "Subiendo...";

  const tipo = document.getElementById('bien-tipo').value;
  const identificador = document.getElementById('bien-identificador').value;
  const superficie = parseFloat(document.getElementById('bien-superficie').value);
  const foto = document.getElementById('bien-foto').files[0];

  try {
    // 1. Subir foto
    const nombreArchivo = `docs_${Date.now()}-${foto.name}`;
    const { error: uploadError } = await supabase.storage.from('evidencias').upload(nombreArchivo, foto);
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(nombreArchivo);

    // 2. Insertar Bien
    const { error: insertError } = await supabase.from('bienes').insert([{
      usuario_id: usuarioActual.id,
      tipo: tipo,
      identificador: identificador,
      superficie_m2: superficie,
      foto_documento_url: publicUrl,
      estado_validacion: 'pendiente'
    }]);

    if (insertError) throw insertError;

    alert("Bien registrado. Espera la aprobación del administrador.");
    e.target.reset();
    await cargarBienes(); // Recargar la lista

  } catch (error) {
    console.error(error);
    alert("Error al registrar bien: " + error.message);
  } finally {
    btn.disabled = false; btn.innerText = "Enviar a Validación";
  }
});

// --- 5. SUBIR COMPROBANTE DE PAGO ---
document.getElementById('form-pago').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true; btn.innerText = "Enviando...";

  const bienId = document.getElementById('pago-bien-id').value;
  const mesesSelect = document.getElementById('pago-meses');
  const mesesPagados = Array.from(mesesSelect.selectedOptions).map(opt => opt.value);
  const depositante = document.getElementById('pago-depositante').value;
  const monto = parseFloat(document.getElementById('pago-monto').value);
  const foto = document.getElementById('pago-foto').files[0];

  if (mesesPagados.length === 0) {
    alert("Selecciona al menos un mes."); btn.disabled = false; btn.innerText = "Enviar Comprobante"; return;
  }

  try {
    // 1. Subir foto
    const nombreArchivo = `pagos_${Date.now()}-${foto.name}`;
    const { error: uploadError } = await supabase.storage.from('evidencias').upload(nombreArchivo, foto);
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(nombreArchivo);

    // 2. Insertar Pago
    const { error: insertError } = await supabase.from('pagos').insert([{
      usuario_id: usuarioActual.id, // El que sube el pago (aunque sea master)
      bien_id: bienId,
      fecha_deposito: new Date().toISOString().split('T')[0],
      nombre_depositante: depositante,
      monto_total: monto,
      meses_pagados: mesesPagados, // Se guarda como JSON array
      foto_comprobante_url: publicUrl,
      estado: 'pendiente'
    }]);

    if (insertError) throw insertError;

    alert("Comprobante enviado. Espera la validación del administrador.");
    e.target.reset();
    generarMesesParaPago(); // Resetear meses

  } catch (error) {
    console.error(error);
    alert("Error al enviar pago: " + error.message);
  } finally {
    btn.disabled = false; btn.innerText = "Enviar Comprobante";
  }
});

// --- 6. GENERAR MESES (Últimos 3) ---
function generarMesesParaPago() {
  const select = document.getElementById('pago-meses');
  select.innerHTML = '';
  
  const hoy = new Date();
  const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  // Generamos los últimos 3 meses
  for (let i = 0; i < 3; i++) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const valor = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    const texto = `${nombresMeses[fecha.getMonth()]} ${fecha.getFullYear()}`;
    
    const option = document.createElement('option');
    option.value = valor;
    option.innerText = texto;
    select.appendChild(option);
  }
}

// --- 7. CARGAR HISTORIAL ---
async function cargarHistorial() {
  const tbody = document.getElementById('tabla-historial');
  
  try {
    // Si es master, ve todo. Si no, solo lo suyo.
    let query = supabase.from('historial_pagos').select(`
      *,
      bienes ( identificador, tipo )
    `);

    if (!usuarioActual.es_master) {
      // Necesitamos los IDs de sus bienes para filtrar
      const idsBienes = misBienes.map(b => b.id);
      if (idsBienes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No hay historial.</td></tr>';
        return;
      }
      query = query.in('bien_id', idsBienes);
    }

    const { data: historial, error } = await query.order('anio', { ascending: false }).order('mes', { ascending: false });
    if (error) throw error;

    tbody.innerHTML = '';
    if (historial.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No hay historial de pagos aprobados.</td></tr>';
      return;
    }

    const nombresMeses = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    historial.forEach(h => {
      const clase = h.estado === 'pagado' ? 'pagado' : 'deuda';
      const bienTexto = h.bienes ? `${h.bienes.tipo} ${h.bienes.identificador}` : 'Desconocido';
      tbody.innerHTML += `
        <tr>
          <td>${bienTexto}</td>
          <td>${h.anio}</td>
          <td>${nombresMeses[h.mes]}</td>
          <td class="${clase}">${h.estado.toUpperCase()}</td>
          <td>${h.monto_pagado ? 'Bs. ' + h.monto_pagado : '-'}</td>
        </tr>
      `;
    });

  } catch (error) {
    console.error("Error al cargar historial:", error);
  }
}

// --- INICIO ---
init();