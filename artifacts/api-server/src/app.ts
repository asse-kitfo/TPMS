import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get(["/qr", "/api/qr"], (_req, res) => {
  const expoDevDomain = process.env.REPLIT_EXPO_DEV_DOMAIN || "";
  let tunnelUrl = expoDevDomain ? `exp://${expoDevDomain}` : "";
  if (!tunnelUrl) {
    try {
      tunnelUrl = fs.readFileSync("/tmp/expo-tunnel-url.txt", "utf8").trim();
    } catch {
      tunnelUrl = "";
    }
  }

  const qrImgSrc = tunnelUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(tunnelUrl)}`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ApexTerm — Scan to Open</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0a0a;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      gap: 20px;
    }
    .logo { font-size: 13px; letter-spacing: 0.15em; color: #555; text-transform: uppercase; }
    .logo span { color: #00d4aa; }
    h1 { font-size: 22px; font-weight: 700; }
    .sub { font-size: 14px; color: #888; text-align: center; line-height: 1.6; }
    .qr-wrap {
      background: #fff;
      border-radius: 16px;
      padding: 12px;
      width: 244px;
      height: 244px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-wrap img { display: block; border-radius: 4px; }
    .url {
      font-size: 10px;
      color: #333;
      word-break: break-all;
      text-align: center;
      max-width: 280px;
    }
    .badge {
      background: #111;
      border: 1px solid #1e1e1e;
      border-radius: 10px;
      padding: 14px 18px;
      font-size: 13px;
      color: #777;
      text-align: center;
      line-height: 1.8;
      max-width: 300px;
    }
    .badge strong { color: #fff; display: block; margin-bottom: 6px; font-size: 14px; }
    a { color: #00d4aa; text-decoration: none; }
  </style>
</head>
<body>
  <div class="logo"><span>APEX</span>TERM</div>
  <h1>Open in Expo Go</h1>
  ${tunnelUrl ? `
  <p class="sub">Scan with <strong>Expo Go</strong> on your Android device</p>
  <div class="qr-wrap">
    <img src="${qrImgSrc}" width="220" height="220" alt="QR Code" />
  </div>
  <p class="url">${tunnelUrl}</p>
  <div class="badge">
    <strong>Steps</strong>
    1. Install <strong>Expo Go</strong> from the Play Store<br/>
    2. Open Expo Go → tap <strong>"Scan QR code"</strong><br/>
    3. Point your camera at the code above
  </div>
  ` : `
  <div class="badge">
    <strong>Server starting…</strong>
    The Expo dev server is still warming up.<br/>
    <a href="javascript:location.reload()">Tap here to refresh</a>
  </div>
  `}
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

app.use("/api", router);

export default app;
