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

// Si ya hay sesión, redirige al destino correcto
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    console.log("Sesión existente detectada, redirigiendo...");
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

  console.log("Intentando iniciar sesión con:", email);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Error de Supabase Auth:", error);
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

  console.log("Login exitoso. Sesión creada:", data.session.user.id);

  // Damos un pequeño respiro para que la sesión se guarde bien en el navegador
  await new Promise(resolve => setTimeout(resolve, 800));

  console.log("Obteniendo roles del usuario...");
  const roles = await getUserRoles();
  console.log("Roles obtenidos:", roles);

  const destino = rutaPorRol(roles);
  console.log("Redirigiendo a:", destino);

  setMsg('Entrando...', 'success');
  window.location.href = destino;
});
