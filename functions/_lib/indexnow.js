// IndexNow tells participating engines the moment a page appears or changes,
// instead of waiting for a crawl. The key is public by design: it is published
// at the keyLocation below so the engines can verify we own the host.
export const INDEXNOW_KEY = "f279e235bc32fc739e919e2f003c7610";

export async function pingIndexNow(origin, urls, fetcher = fetch) {
  const list = [...new Set(urls.filter(Boolean))].slice(0, 100);
  if (!list.length) return false;
  const host = new URL(origin).hostname;
  const response = await fetcher("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: INDEXNOW_KEY,
      keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
      urlList: list,
    }),
  });
  return response.ok || response.status === 202;
}
