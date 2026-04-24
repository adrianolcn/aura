"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProtectedPath = isProtectedPath;
exports.resolveSessionRedirect = resolveSessionRedirect;
const protectedPrefixes = [
    '/',
    '/dashboard',
    '/clients',
    '/agenda',
    '/budgets',
    '/contracts',
    '/automations',
];
function isProtectedPath(pathname) {
    return protectedPrefixes.some((prefix) => prefix === '/' ? pathname === '/' : pathname.startsWith(prefix));
}
function resolveSessionRedirect(pathname, hasUser) {
    if (!hasUser && isProtectedPath(pathname)) {
        return '/login';
    }
    if (hasUser && pathname === '/login') {
        return '/dashboard';
    }
    return null;
}
