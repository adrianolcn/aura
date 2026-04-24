const protectedPrefixes = [
  '/',
  '/dashboard',
  '/clients',
  '/agenda',
  '/budgets',
  '/contracts',
  '/automations',
] as const;

export function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) =>
    prefix === '/' ? pathname === '/' : pathname.startsWith(prefix),
  );
}

export function resolveSessionRedirect(pathname: string, hasUser: boolean) {
  if (!hasUser && isProtectedPath(pathname)) {
    return '/login';
  }

  if (hasUser && pathname === '/login') {
    return '/dashboard';
  }

  return null;
}
