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

// ------------------------
// Mint endpoint
app.post("/api/mint", async (req, res) => {
  const paymentHeader = req.headers["x-payment"];
  if (!paymentHeader) {
    return res.status(402).json({
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
    });
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
// x402Scan endpoint (her zaman 402 JSON)
app.get("/api/x402/scan", (req, res) => {
  return res.status(402).json({
    x402Version: 1,
    error: "X-PAYMENT header is required",
    accepts: [
      {
        scheme: "exact",
        network: "base",
        maxAmountRequired: MINT_PRICE.toString(),
        resource: "https://justapes.vercel.app/api/x402/scan",
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
  });
});

module.exports = app;

