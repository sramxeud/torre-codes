import { requireRole, getUsuario } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';
import { qs } from '../lib/ui.js';

(async () => {
  const { roles } = await requireRole(['administrador']);
  const u = await getUsuario();
  console.log('Admin:', u, roles);
})();

document.addEventListener('click', async (e) => {
  if (e.target.id === 'logout') {
    await supabase.auth.signOut();
    window.location.href = '/index.html';
  }
});