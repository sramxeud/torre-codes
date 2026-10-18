import { supabase } from './lib/supabase.js';
import { qs } from './lib/ui.js';

const form = qs('#forgot-form');
const msg = qs('#msg');
const btn = qs('#btn-forgot');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.hidden = true;
  btn.disabled = true;

  const email = qs('#email').value.trim();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password.html`
  });

  btn.disabled = false;
  msg.hidden = false;
  if (error) {
    msg.textContent = error.message;
    msg.className = 'error-msg';
  } else {
    msg.textContent = 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.';
    msg.className = 'success-msg';
    form.reset();
  }
});