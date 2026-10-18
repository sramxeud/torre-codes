export function toast(msg, type = 'info', ms = 3500) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }
  
  export function qs(sel, root = document) { return root.querySelector(sel); }
  export function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }