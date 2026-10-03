// Cliente nativo de la API de Instagram (Instagram API con inicio de sesión de Instagram).
// Sin dependencias externas. El token se lee del .env y nunca se imprime.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class InstagramClient {
  constructor({ token, version = "v23.0" }) {
    if (!token) throw new Error("Falta el token de acceso");
    this.token = token;
    this.base = `https://graph.instagram.com/${version}`;
  }

  async #call(method, path, params = {}) {
    const url = new URL(`${this.base}/${path}`);
    const body = new URLSearchParams({ access_token: this.token });
    for (const [k, v] of Object.entries(params)) if (v != null) body.set(k, String(v));
    let res;
    if (method === "GET") {
      body.forEach((v, k) => url.searchParams.set(k, v));
      res = await fetch(url);
    } else {
      res = await fetch(url, { method, body });
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) {
      const e = json.error ?? {};
      throw new Error(`Instagram API ${res.status}: ${e.message ?? "error desconocido"} (code ${e.code ?? "?"})`);
    }
    return json;
  }

  me() {
    return this.#call("GET", "me", { fields: "user_id,username,account_type,media_count,followers_count" });
  }

  /** Espera a que un contenedor de medios esté listo para publicarse. */
  async #waitReady(id, { tries = 30, everyMs = 2000 } = {}) {
    for (let i = 0; i < tries; i++) {
      const { status_code } = await this.#call("GET", id, { fields: "status_code" });
      if (status_code === "FINISHED") return;
      if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`Contenedor ${id} en estado ${status_code}`);
      await sleep(everyMs);
    }
    throw new Error(`Contenedor ${id} no terminó a tiempo`);
  }

  async #publish(creationId) {
    await this.#waitReady(creationId);
    const { id } = await this.#call("POST", "me/media_publish", { creation_id: creationId });
    const { permalink } = await this.#call("GET", id, { fields: "permalink" });
    return { id, permalink };
  }

  /** Carrusel de 2 a 10 imágenes JPEG públicas (4:5 a 1.91:1, máx. 8 MB). */
  async publishCarousel({ imageUrls, caption }) {
    if (imageUrls.length < 2 || imageUrls.length > 10) throw new Error("Un carrusel necesita de 2 a 10 imágenes");
    const children = [];
    for (const image_url of imageUrls) {
      const { id } = await this.#call("POST", "me/media", { image_url, is_carousel_item: "true" });
      children.push(id);
    }
    for (const c of children) await this.#waitReady(c);
    const { id: containerId } = await this.#call("POST", "me/media", {
      media_type: "CAROUSEL",
      children: children.join(","),
      caption,
    });
    return this.#publish(containerId);
  }

  async publishImage({ imageUrl, caption }) {
    const { id } = await this.#call("POST", "me/media", { image_url: imageUrl, caption });
    return this.#publish(id);
  }
}
