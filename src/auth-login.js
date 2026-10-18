import { supabase } from './lib/supabase.js';
import { qs } from './lib/ui.js';

const form = qs('#login-form');
const msg = qs('#msg');
const btn = qs('#btn-login');

// 1. Si el usuario ya inició sesión antes, lo mandamos directo a su panel
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    redirigirSegunRol(data.session.user.id);
  }
})();

// 2. Función que lee la tabla y decide a dónde ir
async function redirigirSegunRol(userId) {
  const { data, error } = await supabase
    .from('usuario_roles')
    .select('roles(nombre)')
    .eq('usuario_id', userId);

  if (error || !data || data.length === 0) {
    alert("No tienes roles asignados en la base de datos.");
    return;
  }

  const roles = data.map(r => r.roles.nombre);

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

// 3. Cuando el usuario hace clic en "Entrar"
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

  // Si el login es exitoso, leemos sus roles y redirigimos
  redirigirSegunRol(data.user.id);
});
