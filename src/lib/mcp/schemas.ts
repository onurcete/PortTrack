import type { ChatCompletionTool } from "openai/resources/chat/completions";

/**
 * PortTrack MCP Analiz Araçları Şeması
 * Model Context Protocol (MCP) ve OpenAI Function Calling uyumlu 8 temel araç.
 */
export const PORTFOLIO_MCP_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_portfolio_summary",
      description:
        "Portföyün genel büyüklüğünü, toplam TL ve USD değerini, toplam maliyetini, gerçekleşmemiş kâr/zararını ve yıllıklandırılmış bileşik getirisini (XIRR) getirir.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_holdings",
      description:
        "Portföyde şu an elde tutulan tüm aktif pozisyonların listesini, adetlerini, güncel birim fiyatlarını, toplam değerlerini, kâr/zarar oranlarını ve elde tutulma sürelerini getirir.",
      parameters: {
        type: "object",
        properties: {
          assetType: {
            type: "string",
            enum: ["ALL", "BIST", "TEFAS", "FOREIGN", "FX", "METAL", "CRYPTO", "BES"],
            description: "Opsiyonel varlık türü filtresi (Varsayılan: ALL).",
          },
          sortBy: {
            type: "string",
            enum: ["value", "profitPct", "dailyChangePct"],
            description: "Sıralama ölçütü (Varsayılan: value).",
          },
          limit: {
            type: "number",
            description: "Döndürülecek maksimum pozisyon sayısı (Varsayılan: 15).",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_asset_allocation",
      description:
        "Portföyün varlık sınıflarına (BIST, TEFAS, Yabancı Borsa, Döviz, Altın/Maden, Kripto, BES) göre yüzdesel ve parasal dağılımını, en yüksek ağırlıklı varlığı ve konsantrasyon durumunu döner.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_portfolio_performance",
      description:
        "Portföyün seçilen döneme ait getiri yüzdelerini ve parasal değişimini döner (1W = Son 1 Hafta, 1M = Cari Ay / MTD, YTD = Yılbaşından Beri, ALL = Tüm Zamanlar). Yıl veya aylık döküm istendiğinde de kullanılabilir.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["1W", "1M", "YTD", "ALL"],
            description: "İncelenecek performans dönemi.",
          },
          year: {
            type: "number",
            description: "İncelenecek spesifik yıl (Örn: 2026, 2025).",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_monthly_growth_history",
      description:
        "Portföyün yıllara ve aylara göre (örn: 2026, 2025, 2024 vb.) ay ay net parasal kazançlarını (TL ve USD olarak), ay sonu portföy değerlerini ve aylık getiri yüzdelerini getirir. Kullanıcı 2026 yılında aylık ne kadar kazandığını veya geçmiş ayların performansını sorduğunda bu araç çağrılmalıdır.",
      parameters: {
        type: "object",
        properties: {
          year: {
            type: "number",
            description: "Filtrelenecek yıl (Örn: 2026, 2025). Boş bırakılırsa tüm mevcut yıllar döner.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_holding_monthly_performance",
      description:
        "Portföyde tutulan varlıkların (hisseler, TEFAS fonları, yabancı borsa, döviz vb.) geçmiş aylardaki tek tek getiri yüzdelerini getirir. Kullanıcı belirli bir ayın (örn: Mart 2026, 2026-03) neden düşük veya yüksek performans gösterdiğini, hangi varlıkların o ay düştüğünü veya yükseldiğini sorduğunda bu araç çağrılmalıdır.",
      parameters: {
        type: "object",
        properties: {
          month: {
            type: "string",
            description: "İncelenecek ay (Format: 'YYYY-MM', Örn: '2026-03' veya '2026-01'). Boş bırakılırsa en son aylar döner.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_portfolio_contributors",
      description:
        "Portföyün genel kâr veya zararına en çok katkı sağlayan en iyi kazandıranları (Top Gainers) ve en çok kaybettirenleri (Top Losers) parasal ve yüzdesel olarak getirir.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["DAILY", "MTD", "ALL_TIME"],
            description: "Katkı analizinin dönemi (Varsayılan: MTD).",
          },
          limit: {
            type: "number",
            description: "Her kategori için getirilecek pozisyon sayısı (Varsayılan: 3).",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_with_benchmark",
      description:
        "Portföyün performansını piyasa göstergeleriyle (BIST 100, Gram Altın, USD/TRY, Enflasyon ve Faiz) karşılaştırır; Alpha ve göreceli getiri farkını hesaplar.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["1M", "YTD", "ALL_TIME"],
            description: "Karşılaştırma dönemi.",
          },
        },
        required: ["period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_portfolio_risk",
      description:
        "Portföyün risk profilini değerlendirir: Tek varlık yoğunlaşması (Concentration risk), nakit/döviz koruma oranı, en çok düşüş yaşayan varlıklar ve çeşitlendirme skoru.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tefas_insights",
      description:
        "Portföyde bulunan TEFAS fonlarına yönelik haftalık yatırımcı giriş/çıkış dinamiklerini, talep yönünü ve fon büyüklüğü trendlerini döner.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];
