/**
 * PortTrack Para Birimi, Yüzde ve Tarih Formatlayıcıları
 * Hermes / Android motoru ile %100 uyumlu, asla boş dönmeyen yardımcılar.
 */

export function formatCurrency(
  value: number | null | undefined,
  currency: string = 'TRY',
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    const symbolMap: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
    return `0,00 ${symbolMap[currency.toUpperCase()] || currency}`;
  }

  const num = Number(value);
  const symbolMap: Record<string, string> = {
    TRY: '₺',
    USD: '$',
    EUR: '€',
    GBP: '£',
    XAU: 'gr',
  };

  const symbol = symbolMap[currency.toUpperCase()] || currency;
  const isNegative = num < 0;
  const parts = Math.abs(num).toFixed(decimals).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = parts[1] !== undefined ? `,${parts[1]}` : '';

  return `${isNegative ? '-' : ''}${integerPart}${decimalPart} ${symbol}`;
}

export function formatPercent(value: number | null | undefined, showSign = true): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '%0,00';
  }

  const num = Number(value);
  const sign = showSign && num > 0 ? '+' : num < 0 ? '-' : '';
  const abs = Math.abs(num).toFixed(2).replace('.', ',');

  return `${sign}%${abs}`;
}

export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return '0';
  const num = Number(value);
  if (Number.isInteger(num)) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  const parts = num.toString().split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intPart},${parts[1]}`;
}

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}.${month}.${year}`;
}

export function getAssetTypeLabel(type: string): string {
  const map: Record<string, string> = {
    BIST: 'BIST Hisse',
    TEFAS: 'TEFAS Fon',
    BES_FUND: 'BES Fon',
    FOREIGN: 'Yabancı Borsa',
    FX: 'Döviz',
    METAL: 'Kıymetli Maden',
    CRYPTO: 'Kripto',
    BES: 'BES',
  };
  return map[type] || type;
}

export function getAssetTypeBadgeColor(type: string): { bg: string; text: string } {
  switch (type) {
    case 'TEFAS':
      return { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' };
    case 'FOREIGN':
      return { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4' };
    case 'METAL':
      return { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308' };
    case 'CRYPTO':
      return { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' };
    case 'BES':
      return { bg: 'rgba(100, 116, 139, 0.15)', text: '#64748b' };
    case 'BES_FUND':
      return { bg: 'rgba(14, 165, 233, 0.15)', text: '#0ea5e9' };
    case 'BIST':
      return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' };
    case 'FX':
      return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' };
    default:
      return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8' };
  }
}
