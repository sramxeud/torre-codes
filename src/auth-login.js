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

// Si ya hay sesión, redirige
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    const roles = await getUserRoles();
    window.location.href = rutaPorRol(roles);
  }
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('');
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  const email = qs('#email').value.trim();
  const password = qs('#password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      setMsg('Debes confirmar tu correo. Revisa tu bandeja de entrada.');
    } else if (error.message.toLowerCase().includes('invalid login')) {
      setMsg('Correo o contraseña incorrectos.');
    } else {
      setMsg(error.message);
    }
    btn.disabled = false;
    btn.textContent = 'Entrar';
    return;
  }

  const roles = await getUserRoles();
  window.location.href = rutaPorRol(roles);
});