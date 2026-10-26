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

  const { data: perfil } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
  usuarioActual = { ...user, ...perfil };

  if (usuarioActual.estado_cuenta === 'suspendido') {
    document.getElementById('alerta-suspension').style.display = 'block';
    document.getElementById('motivo-suspension-texto').innerText = usuarioActual.motivo_suspension || 'Contacte al administrador.';
    document.getElementById('seccion-pagos').style.display = 'none'; 
  }

  await cargarBienes();
  await cargarHistorial();
  generarMesesParaPago();
  configurarBotonSeleccionarTodo();
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
    if (!usuarioActual.es_master) query = query.eq('usuario_id', usuarioActual.id);
    
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

      if (bien.estado_validacion === 'aprobado') {
        selectPago.innerHTML += `<option value="${bien.id}">${bien.tipo} ${bien.identificador} (Bs. ${montoFinal})</option>`;
      }
    });

    if (hayAprobados && usuarioActual.estado_cuenta !== 'suspendido') {
      document.getElementById('seccion-pagos').style.display = 'block';
    }

  } catch (error) { console.error("Error al cargar bienes:", error); }
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
    const nombreArchivo = `docs_${Date.now()}-${foto.name}`;
    const { error: uploadError } = await supabase.storage.from('evidencias').upload(nombreArchivo, foto);
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(nombreArchivo);

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
    await cargarBienes(); 

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
  const checkboxesSeleccionados = document.querySelectorAll('.mes-checkbox:checked');
  const mesesPagados = Array.from(checkboxesSeleccionados).map(cb => cb.value);
  
  const depositante = document.getElementById('pago-depositante').value;
  const monto = parseFloat(document.getElementById('pago-monto').value);
  const foto = document.getElementById('pago-foto').files[0];

  if (mesesPagados.length === 0) {
    alert("Selecciona al menos un mes."); 
    btn.disabled = false; btn.innerText = "Enviar Comprobante"; 
    return;
  }

  try {
    const nombreArchivo = `pagos_${Date.now()}-${foto.name}`;
    const { error: uploadError } = await supabase.storage.from('evidencias').upload(nombreArchivo, foto);
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(nombreArchivo);

    const { error: insertError } = await supabase.from('pagos').insert([{
      usuario_id: usuarioActual.id, 
      bien_id: bienId,
      fecha_deposito: new Date().toISOString().split('T')[0],
      nombre_depositante: depositante,
      monto_total: monto,
      meses_pagados: mesesPagados, 
      foto_comprobante_url: publicUrl,
      estado: 'pendiente'
    }]);

    if (insertError) throw insertError;

    alert("Comprobante enviado. Espera la validación del administrador.");
    e.target.reset();
    
    // Desmarcar y actualizar contador
    checkboxesSeleccionados.forEach(cb => cb.checked = false);
    actualizarContadorMeses();

  } catch (error) {
    console.error(error);
    alert("Error al enviar pago: " + error.message);
  } finally {
    btn.disabled = false; btn.innerText = "Enviar Comprobante";
  }
});

// --- 6. GENERAR MESES (Todo el año actual) ---
function generarMesesParaPago() {
  const container = document.getElementById('pago-meses-container');
  if (!container) return;
  container.innerHTML = '';
  
  const anioActual = new Date().getFullYear();
  const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  nombresMeses.forEach((mes, index) => {
    const mesNumero = String(index + 1).padStart(2, '0');
    const valor = `${anioActual}-${mesNumero}`;

    const label = document.createElement('label');
    label.className = 'mes-label';
    label.innerHTML = `
      <input type="checkbox" class="mes-checkbox" value="${valor}" onchange="actualizarContadorMeses()">
      ${mes} ${anioActual}
    `;
    container.appendChild(label);
  });
}

// --- 7. LÓGICA DEL CONTADOR Y SELECCIONAR TODO ---
window.actualizarContadorMeses = function() {
  const total = document.querySelectorAll('.mes-checkbox:checked').length;
  document.getElementById('contador-meses').innerText = `${total} mes(es) seleccionado(s)`;
  
  const btn = document.getElementById('btn-toggle-meses');
  const todos = document.querySelectorAll('.mes-checkbox').length;
  btn.innerText = (total === todos) ? "Desmarcar Todo" : "Seleccionar Todo";
}

function configurarBotonSeleccionarTodo() {
  document.getElementById('btn-toggle-meses').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.mes-checkbox');
    const todosSeleccionados = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => cb.checked = !todosSeleccionados);
    actualizarContadorMeses();
  });
}

// --- 8. CARGAR HISTORIAL ---
async function cargarHistorial() {
  const tbody = document.getElementById('tabla-historial');
  
  try {
    let query = supabase.from('historial_pagos').select(`
      *,
      bienes ( identificador, tipo )
    `);

    if (!usuarioActual.es_master) {
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

  } catch (error) { console.error("Error al cargar historial:", error); }
}

// --- INICIO ---
init();