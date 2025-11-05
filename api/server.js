// api/server.js
const express = require("express");
const { ethers } = require("ethers");

// ------------------------
// Env değerleri
const PAY_TO = process.env.ADDRESS;
const NFT_CONTRACT = process.env.NFT_CONTRACT;
const USDC_ADDRESS = process.env.USDC_ADDRESS;
const PROVIDER_URL = process.env.PROVIDER_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const MINT_PRICE = 100000; // 0.1 USDC (6 decimals)

// ------------------------
// Express app
const app = express();
app.use(express.json());

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

// ------------------------
// Mint endpoint
app.post("/api/mint", async (req, res) => {
  const paymentHeader = req.headers["x-payment"];
  if (!paymentHeader) {
    return res.status(402).json({
      x402Version: 1,
      error: "X-PAYMENT header is required",
      accepts: [{
        scheme: "exact",
        network: "base",
        maxAmountRequired: MINT_PRICE.toString(),
        resource: "https://justapes.vercel.app/api/mint",
        description: "Mint 1 Just Apes NFT 0.1 USDC",
        mimeType: "application/json",
        payTo: PAY_TO,
        maxTimeoutSeconds: 60,
        asset: USDC_ADDRESS
      }]
    });
  }

  try {
    // Burada gerçek mint işlemi yapılacak
    // Şimdilik mock yanıt dönelim
    return res.status(200).json({
      x402Version: 1,
      status: "success",
      message: "NFT minted successfully",
      txHash: "0x123456789"
    });
  } catch (err) {
    console.error("Mint error:", err);
    return res.status(500).json({
      x402Version: 1,
      status: "error",
      message: err.message
    });
  }
});

// ------------------------
// Owner mint (airdrop)
app.post("/api/owner-mint", async (req, res) => {
  const { to, quantity = 1 } = req.body;

  try {
    // Burada gerçek owner mint işlemi yapılacak
    // Şimdilik mock yanıt dönelim
    return res.status(200).json({
      x402Version: 1,
      status: "success",
      message: "NFT owner-minted successfully",
      txHash: "0x123456789"
    });
  } catch (err) {
    console.error("Owner mint error:", err);
    return res.status(500).json({
      x402Version: 1,
      status: "error",
      message: err.message
    });
  }
});

// ------------------------
// Payment verification (mock)
app.get("/api/payment/verify/:txHash", (req, res) => {
  const { txHash } = req.params;

  return res.status(200).json({
    x402Version: 1,
    paymentStatus: "confirmed",
    transaction: {
      hash: txHash,
      status: "success",
      blockConfirmations: 1,
      amount: MINT_PRICE,
      currency: "USDC",
      fromAddress: "0xUserWallet",
      toAddress: PAY_TO
    },
    nftEligibility: true
  });
});

// ------------------------
// NFT metadata
app.get("/api/metadata/:tokenId", (req, res) => {
  const { tokenId } = req.params;

  return res.status(200).json({
    tokenId,
    name: `Just Apes #${tokenId}`,
    description: "Exclusive Just Apes NFT",
    image: `https://ipfs.io/ipfs/bafybeig54f3gx5er2mirkm3quqq2vyqxrdevcdsbztfvtmy3y6fpo3qmxm/${tokenId}.png`,
    attributes: [
      { trait_type: "Tier", value: "Citizen" },
      { trait_type: "Utility Access", value: "Premium" }
    ],
    external_url: "https://justapes.vercel.app"
  });
});

// ------------------------
// x402Scan endpoint
app.get("/api/x402/scan", (req, res) => {
  return res.status(402).json({
    x402Version: 1,
    error: "Payment required",
    accepts: [{
      scheme: "exact",
      network: "base",
      maxAmountRequired: MINT_PRICE.toString(),
      payTo: PAY_TO,
      asset: USDC_ADDRESS
    }]
  });
});

// Vercel için export
// Express'i doğrudan export ediyoruz
module.exports = app;
