import { supabase } from '../lib/supabase.js';

// 1. Lógica para las pestañas (Tabs)
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const targetId = btn.getAttribute('data-target');
    document.getElementById(targetId).classList.add('active');
  });
});

// 2. Datos de los conserjes y sus turnos
const TURNOS = {
  1: { nombre: 'Milton Medina', telefono: '62397180', foto: '/milton.jpg' },    // Lunes
  2: { nombre: 'Cesar Guinea', telefono: '79791936', foto: '/cesar.jpg' },      // Martes
  3: { nombre: 'Milton Medina', telefono: '62397180', foto: '/milton.jpg' },    // Miércoles
  4: { nombre: 'Cesar Guinea', telefono: '79791936', foto: '/cesar.jpg' },      // Jueves
  5: { nombre: 'Esteban Alberto', telefono: '69713524', foto: '/esteban.jpg' }, // Viernes
  6: { nombre: 'Milton Medina', telefono: '62397180', foto: '/milton.jpg' },    // Sábado
  0: { nombre: 'Esteban Alberto', telefono: '69713524', foto: '/esteban.jpg' }  // Domingo
};

function cargarConserjeHoy() {
  const contenedor = document.getElementById('conserje-hoy');
  
  // LÓGICA DEL HORARIO (8:15 am a 8:15 am del día siguiente)
  const ahora = new Date();
  
  // Restamos 8 horas y 15 minutos a la hora actual.
  // Si son las 7:00 am del Martes, al restarle 8h 15m, el reloj dirá Lunes 10:45 pm (y tomará al conserje del Lunes).
  // Si son las 9:00 am del Martes, al restarle 8h 15m, el reloj dirá Martes 12:45 am (y tomará al conserje del Martes).
  const horaAjustada = new Date(ahora.getTime() - (8 * 60 + 15) * 60 * 1000);
  
  // Obtenemos el día de la semana ajustado (0 = Domingo, 1 = Lunes...)
  const diaTurno = horaAjustada.getDay(); 
  const turnoHoy = TURNOS[diaTurno];

  if (turnoHoy) {
    contenedor.innerHTML = `
      <img src="${turnoHoy.foto}" alt="Foto de ${turnoHoy.nombre}" onerror="this.src='https://ui-avatars.com/api/?name=${turnoHoy.nombre}&background=3b82f6&color=fff&size=120'" />
      <div class="conserje-info">
        <h2>${turnoHoy.nombre}</h2>
        <p style="margin-bottom: 0.5rem;">Conserje a cargo</p>
        <p style="font-size: 1rem; color: #94a3b8;">
          📞 <a href="tel:${turnoHoy.telefono}" style="color: #3b82f6; text-decoration: none;">${turnoHoy.telefono}</a>
        </p>
        <p style="font-size: 0.85rem; color: #64748b; margin-top: 1rem;">
          * Turno válido hasta mañana a las 8:15 am
        </p>
      </div>
    `;
  } else {
    contenedor.innerHTML = `<p>No hay conserje asignado para hoy.</p>`;
  }
}

// 3. Cerrar sesión
document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
});

// Ejecutar al cargar la página
cargarConserjeHoy();