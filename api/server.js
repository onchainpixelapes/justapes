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

// x402Scan endpoint - Çok basit format
app.get("/api/x402/scan", (req, res) => {
  // Content-Type başlığını açıkça belirtelim
  res.setHeader('Content-Type', 'application/json');
  
  // 402 status kodu ile basit bir JSON yanıtı
  return res.status(402).json({
    x402Version: 1,
    error: "Payment required",
    accepts: [
      {
        scheme: "exact",
        network: "base",
        maxAmountRequired: "100000",
        payTo: process.env.ADDRESS || "0xYourAddressHere",
        asset: process.env.USDC_ADDRESS || "0xUSDCAddressHere"
      }
    ]
  });
});

// Alternatif x402Scan endpoint - Kök dizinde
app.get("/x402scan", (req, res) => {
  // Content-Type başlığını açıkça belirtelim
  res.setHeader('Content-Type', 'application/json');
  
  // 402 status kodu ile basit bir JSON yanıtı
  return res.status(402).json({
    x402Version: 1,
    error: "Payment required",
    accepts: [
      {
        scheme: "exact",
        network: "base",
        maxAmountRequired: "100000",
        payTo: process.env.ADDRESS || "0xYourAddressHere",
        asset: process.env.USDC_ADDRESS || "0xUSDCAddressHere"
      }
    ]
  });
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
