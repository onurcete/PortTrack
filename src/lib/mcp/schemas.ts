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
        "Portföyün seçilen döneme ait getiri yüzdelerini ve parasal değişimini döner (1W = Son 1 Hafta, 1M = Cari Ay / MTD, YTD = Yılbaşından Beri, ALL = Tüm Zamanlar).",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["1W", "1M", "YTD", "ALL"],
            description: "İncelenecek performans dönemi.",
          },
        },
        required: ["period"],
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
