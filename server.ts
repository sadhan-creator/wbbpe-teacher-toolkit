import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());
  
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "WBBPE Teacher Calendar 2026" });
  });

  app.get("/api/notices", async (_req, res) => {
    try {
      const response = await fetch('https://drive.google.com/embeddedfolderview?id=1n4GnPQeu_XWgUx_mDW7_Omm8HvLJ7hRv#list', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (!response.ok) throw new Error("Failed to fetch from Drive");
      const html = await response.text();
      res.send(html);
    } catch (error: any) {
      console.error("Proxy fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
