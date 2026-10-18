import { requireRole, getUsuario } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

(async () => {
  try {
    // Verifica que tengas el rol de administrador (espera 1 seg internamente)
    const { roles } = await requireRole(['administrador']);
    const u = await getUsuario();
    
    // Si todo sale bien, pinta la pantalla de admin
    const container = document.querySelector('.auth-container');
    if (container) {
      container.innerHTML = `
        <h1>Panel administrador</h1>
        <p>Bienvenido, <strong>${u?.nombres || 'Administrador'}</strong></p>
        <p style="color:#94a3b8; font-size:0.9rem;">Rol verificado: ${roles.join(', ')}</p>
        <button id="logout" style="margin-top:1rem; background:#ef4444;">Cerrar sesión</button>
      `;
    }
  } catch (err) {
    console.error("Error al cargar el panel de admin:", err);
  }
})();

// Botón de cerrar sesión
document.addEventListener('click', async (e) => {
  if (e.target.id === 'logout') {
    await supabase.auth.signOut();
    window.location.href = '/index.html';
  }
});
