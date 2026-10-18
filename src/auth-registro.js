import { supabase } from './lib/supabase.js';
import { qs } from './lib/ui.js';

const form = qs('#registro-form');
const msg = qs('#msg');
const btn = qs('#btn-reg');

function setMsg(text, type = 'error') {
  msg.hidden = !text;
  msg.textContent = text;
  msg.className = type === 'error' ? 'error-msg' : 'success-msg';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('');
  btn.disabled = true;
  btn.textContent = 'Creando...';

  const nombres = qs('#nombres').value.trim();
  const apellidos = qs('#apellidos').value.trim();
  const telefono = qs('#telefono').value.trim();
  const email = qs('#email').value.trim();
  const password = qs('#password').value;
  const rol = qs('#rol').value;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombres, apellidos, telefono, rol_inicial: rol },
      emailRedirectTo: `${window.location.origin}/index.html`
    }
  });

  if (error) {
    setMsg(error.message);
    btn.disabled = false;
    btn.textContent = 'Registrarme';
    return;
  }

  setMsg('Cuenta creada. Revisa tu correo y confirma tu cuenta antes de ingresar.', 'success');
  form.reset();
  btn.textContent = 'Registrarme';
  btn.disabled = false;
});