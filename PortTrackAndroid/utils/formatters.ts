/**
 * PortTrack Para Birimi, Yüzde ve Tarih Formatlayıcıları
 */

export function formatCurrency(
  value: number | null | undefined,
  currency: string = 'TRY',
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0,00 ₺';
  }

  const symbolMap: Record<string, string> = {
    TRY: '₺',
    USD: '$',
    EUR: '€',
    GBP: '£',
    XAU: 'gr',
  };

  const symbol = symbolMap[currency.toUpperCase()] || currency;
  const isNegative = value < 0;
  const absoluteValue = Math.abs(value);

  const formatted = absoluteValue.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${isNegative ? '-' : ''}${formatted} ${symbol}`;
}

export function formatPercent(value: number | null | undefined, showSign = true): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '%0,00';
  }

  const sign = showSign && value > 0 ? '+' : '';
  const formatted = value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${sign}%${formatted}`;
}

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getAssetTypeLabel(type: string): string {
  const map: Record<string, string> = {
    BIST: 'BIST Hisse',
    TEFAS: 'Yatırım Fonu',
    FOREIGN: 'Yabancı Hisse',
    FX: 'Döviz',
    METAL: 'Kıymetli Maden',
    CRYPTO: 'Kripto Para',
    BES: 'Bireysel Emeklilik',
  };
  return map[type] || type;
}

export function getAssetTypeBadgeColor(type: string): { bg: string; text: string } {
  switch (type) {
    case 'BIST':
      return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' };
    case 'TEFAS':
      return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' };
    case 'FOREIGN':
      return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc' };
    case 'BES':
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' };
    case 'CRYPTO':
      return { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' };
    case 'METAL':
      return { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15' };
    case 'FX':
      return { bg: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf' };
    default:
      return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8' };
  }
}
