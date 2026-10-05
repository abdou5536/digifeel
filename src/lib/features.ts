/**
 * Pages encore branchées sur le stockage navigateur (localStorage) : jamais exposées en production
 * tant qu'elles ne sont pas migrées vers Supabase. L'environnement de production échoue fermé.
 */
export function isLocalWorkspaceEnabled(
  environment = process.env.NODE_ENV,
  localWorkspaceFlag = process.env.ENABLE_LOCAL_WORKSPACE
): boolean {
  if (environment === 'production') return false;
  return localWorkspaceFlag !== '0';
}