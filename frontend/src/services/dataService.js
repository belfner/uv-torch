/**
 * Fetches a JSON file and returns the parsed result.
 * @param {string} url
 * @returns {Promise<any>}
 */
export async function fetchData(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
