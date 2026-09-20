# SEO 健檢報告：https://rankoff.my

- 報告 ID：`seo-report-rankoff.my`
- 產生時間：2026-09-20T08:35:36.949629+00:00
- 模式：consultant
- 來源類型：http

## Executive Summary

https://rankoff.my 的整體 SEO 健康分數為 77.1/100。 另有 1 個高影響（P1）問題建議優先排入近期排程。 本次共產出 7 項發現，詳見下方分級清單。

## Site Health Score

**77.1 / 100**

## Top Findings

- **[P1] sitemap.xml 不是合法的 XML 格式** (impact=4, effort=2, confidence=1.00) — `SEO-SITEMAP_INVALID_XML-001`
- **[P2] 發現 5 組重複的 <title>** (impact=3, effort=2, confidence=0.80) — `SEO-TITLE_DUPLICATE-001`
- **[P2] 發現 5 個頁面回傳 4xx/5xx 錯誤** (impact=2, effort=2, confidence=1.00) — `SEO-HTTP_ERRORS-001`
- **[P3] 49 個頁面的 hreflang 代碼格式不正確** (impact=2, effort=1, confidence=0.70) — `SEO-HREFLANG_INVALID_CODE-001`
- **[P3] 43 個頁面有 <img> 缺少 width/height 屬性** (impact=2, effort=1, confidence=0.50) — `SEO-IMAGE_MISSING_DIMENSIONS_HINT-001`
- **[P3] robots.txt 未宣告 sitemap 位置** (impact=1, effort=1, confidence=0.90) — `SEO-ROBOTS_NO_SITEMAP-001`
- **[P3] 65 個頁面有多個未使用 defer/async 的 <script>** (impact=2, effort=2, confidence=0.50) — `SEO-BLOCKING_SCRIPTS_HINT-001`

## 完整發現清單（依優先順序分組）

### P0（0 項）

（無）

### P1（1 項）

#### sitemap.xml 不是合法的 XML 格式 `SEO-SITEMAP_INVALID_XML-001`

- 分類：indexability
- Impact: 4 / Effort: 2 / Confidence: 1.00
- 受影響 URL：/sitemap.xml
- 建議：修正 sitemap.xml 的 XML 格式錯誤，可用 XML validator 檢查。
- 驗證方式：確認 sitemap.xml 可被 XML parser 正確解析
- 建議負責模式：engineer

### P2（2 項）

#### 發現 5 組重複的 <title> `SEO-TITLE_DUPLICATE-001`

- 分類：content_quality
- Impact: 3 / Effort: 2 / Confidence: 0.80
- 受影響 URL：https://rankoff.my/, https://rankoff.my/?period=today#board, https://rankoff.my/?lang=ms, https://rankoff.my/?lang=ms#board, https://rankoff.my/?period=today&lang=ms#board（等共 17 個）
- 建議：為每個頁面撰寫獨特的 title，避免不同頁面使用相同標題造成搜尋結果混淆與內部競爭。
- 驗證方式：重新爬取確認每個頁面的 title 皆為獨特
- 建議負責模式：engineer

#### 發現 5 個頁面回傳 4xx/5xx 錯誤 `SEO-HTTP_ERRORS-001`

- 分類：indexability
- Impact: 2 / Effort: 2 / Confidence: 1.00
- 受影響 URL：https://rankoff.my/cdn-cgi/l/email-protection#1162707d7462517363707f75646175746278767f7c70637a7465787f763f727e7c, https://rankoff.my/cdn-cgi/l/email-protection#7a091b161f093a18081b141e0f0a1e1f09131d14171b08111f0e13141d54191517, https://rankoff.my/cdn-cgi/l/email-protection#740715181107341606151a1001041011071d131a1915061f11001d1a135a171b19, https://rankoff.my/cdn-cgi/l/email-protection#0d7e6c61687e4d6f7f6c6369787d69687e646a63606c7f66687964636a236e6260, https://rankoff.my/cdn-cgi/l/email-protection#3c4f5d50594f7c5e4e5d5258494c58594f555b52515d4e57594855525b125f5351
- 建議：逐一檢查這些 URL：確認是否應該回傳 200（修正連結或伺服器設定），或應該用 301 導向到正確頁面，或該頁面本來就該下架並回傳正確的 410。
- 驗證方式：重新爬取這些 URL，確認狀態碼已修正為預期值
- 建議負責模式：engineer

### P3（4 項）

#### 49 個頁面的 hreflang 代碼格式不正確 `SEO-HREFLANG_INVALID_CODE-001`

- 分類：indexability
- Impact: 2 / Effort: 1 / Confidence: 0.70
- 受影響 URL：https://rankoff.my/, https://rankoff.my/?lang=ms, https://rankoff.my/?lang=zh, https://rankoff.my/categories, https://rankoff.my/categories?lang=ms（等共 49 個）
- 建議：hreflang 應使用 ISO 639-1 語言代碼（可選加上 ISO 3166-1 地區代碼，例如 zh-TW、en-US），或使用 x-default。這裡只檢查格式是否符合這個樣式，不驗證代碼本身是否真實存在。
- 驗證方式：確認 hreflang 屬性值符合語言/地區代碼格式
- 建議負責模式：engineer

#### 43 個頁面有 <img> 缺少 width/height 屬性 `SEO-IMAGE_MISSING_DIMENSIONS_HINT-001`

- 分類：performance
- Impact: 2 / Effort: 1 / Confidence: 0.50
- 受影響 URL：https://rankoff.my/, https://rankoff.my/?lang=ms, https://rankoff.my/?lang=zh, https://rankoff.my/product/hypexauto.com, https://rankoff.my/product/hypexauto.com?lang=zh（等共 43 個）
- 建議：為 <img> 補上 width 與 height 屬性（或用 CSS aspect-ratio 搭配容器保留版面空間），避免圖片載入時造成畫面跳動（layout shift）。這只是靜態線索，不是實際的 Core Web Vitals 分數。
- 驗證方式：用瀏覽器開發者工具或 PageSpeed Insights 確認 CLS 分數
- 建議負責模式：engineer

#### robots.txt 未宣告 sitemap 位置 `SEO-ROBOTS_NO_SITEMAP-001`

- 分類：indexability
- Impact: 1 / Effort: 1 / Confidence: 0.90
- 受影響 URL：/robots.txt
- 建議：在 robots.txt 中加入 `Sitemap: https://<domain>/sitemap.xml`，協助搜尋引擎更快發現網站的完整 URL 清單。
- 驗證方式：確認 robots.txt 內容包含 Sitemap 宣告
- 建議負責模式：engineer

#### 65 個頁面有多個未使用 defer/async 的 <script> `SEO-BLOCKING_SCRIPTS_HINT-001`

- 分類：performance
- Impact: 2 / Effort: 2 / Confidence: 0.50
- 受影響 URL：https://rankoff.my/, https://rankoff.my/?lang=ms, https://rankoff.my/?lang=zh, https://rankoff.my/categories, https://rankoff.my/categories?lang=ms（等共 50 個）
- 建議：為外部 <script> 標籤加上 defer 或 async 屬性，避免多個同步載入的 script 阻塞頁面渲染。是否適合加 defer/async 需視該 script 的執行順序需求而定，這裡不會自動修改（可能影響 JS 執行順序）。
- 驗證方式：用瀏覽器開發者工具的效能面板確認渲染阻塞情況是否改善
- 建議負責模式：engineer

## 檢查範圍說明

- Core Web Vitals、JavaScript 渲染差異比對、結構化資料驗證、Search Console/GA4 資料整合尚未實作（見 docs/roadmap.md v0.2.0）。

## 掃描統計

- urls_crawled: 70
- urls_skipped: 0
- detected_stack: None
- status_code_distribution: {'2xx': 65, '3xx': 0, '4xx': 5, '5xx': 0, '0': 0}
- hreflang_matrix: {'https://rankoff.my/': {'en': 'https://rankoff.my/', 'zh-Hans': 'https://rankoff.my/?lang=zh', 'x-default': 'https://rankoff.my/', 'ms': 'https://rankoff.my/?lang=ms'}, 'https://rankoff.my/?lang=ms': {'en': 'https://rankoff.my/', 'zh-Hans': 'https://rankoff.my/?lang=zh', 'x-default': 'https://rankoff.my/', 'ms': 'https://rankoff.my/?lang=ms'}, 'https://rankoff.my/?lang=zh': {'en': 'https://rankoff.my/', 'zh-Hans': 'https://rankoff.my/?lang=zh', 'x-default': 'https://rankoff.my/', 'ms': 'https://rankoff.my/?lang=ms'}, 'https://rankoff.my/categories': {'en': 'https://rankoff.my/categories', 'zh-Hans': 'https://rankoff.my/categories?lang=zh', 'x-default': 'https://rankoff.my/categories', 'ms': 'https://rankoff.my/categories?lang=ms'}, 'https://rankoff.my/categories?lang=ms': {'en': 'https://rankoff.my/categories', 'zh-Hans': 'https://rankoff.my/categories?lang=zh', 'x-default': 'https://rankoff.my/categories', 'ms': 'https://rankoff.my/categories?lang=ms'}, 'https://rankoff.my/categories?lang=zh': {'en': 'https://rankoff.my/categories', 'zh-Hans': 'https://rankoff.my/categories?lang=zh', 'x-default': 'https://rankoff.my/categories', 'ms': 'https://rankoff.my/categories?lang=ms'}, 'https://rankoff.my/about': {'en': 'https://rankoff.my/about', 'zh-Hans': 'https://rankoff.my/about?lang=zh', 'x-default': 'https://rankoff.my/about', 'ms': 'https://rankoff.my/about?lang=ms'}, 'https://rankoff.my/about?lang=ms': {'en': 'https://rankoff.my/about', 'zh-Hans': 'https://rankoff.my/about?lang=zh', 'x-default': 'https://rankoff.my/about', 'ms': 'https://rankoff.my/about?lang=ms'}, 'https://rankoff.my/about?lang=zh': {'en': 'https://rankoff.my/about', 'zh-Hans': 'https://rankoff.my/about?lang=zh', 'x-default': 'https://rankoff.my/about', 'ms': 'https://rankoff.my/about?lang=ms'}, 'https://rankoff.my/legal': {'en': 'https://rankoff.my/legal', 'ms': 'https://rankoff.my/legal?lang=ms'}, 'https://rankoff.my/legal?lang=ms': {'en': 'https://rankoff.my/legal', 'ms': 'https://rankoff.my/legal?lang=ms'}, 'https://rankoff.my/answers/pay-to-rank-leaderboard': {'en': 'https://rankoff.my/answers/pay-to-rank-leaderboard', 'ms': 'https://rankoff.my/answers/pay-to-rank-leaderboard?lang=ms'}, 'https://rankoff.my/answers/pay-to-rank-leaderboard?lang=ms': {'en': 'https://rankoff.my/answers/pay-to-rank-leaderboard', 'ms': 'https://rankoff.my/answers/pay-to-rank-leaderboard?lang=ms'}, 'https://rankoff.my/answers/how-rankoff-ranking-works': {'en': 'https://rankoff.my/answers/how-rankoff-ranking-works', 'ms': 'https://rankoff.my/answers/how-rankoff-ranking-works?lang=ms'}, 'https://rankoff.my/answers/how-rankoff-ranking-works?lang=ms': {'en': 'https://rankoff.my/answers/how-rankoff-ranking-works', 'ms': 'https://rankoff.my/answers/how-rankoff-ranking-works?lang=ms'}, 'https://rankoff.my/answers/sponsor-a-public-link': {'en': 'https://rankoff.my/answers/sponsor-a-public-link', 'ms': 'https://rankoff.my/answers/sponsor-a-public-link?lang=ms'}, 'https://rankoff.my/answers/sponsor-a-public-link?lang=ms': {'en': 'https://rankoff.my/answers/sponsor-a-public-link', 'ms': 'https://rankoff.my/answers/sponsor-a-public-link?lang=ms'}, 'https://rankoff.my/product/hypexauto.com': {'en': 'https://rankoff.my/product/hypexauto.com', 'zh-Hans': 'https://rankoff.my/product/hypexauto.com?lang=zh', 'x-default': 'https://rankoff.my/product/hypexauto.com', 'ms': 'https://rankoff.my/product/hypexauto.com?lang=ms'}, 'https://rankoff.my/product/hypexauto.com?lang=zh': {'en': 'https://rankoff.my/product/hypexauto.com', 'zh-Hans': 'https://rankoff.my/product/hypexauto.com?lang=zh', 'x-default': 'https://rankoff.my/product/hypexauto.com', 'ms': 'https://rankoff.my/product/hypexauto.com?lang=ms'}, 'https://rankoff.my/product/hypexauto.com?lang=ms': {'en': 'https://rankoff.my/product/hypexauto.com', 'zh-Hans': 'https://rankoff.my/product/hypexauto.com?lang=zh', 'x-default': 'https://rankoff.my/product/hypexauto.com', 'ms': 'https://rankoff.my/product/hypexauto.com?lang=ms'}, 'https://rankoff.my/profile/instagram/resoneer_coaching': {'en': 'https://rankoff.my/profile/instagram/resoneer_coaching', 'zh-Hans': 'https://rankoff.my/profile/instagram/resoneer_coaching?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/resoneer_coaching', 'ms': 'https://rankoff.my/profile/instagram/resoneer_coaching?lang=ms'}, 'https://rankoff.my/profile/instagram/resoneer_coaching?lang=zh': {'en': 'https://rankoff.my/profile/instagram/resoneer_coaching', 'zh-Hans': 'https://rankoff.my/profile/instagram/resoneer_coaching?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/resoneer_coaching', 'ms': 'https://rankoff.my/profile/instagram/resoneer_coaching?lang=ms'}, 'https://rankoff.my/profile/instagram/resoneer_coaching?lang=ms': {'en': 'https://rankoff.my/profile/instagram/resoneer_coaching', 'zh-Hans': 'https://rankoff.my/profile/instagram/resoneer_coaching?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/resoneer_coaching', 'ms': 'https://rankoff.my/profile/instagram/resoneer_coaching?lang=ms'}, 'https://rankoff.my/profile/instagram/express_queenlash': {'en': 'https://rankoff.my/profile/instagram/express_queenlash', 'zh-Hans': 'https://rankoff.my/profile/instagram/express_queenlash?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/express_queenlash', 'ms': 'https://rankoff.my/profile/instagram/express_queenlash?lang=ms'}, 'https://rankoff.my/profile/instagram/express_queenlash?lang=zh': {'en': 'https://rankoff.my/profile/instagram/express_queenlash', 'zh-Hans': 'https://rankoff.my/profile/instagram/express_queenlash?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/express_queenlash', 'ms': 'https://rankoff.my/profile/instagram/express_queenlash?lang=ms'}, 'https://rankoff.my/profile/instagram/express_queenlash?lang=ms': {'en': 'https://rankoff.my/profile/instagram/express_queenlash', 'zh-Hans': 'https://rankoff.my/profile/instagram/express_queenlash?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/express_queenlash', 'ms': 'https://rankoff.my/profile/instagram/express_queenlash?lang=ms'}, 'https://rankoff.my/product/rakanjayahardware.com': {'en': 'https://rankoff.my/product/rakanjayahardware.com', 'zh-Hans': 'https://rankoff.my/product/rakanjayahardware.com?lang=zh', 'x-default': 'https://rankoff.my/product/rakanjayahardware.com', 'ms': 'https://rankoff.my/product/rakanjayahardware.com?lang=ms'}, 'https://rankoff.my/product/rakanjayahardware.com?lang=zh': {'en': 'https://rankoff.my/product/rakanjayahardware.com', 'zh-Hans': 'https://rankoff.my/product/rakanjayahardware.com?lang=zh', 'x-default': 'https://rankoff.my/product/rakanjayahardware.com', 'ms': 'https://rankoff.my/product/rakanjayahardware.com?lang=ms'}, 'https://rankoff.my/product/rakanjayahardware.com?lang=ms': {'en': 'https://rankoff.my/product/rakanjayahardware.com', 'zh-Hans': 'https://rankoff.my/product/rakanjayahardware.com?lang=zh', 'x-default': 'https://rankoff.my/product/rakanjayahardware.com', 'ms': 'https://rankoff.my/product/rakanjayahardware.com?lang=ms'}, 'https://rankoff.my/profile/instagram/mumeiyan.hq': {'en': 'https://rankoff.my/profile/instagram/mumeiyan.hq', 'zh-Hans': 'https://rankoff.my/profile/instagram/mumeiyan.hq?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/mumeiyan.hq', 'ms': 'https://rankoff.my/profile/instagram/mumeiyan.hq?lang=ms'}, 'https://rankoff.my/profile/instagram/mumeiyan.hq?lang=zh': {'en': 'https://rankoff.my/profile/instagram/mumeiyan.hq', 'zh-Hans': 'https://rankoff.my/profile/instagram/mumeiyan.hq?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/mumeiyan.hq', 'ms': 'https://rankoff.my/profile/instagram/mumeiyan.hq?lang=ms'}, 'https://rankoff.my/profile/instagram/mumeiyan.hq?lang=ms': {'en': 'https://rankoff.my/profile/instagram/mumeiyan.hq', 'zh-Hans': 'https://rankoff.my/profile/instagram/mumeiyan.hq?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/mumeiyan.hq', 'ms': 'https://rankoff.my/profile/instagram/mumeiyan.hq?lang=ms'}, 'https://rankoff.my/profile/instagram/ihospitaljb': {'en': 'https://rankoff.my/profile/instagram/ihospitaljb', 'zh-Hans': 'https://rankoff.my/profile/instagram/ihospitaljb?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/ihospitaljb', 'ms': 'https://rankoff.my/profile/instagram/ihospitaljb?lang=ms'}, 'https://rankoff.my/profile/instagram/ihospitaljb?lang=zh': {'en': 'https://rankoff.my/profile/instagram/ihospitaljb', 'zh-Hans': 'https://rankoff.my/profile/instagram/ihospitaljb?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/ihospitaljb', 'ms': 'https://rankoff.my/profile/instagram/ihospitaljb?lang=ms'}, 'https://rankoff.my/profile/instagram/ihospitaljb?lang=ms': {'en': 'https://rankoff.my/profile/instagram/ihospitaljb', 'zh-Hans': 'https://rankoff.my/profile/instagram/ihospitaljb?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/ihospitaljb', 'ms': 'https://rankoff.my/profile/instagram/ihospitaljb?lang=ms'}, 'https://rankoff.my/profile/instagram/glowmebykimisoi': {'en': 'https://rankoff.my/profile/instagram/glowmebykimisoi', 'zh-Hans': 'https://rankoff.my/profile/instagram/glowmebykimisoi?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/glowmebykimisoi', 'ms': 'https://rankoff.my/profile/instagram/glowmebykimisoi?lang=ms'}, 'https://rankoff.my/profile/instagram/glowmebykimisoi?lang=zh': {'en': 'https://rankoff.my/profile/instagram/glowmebykimisoi', 'zh-Hans': 'https://rankoff.my/profile/instagram/glowmebykimisoi?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/glowmebykimisoi', 'ms': 'https://rankoff.my/profile/instagram/glowmebykimisoi?lang=ms'}, 'https://rankoff.my/profile/instagram/glowmebykimisoi?lang=ms': {'en': 'https://rankoff.my/profile/instagram/glowmebykimisoi', 'zh-Hans': 'https://rankoff.my/profile/instagram/glowmebykimisoi?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/glowmebykimisoi', 'ms': 'https://rankoff.my/profile/instagram/glowmebykimisoi?lang=ms'}, 'https://rankoff.my/profile/facebook/moonsoul.fb.official': {'en': 'https://rankoff.my/profile/facebook/moonsoul.fb.official', 'zh-Hans': 'https://rankoff.my/profile/facebook/moonsoul.fb.official?lang=zh', 'x-default': 'https://rankoff.my/profile/facebook/moonsoul.fb.official', 'ms': 'https://rankoff.my/profile/facebook/moonsoul.fb.official?lang=ms'}, 'https://rankoff.my/profile/facebook/moonsoul.fb.official?lang=zh': {'en': 'https://rankoff.my/profile/facebook/moonsoul.fb.official', 'zh-Hans': 'https://rankoff.my/profile/facebook/moonsoul.fb.official?lang=zh', 'x-default': 'https://rankoff.my/profile/facebook/moonsoul.fb.official', 'ms': 'https://rankoff.my/profile/facebook/moonsoul.fb.official?lang=ms'}, 'https://rankoff.my/profile/facebook/moonsoul.fb.official?lang=ms': {'en': 'https://rankoff.my/profile/facebook/moonsoul.fb.official', 'zh-Hans': 'https://rankoff.my/profile/facebook/moonsoul.fb.official?lang=zh', 'x-default': 'https://rankoff.my/profile/facebook/moonsoul.fb.official', 'ms': 'https://rankoff.my/profile/facebook/moonsoul.fb.official?lang=ms'}, 'https://rankoff.my/product/brandupdesignmarketing.com': {'en': 'https://rankoff.my/product/brandupdesignmarketing.com', 'zh-Hans': 'https://rankoff.my/product/brandupdesignmarketing.com?lang=zh', 'x-default': 'https://rankoff.my/product/brandupdesignmarketing.com', 'ms': 'https://rankoff.my/product/brandupdesignmarketing.com?lang=ms'}, 'https://rankoff.my/product/brandupdesignmarketing.com?lang=zh': {'en': 'https://rankoff.my/product/brandupdesignmarketing.com', 'zh-Hans': 'https://rankoff.my/product/brandupdesignmarketing.com?lang=zh', 'x-default': 'https://rankoff.my/product/brandupdesignmarketing.com', 'ms': 'https://rankoff.my/product/brandupdesignmarketing.com?lang=ms'}, 'https://rankoff.my/product/brandupdesignmarketing.com?lang=ms': {'en': 'https://rankoff.my/product/brandupdesignmarketing.com', 'zh-Hans': 'https://rankoff.my/product/brandupdesignmarketing.com?lang=zh', 'x-default': 'https://rankoff.my/product/brandupdesignmarketing.com', 'ms': 'https://rankoff.my/product/brandupdesignmarketing.com?lang=ms'}, 'https://rankoff.my/product/orientalwellness.my': {'en': 'https://rankoff.my/product/orientalwellness.my', 'zh-Hans': 'https://rankoff.my/product/orientalwellness.my?lang=zh', 'x-default': 'https://rankoff.my/product/orientalwellness.my', 'ms': 'https://rankoff.my/product/orientalwellness.my?lang=ms'}, 'https://rankoff.my/product/orientalwellness.my?lang=zh': {'en': 'https://rankoff.my/product/orientalwellness.my', 'zh-Hans': 'https://rankoff.my/product/orientalwellness.my?lang=zh', 'x-default': 'https://rankoff.my/product/orientalwellness.my', 'ms': 'https://rankoff.my/product/orientalwellness.my?lang=ms'}, 'https://rankoff.my/product/orientalwellness.my?lang=ms': {'en': 'https://rankoff.my/product/orientalwellness.my', 'zh-Hans': 'https://rankoff.my/product/orientalwellness.my?lang=zh', 'x-default': 'https://rankoff.my/product/orientalwellness.my', 'ms': 'https://rankoff.my/product/orientalwellness.my?lang=ms'}, 'https://rankoff.my/product/uscpap.my': {'en': 'https://rankoff.my/product/uscpap.my', 'zh-Hans': 'https://rankoff.my/product/uscpap.my?lang=zh', 'x-default': 'https://rankoff.my/product/uscpap.my', 'ms': 'https://rankoff.my/product/uscpap.my?lang=ms'}, 'https://rankoff.my/product/uscpap.my?lang=zh': {'en': 'https://rankoff.my/product/uscpap.my', 'zh-Hans': 'https://rankoff.my/product/uscpap.my?lang=zh', 'x-default': 'https://rankoff.my/product/uscpap.my', 'ms': 'https://rankoff.my/product/uscpap.my?lang=ms'}, 'https://rankoff.my/product/uscpap.my?lang=ms': {'en': 'https://rankoff.my/product/uscpap.my', 'zh-Hans': 'https://rankoff.my/product/uscpap.my?lang=zh', 'x-default': 'https://rankoff.my/product/uscpap.my', 'ms': 'https://rankoff.my/product/uscpap.my?lang=ms'}, 'https://rankoff.my/profile/instagram/_umidesign_': {'en': 'https://rankoff.my/profile/instagram/_umidesign_', 'zh-Hans': 'https://rankoff.my/profile/instagram/_umidesign_?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/_umidesign_', 'ms': 'https://rankoff.my/profile/instagram/_umidesign_?lang=ms'}, 'https://rankoff.my/profile/instagram/_umidesign_?lang=zh': {'en': 'https://rankoff.my/profile/instagram/_umidesign_', 'zh-Hans': 'https://rankoff.my/profile/instagram/_umidesign_?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/_umidesign_', 'ms': 'https://rankoff.my/profile/instagram/_umidesign_?lang=ms'}, 'https://rankoff.my/profile/instagram/_umidesign_?lang=ms': {'en': 'https://rankoff.my/profile/instagram/_umidesign_', 'zh-Hans': 'https://rankoff.my/profile/instagram/_umidesign_?lang=zh', 'x-default': 'https://rankoff.my/profile/instagram/_umidesign_', 'ms': 'https://rankoff.my/profile/instagram/_umidesign_?lang=ms'}, 'https://rankoff.my/?period=today#board': {'en': 'https://rankoff.my/', 'zh-Hans': 'https://rankoff.my/?lang=zh', 'x-default': 'https://rankoff.my/', 'ms': 'https://rankoff.my/?lang=ms'}, 'https://rankoff.my/legal#rules': {'en': 'https://rankoff.my/legal', 'ms': 'https://rankoff.my/legal?lang=ms'}, 'https://rankoff.my/legal#terms': {'en': 'https://rankoff.my/legal', 'ms': 'https://rankoff.my/legal?lang=ms'}, 'https://rankoff.my/legal#privacy': {'en': 'https://rankoff.my/legal', 'ms': 'https://rankoff.my/legal?lang=ms'}, 'https://rankoff.my/legal#payments': {'en': 'https://rankoff.my/legal', 'ms': 'https://rankoff.my/legal?lang=ms'}, 'https://rankoff.my/?lang=ms#board': {'en': 'https://rankoff.my/', 'zh-Hans': 'https://rankoff.my/?lang=zh', 'x-default': 'https://rankoff.my/', 'ms': 'https://rankoff.my/?lang=ms'}, 'https://rankoff.my/?period=today&lang=ms#board': {'en': 'https://rankoff.my/', 'zh-Hans': 'https://rankoff.my/?lang=zh', 'x-default': 'https://rankoff.my/', 'ms': 'https://rankoff.my/?lang=ms'}, 'https://rankoff.my/legal?lang=ms#rules': {'en': 'https://rankoff.my/legal', 'ms': 'https://rankoff.my/legal?lang=ms'}, 'https://rankoff.my/legal?lang=ms#terms': {'en': 'https://rankoff.my/legal', 'ms': 'https://rankoff.my/legal?lang=ms'}, 'https://rankoff.my/legal?lang=ms#privacy': {'en': 'https://rankoff.my/legal', 'ms': 'https://rankoff.my/legal?lang=ms'}, 'https://rankoff.my/legal?lang=ms#payments': {'en': 'https://rankoff.my/legal', 'ms': 'https://rankoff.my/legal?lang=ms'}, 'https://rankoff.my/?lang=zh&period=today#board': {'en': 'https://rankoff.my/', 'zh-Hans': 'https://rankoff.my/?lang=zh', 'x-default': 'https://rankoff.my/', 'ms': 'https://rankoff.my/?lang=ms'}}
