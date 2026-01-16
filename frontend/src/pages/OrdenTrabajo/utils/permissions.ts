// Centralized permissions for OrdenTrabajo actions
type Opts = { isAdmin?: boolean };

const ACTIONS: Record<string, string[]> = {
  create_trabajo: ['pendiente', 'en_proceso'],
  edit_trabajo: ['pendiente', 'en_proceso'],
  delete_trabajo: ['pendiente'],
  // other action keys can be added here
};

export function canPerformAction(entityState: string | undefined | null, actionKey: string, opts?: Opts): boolean {
  if (opts?.isAdmin) return true;
  const state = (entityState || '').toString().toLowerCase();
  const allowed = ACTIONS[actionKey] || [];
  return allowed.includes(state);
}

export default canPerformAction;
