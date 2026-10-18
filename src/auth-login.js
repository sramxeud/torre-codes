import { supabase } from './lib/supabase.js';
import { qs } from './lib/ui.js';

const form = qs('#login-form');
const msg = qs('#msg');
const btn = qs('#btn-login');

(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) redirigirSegunRol(data.session.user.id);
})();

async function redirigirSegunRol(userId) {
  const { data, error } = await supabase
    .from('usuario_roles')
    .select('roles(nombre)')
    .eq('usuario_id', userId);

  if (error || !data || data.length === 0) {
    alert("No tienes roles asignados en la base de datos.");
    return;
  }

  // EL FILTRO BLINDADO: Ignora si viene null
  const roles = data
    .map(r => r.roles ? r.roles.nombre : null)
    .filter(nombre => nombre !== null);

  if (roles.length === 0) {
    alert("Error: El rol existe pero los permisos de la tabla 'roles' están bloqueados.");
    return;
  }

  if (roles.includes('administrador')) {
    window.location.href = '/admin.html';
  } else if (roles.includes('conserje')) {
    window.location.href = '/conserje.html';
  } else if (roles.includes('presidente') || roles.includes('tesorero') || roles.includes('secretario')) {
    window.location.href = '/directiva.html';
  } else {
    window.location.href = '/copropietario.html';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  btn.disabled = true;
  btn.textContent = 'Entrando...';
  
  const email = qs('#email').value.trim();
  const password = qs('#password').value;
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    msg.hidden = false;
    msg.textContent = error.message;
    msg.className = 'error-msg';
    btn.disabled = false;
    btn.textContent = 'Entrar';
    return;
  }
  
  redirigirSegunRol(data.user.id);
});
