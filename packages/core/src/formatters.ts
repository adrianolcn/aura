export function formatCurrency(value: number, locale = 'pt-BR', currency = 'BRL') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string, locale = 'pt-BR') {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function formatDateTime(value: string, locale = 'pt-BR') {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatPhone(phone: string) {
  return phone.replace(/\s+/g, ' ').trim();
}
