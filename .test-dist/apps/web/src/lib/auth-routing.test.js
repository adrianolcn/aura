"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGroup = void 0;
const strict_1 = __importDefault(require("node:assert/strict"));
const auth_routing_1 = require("./auth-routing");
exports.testGroup = {
    name: 'auth routing',
    cases: [
        {
            name: 'marks workspace routes as protected',
            run: () => {
                strict_1.default.equal((0, auth_routing_1.isProtectedPath)('/'), true);
                strict_1.default.equal((0, auth_routing_1.isProtectedPath)('/clients/123'), true);
                strict_1.default.equal((0, auth_routing_1.isProtectedPath)('/login'), false);
            },
        },
        {
            name: 'redirects unauthenticated users to login',
            run: () => {
                strict_1.default.equal((0, auth_routing_1.resolveSessionRedirect)('/clients', false), '/login');
                strict_1.default.equal((0, auth_routing_1.resolveSessionRedirect)('/agenda', false), '/login');
            },
        },
        {
            name: 'redirects authenticated users away from login',
            run: () => {
                strict_1.default.equal((0, auth_routing_1.resolveSessionRedirect)('/login', true), '/dashboard');
            },
        },
        {
            name: 'keeps public routes unchanged when no redirect is needed',
            run: () => {
                strict_1.default.equal((0, auth_routing_1.resolveSessionRedirect)('/login', false), null);
                strict_1.default.equal((0, auth_routing_1.resolveSessionRedirect)('/dashboard', true), null);
            },
        },
    ],
};
