import { supabase } from './supabase.js';

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUserRoles() {
  const session = await getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('usuario_roles')
    .select('roles(nombre)')
    .eq('usuario_id', session.user.id);

  if (error) { 
    console.error('Error al leer roles:', error); 
    return []; 
  }
  
  if (!data || data.length === 0) return [];
  return data.map(r => r.roles.nombre);
}

export async function getUsuario() {
  const session = await getSession();
  if (!session) return null;
  const { data } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', session.user.id)
    .single();
  return data;
}

export async function requireRole(allowedRoles) {
  // Esperamos 1 segundo para que Supabase asiente la sesión
  await new Promise(resolve => setTimeout(resolve, 1000));

  const session = await getSession();
  if (!session) {
    window.location.href = '/index.html';
    throw new Error('No session');
  }

  const roles = await getUserRoles();

  if (allowedRoles && allowedRoles.length > 0) {
    const ok = roles.some(r => allowedRoles.includes(r));
    if (!ok) {
      // Si no tiene el rol, mostramos alerta y lo mandamos al login
      alert('No tienes permisos para esta página. Tus roles son: ' + (roles.join(', ') || 'ninguno'));
      window.location.href = '/index.html';
      throw new Error('Rol no autorizado');
    }
  }
  return { session, roles };
}

export function rutaPorRol(roles) {
  if (roles.includes('administrador')) return '/admin.html';
  if (roles.includes('presidente') || roles.includes('vicepresidente') ||
      roles.includes('tesorero') || roles.includes('secretario')) return '/directiva.html';
  if (roles.includes('conserje')) return '/conserje.html';
  if (roles.includes('copropietario') || roles.includes('inquilino')) return '/copropietario.html';
  return '/index.html';
}
