"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.formatPhone = formatPhone;
function formatCurrency(value, locale = 'pt-BR', currency = 'BRL') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(value);
}
function formatDate(value, locale = 'pt-BR') {
    return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
    }).format(new Date(value));
}
function formatDateTime(value, locale = 'pt-BR') {
    return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}
function formatPhone(phone) {
    return phone.replace(/\s+/g, ' ').trim();
}
