/** Portfoy gelisimi sayfasinda gosterilen en erken yil */
export const GROWTH_DISPLAY_FROM_YEAR = 2023;

/**
 * Grafik/tablolarda gosterilmez; yuzde karsilastirmasi icin kullanilir.
 * Backlog'da 2022 yoksa 2023-01 acilis bakiyesi 2022-12 baz olarak eklenir.
 */
export const GROWTH_BASELINE_YEAR = 2022;

/**
 * Bu yila kadar (dahil) tum kolonlar backlog.xlsx'ten okunur.
 * 2025+ diger kolonlar islemlerden hesaplanir; BES tum gecmis excel + sonrasi form.
 */
export const BACKLOG_FULL_UNTIL_YEAR = 2024;
/** BES manuel giris formu bu yildan itibaren (excel oncesi yillar import ile) */
export const BES_MANUAL_FROM_YEAR = 2025;
