import { supabase } from './lib/supabase.js';
import { qs } from './lib/ui.js';

const form = qs('#reset-form');
const msg = qs('#msg');
const btn = qs('#btn-reset');

// Supabase pone la sesión de recovery al cargar el link
(async () => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    msg.hidden = false;
    msg.textContent = 'Enlace inválido o expirado. Solicita uno nuevo.';
    msg.className = 'error-msg';
    btn.disabled = true;
  }
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  btn.disabled = true;

  const password = qs('#password').value;
  const { error } = await supabase.auth.updateUser({ password });

  msg.hidden = false;
  if (error) {
    msg.textContent = error.message;
    msg.className = 'error-msg';
    btn.disabled = false;
  } else {
    msg.textContent = 'Contraseña actualizada. Redirigiendo...';
    msg.className = 'success-msg';
    setTimeout(() => window.location.href = '/index.html', 1500);
  }
});