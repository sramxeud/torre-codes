import { supabase } from '../lib/supabase.js';

// 1. Lógica para las pestañas (Tabs)
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    
    // Quitar 'active' de todos
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Poner 'active' al clickeado
    btn.classList.add('active');
    const targetId = btn.getAttribute('data-target');
    document.getElementById(targetId).classList.add('active');
  });
});

// 2. Lógica del Conserje de Turno
const TURNOS = {
  1: { nombre: 'Milton Medina', foto: '/milton.jpg' },    // Lunes
  2: { nombre: 'Cesar Guinea', foto: '/cesar.jpg' },      // Martes
  3: { nombre: 'Milton Medina', foto: '/milton.jpg' },    // Miércoles
  4: { nombre: 'Cesar Guinea', foto: '/cesar.jpg' },      // Jueves
  5: { nombre: 'Esteban Alberto', foto: '/esteban.jpg' }, // Viernes
  6: { nombre: 'Milton Medina', foto: '/milton.jpg' },    // Sábado
  0: { nombre: 'Esteban Alberto', foto: '/esteban.jpg' }  // Domingo
};

function cargarConserjeHoy() {
  const contenedor = document.getElementById('conserje-hoy');
  
  // Obtenemos el día de la semana (0 = Domingo, 1 = Lunes...)
  const hoy = new Date().getDay(); 
  const turnoHoy = TURNOS[hoy];

  if (turnoHoy) {
    contenedor.innerHTML = `
      <img src="${turnoHoy.foto}" alt="Foto de ${turnoHoy.nombre}" onerror="this.src='https://ui-avatars.com/api/?name=${turnoHoy.nombre}&background=3b82f6&color=fff&size=120'" />
      <div class="conserje-info">
        <h2>${turnoHoy.nombre}</h2>
        <p>Conserje a cargo hoy</p>
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