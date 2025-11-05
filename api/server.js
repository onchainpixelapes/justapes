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
// Provider + Signer
const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// ABI import
const nftAbi = require("../abi/JustApes.json");
const erc20Abi = require("../abi/IERC20.json");

const nftContract = new ethers.Contract(NFT_CONTRACT, nftAbi, signer);
const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20Abi, signer);

// ------------------------
// Express app
const app = express();
app.use(express.json());

// Add content type header
app.use((req, res, next) => {
  res.header("Content-Type", "application/json");
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  res.status(500).json({
    x402Version: 1,
    status: "error",
    message: "Server error: " + err.message
  });
});

// ------------------------
// Mint endpoint
app.post("/api/mint", async (req, res) => {
  const paymentHeader = req.headers["x-payment"];
  if (!paymentHeader) {
    const response = {
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
            input: { type: "http", method: "GET" },
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
    console.log("Sending 402 response:", JSON.stringify(response, null, 2));
    return res.status(402).json(response);
  }

  const { to, quantity = 1 } = req.body;

  try {
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
// Owner mint (airdrop)
app.post("/api/owner-mint", async (req, res) => {
  const { to, quantity = 1 } = req.body;

  try {
    const tx = await nftContract.ownerMint(to, quantity);
    res.json({
      x402Version: 1,
      status: "success",
      message: "NFT owner-minted successfully",
      txHash: tx.hash
    });
  } catch (err) {
    console.error("Owner mint error:", err);
    res.status(500).json({
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

  res.json({
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

  res.json({
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
// x402Scan endpoint (simplified for debugging)
app.get("/api/x402/scan", (req, res) => {
  const response = {
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
          input: { type: "http", method: "GET" },
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
  
  console.log("Sending x402 scan response:", JSON.stringify(response, null, 2));
  return res.status(402).json(response);
});

// Environment variable check on startup
app.listen(process.env.PORT || 3000, () => {
  console.log("Server started on port", process.env.PORT || 3000);
  
  // Verify environment variables are set
  const requiredEnvVars = ['ADDRESS', 'NFT_CONTRACT', 'USDC_ADDRESS', 'PROVIDER_URL', 'PRIVATE_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error("WARNING: Missing environment variables:", missingVars.join(", "));
  } else {
    console.log("All required environment variables are set");
    console.log("PAY_TO address:", PAY_TO);
    console.log("USDC address:", USDC_ADDRESS);
  }
});

module.exports = app;
