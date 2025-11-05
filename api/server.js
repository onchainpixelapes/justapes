const express = require("express");
const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-payment");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  next();
});

// x402 standardına uygun yanıt
const createX402Response = () => {
  return {
    x402Version: 1,
    error: "Payment required",
    accepts: [
      {
        scheme: "exact",
        network: "base",
        maxAmountRequired: "100000",
        resource: "https://your-site.vercel.app/api/mint",
        description: "Mint 1 Just Apes NFT for 0.1 USDC",
        mimeType: "application/json",
        payTo: process.env.ADDRESS || "0xYourAddressHere",
        maxTimeoutSeconds: 60,
        asset: process.env.USDC_ADDRESS || "0xUSDCAddressHere",
        outputSchema: {
          input: { type: "http", method: "POST" },
          output: {
            x402Version: "number",
            status: "string",
            message: "string",
            txHash: "string"
          }
        },
        extra: { name: "USD Coin", version: "2", symbol: "USDC", decimals: 6 }
      }
    ]
  };
};

// x402Scan endpoint
app.get("/api/x402/scan", (req, res) => {
  // Manuel JSON yanıtı
  res.status(402);
  res.setHeader('Content-Type', 'application/json');
  
  const response = createX402Response();
  return res.end(JSON.stringify(response));
});

// Alternatif x402Scan endpoint
app.get("/x402scan", (req, res) => {
  // Manuel JSON yanıtı
  res.status(402);
  res.setHeader('Content-Type', 'application/json');
  
  const response = createX402Response();
  return res.end(JSON.stringify(response));
});

// Ana sayfa
app.get("/", (req, res) => {
  return res.json({
    message: "API is running",
    endpoints: {
      x402scan: "/api/x402/scan",
      alternativeX402scan: "/x402scan"
    }
  });
});

// Catch-all route
app.use("*", (req, res) => {
  return res.status(404).json({
    error: "Not Found",
    message: `The requested endpoint ${req.path} does not exist.`
  });
});

// Vercel için export
module.exports = app;
