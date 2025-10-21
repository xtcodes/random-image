export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    // Ambil ukuran dari path (/400/300)
    const width = parseInt(parts[0]) || 400;
    const height = parseInt(parts[1]) || 300;

    // Query opsional
    const blur = parseInt(url.searchParams.get("blur")) || 0;
    const gray = url.searchParams.has("gray");
    const seed = url.searchParams.get("seed") || null;
    const isJSON = url.searchParams.has("json");

    // Daftar gambar dari repositori GitHub kamu
    const images = [
      "https://raw.githubusercontent.com/xtcodes/random-image/refs/heads/main/images/img1.jpeg",
      "https://raw.githubusercontent.com/xtcodes/random-image/refs/heads/main/images/img2.jpeg",
      "https://raw.githubusercontent.com/xtcodes/random-image/refs/heads/main/images/img3.jpeg",
      "https://raw.githubusercontent.com/xtcodes/random-image/refs/heads/main/images/img4.jpeg"
    ];

    // Pilih gambar acak (atau berdasarkan seed)
    let randomImage;
    if (seed) {
      const index = Math.abs(hashCode(seed)) % images.length;
      randomImage = images[index];
    } else {
      randomImage = images[Math.floor(Math.random() * images.length)];
    }

    // Jika JSON API diminta (contoh: ?json)
    if (isJSON) {
      const link = `${url.origin}/${width}/${height}${gray ? "?gray" : ""}${blur ? "&blur=" + blur : ""}`;
      const data = {
        image: randomImage,
        resized: link,
        width,
        height,
        blur,
        grayscale: gray,
        seed: seed || null,
        timestamp: new Date().toISOString()
      };
      return new Response(JSON.stringify(data, null, 2), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
      });
    }

    try {
      // Gunakan Image Resizing dari Cloudflare
      const requestImage = new Request(randomImage, {
        cf: {
          image: {
            width,
            height,
            fit: "cover",
            quality: 85,
            blur,
            grayscale: gray
          }
        }
      });

      const response = await fetch(requestImage);
      if (!response.ok) throw new Error("Image fetch failed");

      // Header anti-cache supaya gambar selalu berubah
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");
      headers.set("Surrogate-Control", "no-store");
      headers.set("Content-Type", "image/jpeg");

      return new Response(response.body, { headers });
    } catch (e) {
      // Fallback warna acak fade
      const fallback = await createFallbackImage(width, height);
      return new Response(fallback, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-store"
        }
      });
    }
  }
};

// 🔹 Fungsi hashCode untuk seed stabil
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// 🔹 Fallback warna acak fade
async function createFallbackImage(width, height) {
  const randomColor = () => Math.floor(Math.random() * 256);
  const r = randomColor();
  const g = randomColor();
  const b = randomColor();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgb(${r},${g},${b})" stop-opacity="1"/>
          <stop offset="100%" stop-color="rgb(${r},${g},${b})" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#fade)">
        <animate attributeName="opacity" values="1;0.9;1" dur="2s" repeatCount="indefinite"/>
      </rect>
    </svg>
  `;
  return svg;
}
