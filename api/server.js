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
// Provider + Signer (Lazy initialization to avoid errors if env vars are missing)
let provider, signer, nftContract, usdcContract;
const initBlockchain = () => {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // ABI import
    const nftAbi = require("../abi/JustApes.json");
    const erc20Abi = require("../abi/IERC20.json");

    nftContract = new ethers.Contract(NFT_CONTRACT, nftAbi, signer);
    usdcContract = new ethers.Contract(USDC_ADDRESS, erc20Abi, signer);
  }
  return { nftContract, usdcContract };
};

// ------------------------
// Express app
const app = express();
app.use(express.json());

// CORS middleware (Essential for x402scan.com)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-payment");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  next();
});

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ------------------------
// x402 Response Helper
function x402Response() {
  return {
    x402Version: 1,
    error: "X-PAYMENT header is required",
    accepts: [
      {
        scheme: "exact",
        network: "base",
        maxAmountRequired: MINT_PRICE.toString(),
        resource: "https://justapes.vercel.app/api/mint",
        description: "Mint 1 Just Apes NFT 0.1 USDC",
        mimeType: "application/json",
        payTo: PAY_TO,
        maxTimeoutSeconds: 60,
        asset: USDC_ADDRESS,
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
}

// x402Scan endpoint (GET and POST support) - Adjusted for Vercel routing (req.path = /x402/scan)
app.get("/x402/scan", (req, res) => res.status(402).json(x402Response()));
app.post("/x402/scan", (req, res) => res.status(402).json(x402Response()));

// ------------------------
// Mint endpoint - Adjusted for Vercel routing (req.path = /mint)
app.post("/mint", async (req, res) => {
  const paymentHeader = req.headers["x-payment"];
  if (!paymentHeader) {
    return res.status(402).json(x402Response());
  }

  const { to, quantity = 1 } = req.body;

  try {
    const { nftContract } = initBlockchain();
    const tx = await nftContract.mint(quantity, { from: to });
    res.json({
      x402Version: 1,
      status: "success",
      message: "NFT minted successfully",
      txHash: tx.hash
    });
  } catch (err) {
    console.error("Mint error:", err);
    res.status(500).json({
      x402Version: 1,
      status: "error",
      message: err.message
    });
  }
});

// ------------------------
// Owner mint (airdrop) - 
