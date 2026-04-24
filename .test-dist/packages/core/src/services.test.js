"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGroup = void 0;
const strict_1 = __importDefault(require("node:assert/strict"));
const services_1 = require("./services");
exports.testGroup = {
    name: 'service helpers',
    cases: [
        {
            name: 'calculates budget totals from items and discount',
            run: () => {
                const input = {
                    clientId: '7e137864-23f4-4a38-8a56-9a4595bf2294',
                    eventId: '6500fadc-60c2-4c7f-b602-795f2d7258f4',
                    status: 'draft',
                    currency: 'BRL',
                    discountAmount: 50,
                    validUntil: undefined,
                    items: [
                        {
                            description: 'Noiva',
                            quantity: 1,
                            unitPrice: 600,
                        },
                        {
                            description: 'Mãe',
                            quantity: 2,
                            unitPrice: 180,
                        },
                    ],
                };
                strict_1.default.deepEqual((0, services_1.calculateBudgetTotals)(input), {
                    subtotal: 960,
                    discountAmount: 50,
                    totalAmount: 910,
                });
            },
        },
        {
            name: 'builds a descending timeline without duplicating contract documents',
            run: () => {
                const client = {
                    id: '7e137864-23f4-4a38-8a56-9a4595bf2294',
                    professionalId: 'd1c946d4-020a-4ef1-a67c-f1bfb9c91d63',
                    fullName: 'Ana Costa',
                    phone: '71999990000',
                    lifecycleStage: 'confirmed',
                    priorityScore: 88,
                    createdAt: '2026-04-01T10:00:00.000Z',
                    updatedAt: '2026-04-10T10:00:00.000Z',
                };
                const timeline = (0, services_1.buildClientTimeline)({
                    client,
                    score: undefined,
                    events: [
                        {
                            id: 'e1',
                            professionalId: client.professionalId,
                            clientId: client.id,
                            title: 'Casamento',
                            eventType: 'Wedding',
                            eventDate: '2026-05-01T10:00:00.000Z',
                            status: 'booked',
                            createdAt: '2026-04-02T10:00:00.000Z',
                            updatedAt: '2026-04-02T10:00:00.000Z',
                        },
                    ],
                    notes: [],
                    media: [],
                    budgets: [],
                    appointments: [],
                    contracts: [
                        {
                            id: 'c1',
                            professionalId: client.professionalId,
                            clientId: client.id,
                            eventId: 'e1',
                            status: 'uploaded',
                            createdAt: '2026-04-03T10:00:00.000Z',
                            updatedAt: '2026-04-03T10:00:00.000Z',
                            version: {
                                id: 'cv1',
                                professionalId: client.professionalId,
                                contractId: 'c1',
                                versionNumber: 1,
                                fileName: 'contrato.pdf',
                                storagePath: 'x',
                                status: 'uploaded',
                                uploadedAt: '2026-04-04T10:00:00.000Z',
                                createdAt: '2026-04-04T10:00:00.000Z',
                            },
                            versions: [],
                        },
                    ],
                    optIn: undefined,
                    documents: [
                        {
                            id: 'd1',
                            professionalId: client.professionalId,
                            clientId: client.id,
                            documentType: 'contract',
                            fileName: 'contrato.pdf',
                            storagePath: 'x',
                            mimeType: 'application/pdf',
                            status: 'active',
                            createdAt: '2026-04-04T10:00:00.000Z',
                        },
                        {
                            id: 'd2',
                            professionalId: client.professionalId,
                            clientId: client.id,
                            documentType: 'other',
                            fileName: 'briefing.pdf',
                            storagePath: 'y',
                            mimeType: 'application/pdf',
                            status: 'active',
                            createdAt: '2026-04-05T10:00:00.000Z',
                        },
                    ],
                    conversation: undefined,
                    messageStatusEvents: [],
                    notificationLogs: [],
                });
                strict_1.default.deepEqual(timeline.map((item) => item.kind), ['document', 'contract', 'event', 'client']);
                strict_1.default.equal(timeline[0].title, 'briefing.pdf');
            },
        },
    ],
};
