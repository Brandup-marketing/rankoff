const COPY = {
  en: { empty: "No sponsored businesses match these filters yet. Try another industry or timeframe.", sponsor: "Sponsor a business", loading: "Loading businesses…", error: "The selected board could not be loaded. Please try again." },
  zh: { empty: "这些条件下暂时没有赞助商家，请选择其他行业或时间范围。", sponsor: "赞助商家", loading: "正在载入商家…", error: "暂时无法载入所选榜单，请重试。" },
  ms: { empty: "Tiada perniagaan tajaan yang sepadan. Cuba industri atau tempoh lain.", sponsor: "Taja perniagaan", loading: "Memuatkan perniagaan…", error: "Papan pilihan tidak dapat dimuatkan. Sila cuba lagi." },
};

export function discoveryCopy(language = "en") {
  return COPY[language] || COPY.en;
}
