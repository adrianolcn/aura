"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGroup = void 0;
const strict_1 = __importDefault(require("node:assert/strict"));
const index_1 = require("./index");
exports.testGroup = {
    name: 'shared schemas',
    cases: [
        {
            name: 'normalizes optional client fields and coerces priority score',
            run: () => {
                const parsed = index_1.clientInputSchema.parse({
                    fullName: 'Ana Costa',
                    phone: '71999990000',
                    email: '',
                    priorityScore: '78',
                });
                strict_1.default.equal(parsed.email, undefined);
                strict_1.default.equal(parsed.priorityScore, 78);
                strict_1.default.equal(parsed.lifecycleStage, 'lead');
            },
        },
        {
            name: 'rejects appointments when end is before start',
            run: () => {
                strict_1.default.throws(() => index_1.appointmentInputSchema.parse({
                    clientId: '7e137864-23f4-4a38-8a56-9a4595bf2294',
                    title: 'Teste',
                    appointmentType: 'trial',
                    status: 'scheduled',
                    startsAt: '2026-04-23T12:00:00.000Z',
                    endsAt: '2026-04-23T11:00:00.000Z',
                }), /posterior/);
            },
        },
        {
            name: 'keeps budget defaults and requires at least one item',
            run: () => {
                const parsed = index_1.budgetInputSchema.parse({
                    clientId: '7e137864-23f4-4a38-8a56-9a4595bf2294',
                    eventId: '6500fadc-60c2-4c7f-b602-795f2d7258f4',
                    items: [
                        {
                            description: 'Pacote social',
                            quantity: '2',
                            unitPrice: '150',
                        },
                    ],
                });
                strict_1.default.equal(parsed.status, 'draft');
                strict_1.default.equal(parsed.currency, 'BRL');
                strict_1.default.equal(parsed.items[0].quantity, 2);
                strict_1.default.equal(parsed.items[0].unitPrice, 150);
            },
        },
        {
            name: 'applies query defaults for clients and budgets',
            run: () => {
                const clientsQuery = index_1.clientsQuerySchema.parse({});
                const budgetsQuery = index_1.budgetsQuerySchema.parse({});
                strict_1.default.equal(clientsQuery.orderBy, 'updatedAt');
                strict_1.default.equal(clientsQuery.orderDirection, 'desc');
                strict_1.default.equal(budgetsQuery.orderBy, 'createdAt');
                strict_1.default.equal(budgetsQuery.orderDirection, 'desc');
            },
        },
        {
            name: 'requires event linkage for contract creation',
            run: () => {
                const parsed = index_1.contractInputSchema.parse({
                    clientId: '7e137864-23f4-4a38-8a56-9a4595bf2294',
                    eventId: '6500fadc-60c2-4c7f-b602-795f2d7258f4',
                });
                strict_1.default.equal(parsed.status, 'uploaded');
            },
        },
        {
            name: 'validates opt-in input and normalizes manual channel defaults',
            run: () => {
                const parsed = index_1.communicationOptInInputSchema.parse({
                    clientId: '7e137864-23f4-4a38-8a56-9a4595bf2294',
                    status: 'opted_in',
                });
                strict_1.default.equal(parsed.channel, 'whatsapp');
                strict_1.default.equal(parsed.source, 'manual');
            },
        },
        {
            name: 'requires body or template when sending a message',
            run: () => {
                strict_1.default.throws(() => index_1.messageSendInputSchema.parse({
                    clientId: '7e137864-23f4-4a38-8a56-9a4595bf2294',
                }), /texto de resposta|template/i);
            },
        },
    ],
};
