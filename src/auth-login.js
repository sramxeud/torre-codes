import { supabase } from './lib/supabase.js';
import { qs } from './lib/ui.js';

const form = qs('#login-form');
const msg = qs('#msg');
const btn = qs('#btn-login');

function setMsg(text, type = 'error') {
  msg.hidden = !text;
  msg.textContent = text;
  msg.className = type === 'error' ? 'error-msg' : 'success-msg';
}

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

  // Redirección forzada al panel de admin
  window.location.href = '/admin.html'; 
});
