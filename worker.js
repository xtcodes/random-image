export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    // Ambil width & height dari path (/400/300)
    const width = parseInt(parts[0]) || 400;
    const height = parseInt(parts[1]) || 300;

    // Ambil query parameter opsional (blur, gray)
    const blur = parseInt(url.searchParams.get("blur")) || 0;
    const gray = url.searchParams.has("gray");

    // Daftar gambar dari GitHub kamu
    const images = [
      "https://raw.githubusercontent.com/verdonks/twibbon-gallery/main/img1.jpg",
      "https://raw.githubusercontent.com/verdonks/twibbon-gallery/main/img2.jpg",
      "https://raw.githubusercontent.com/verdonks/twibbon-gallery/main/img3.jpg",
      "https://raw.githubusercontent.com/verdonks/twibbon-gallery/main/img4.jpg"
    ];

    // Pilih gambar acak
    const randomImage = images[Math.floor(Math.random() * images.length)];

    try {
      // Gunakan fitur Image Resizing bawaan Cloudflare
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

      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "public, max-age=3600");
      headers.set("Content-Type", "image/jpeg");

      return new Response(response.body, { headers });
    } catch (e) {
      // Fallback: gambar warna acak gradasi dengan efek fade
      const fallback = await createFallbackImage(width, height);
      return new Response(fallback, { headers: { "Content-Type": "image/svg+xml" } });
    }
  }
};

// Membuat fallback gambar warna acak + efek fade-out lembut
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
