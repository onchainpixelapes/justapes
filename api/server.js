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

// Basit bir log middleware'i
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.path}`);
  next();
});

// x402Scan endpoint
app.get("/api/x402/scan", (req, res) => {
  console.log("x402scan endpoint çağrıldı");
  return res.status(402).json({
    x402Version: 1,
    error: "Payment required",
    accepts: [{
      scheme: "exact",
      network: "base",
      maxAmountRequired: "100000",
      payTo: process.env.ADDRESS || "0xYourAddressHere",
      asset: process.env.USDC_ADDRESS || "0xUSDCAddressHere"
    }]
  });
});

// Alternatif x402Scan endpoint
app.get("/x402scan", (req, res) => {
  console.log("Alternatif x402scan endpoint çağrıldı");
  return res.status(402).json({
    x402Version: 1,
    error: "Payment required",
    accepts: [{
      scheme: "exact",
      network: "base",
      maxAmountRequired: "100000",
      payTo: process.env.ADDRESS || "0xYourAddressHere",
      asset: process.env.USDC_ADDRESS || "0xUSDCAddressHere"
    }]
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
    message: `The requested endpoint ${req.path} does not exist.`,
    availableEndpoints: ["/", "/api/x402/scan", "/x402scan"]
  });
});

// Vercel için export
module.exports = app;

// Sadece yerel geliştirme için port dinleme
// Bu kısım Vercel'de çalışırken kullanılmaz
if (process.env.NODE_ENV !== "production" && require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Local development server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT}/api/x402/scan to see payment requirements`);
  });
}
