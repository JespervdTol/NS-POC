export class NsReisinfoClient {
  constructor(private deps: { baseUrl: string }) {}

  async get<T>(
    endpoint: string,
    query?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(`${this.deps.baseUrl}/ns/reisinformatie/${endpoint}`);

    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined) continue;
        url.searchParams.set(k, String(v));
      }
    }

    console.log("[NS] fetch:", url.toString());

    let r: Response;
    try {
      r = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "NS-POC/1.0",
          "ngrok-skip-browser-warning": "true",
        },
      });
    } catch (e: any) {
      throw new Error(`Network error: ${String(e?.message || e)}`);
    }

    const text = await r.text();

    if (!r.ok) {
      throw new Error(`NS proxy error ${r.status}: ${text.slice(0, 120)}`);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Expected JSON but got: ${text.slice(0, 120)}`);
    }
  }
}