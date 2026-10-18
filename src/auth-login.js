import { supabase } from './lib/supabase.js';
import { getUserRoles, rutaPorRol } from './lib/auth.js';
import { qs } from './lib/ui.js';

const form = qs('#login-form');
const msg = qs('#msg');
const btn = qs('#btn-login');

function setMsg(text, type = 'error') {
  msg.hidden = !text;
  msg.textContent = text;
  msg.className = type === 'error' ? 'error-msg' : 'success-msg';
}

// 1. Si ya hay sesión (el usuario ya estaba logueado), lo redirigimos a su panel
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    const roles = await getUserRoles();
    window.location.href = rutaPorRol(roles);
  }
})();

// 2. Cuando el usuario hace clic en "Entrar"
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('');
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  const email = qs('#email').value.trim();
  const password = qs('#password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setMsg(error.message);
    btn.disabled = false;
    btn.textContent = 'Entrar';
    return;
  }

  // Esperamos 500ms a que la sesión se guarde y redirigimos
  await new Promise(resolve => setTimeout(resolve, 500));
  const roles = await getUserRoles();
  window.location.href = rutaPorRol(roles);
});
