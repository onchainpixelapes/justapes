const express = require("express");
const { ethers } = require("ethers");

// ------------------------
// Env değerleri
const FACILITATOR_URL = process.env.FACILITATOR_URL;
const PAY_TO = process.env.ADDRESS;
const NFT_CONTRACT = process.env.NFT_CONTRACT;
const USDC_ADDRESS = process.env.USDC_ADDRESS;
const PROVIDER_URL = process.env.PROVIDER_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const MINT_PRICE = 100_000; // 0.1 USDC

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
// X402 Payment Check Middleware
function x402Check(req, res, next) {
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
          resource: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
          description: `Mint 1 Just Apes NFT ${MINT_PRICE / 1000000} USDC`,
          mimeType: "application/json",
          payTo: PAY_TO,
          maxTimeoutSeconds: 300,
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
          extra: {
            name: "USD Coin",
            version: "2",
            symbol: "USDC",
            decimals: 6
          }
        }
      ]
    });
  }

  next();
}

// ------------------------
// User mint
app.post("/api/purchase", x402Check, async (req, res) => {
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
app.get("/api/nft/metadata/:tokenId", (req, res) => {
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
    external_url: "https://yourprojectsite.com"
  });
});

// ------------------------
// x402Scan endpoint
app.get("/api/x402/scan", (req, res) => {
  res.json({
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: "base",
        maxAmountRequired: MINT_PRICE.toString(),
        resource: "/api/purchase",
        description: "Mint Just Apes NFT",
        mimeType: "application/json",
        payTo: PAY_TO,
        maxTimeoutSeconds: 300,
        asset: "USDC",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              to: { type: "string", required: true },
              quantity: { type: "number", required: false }
            }
          },
          output: {
            x402Version: "number",
            status: "string",
            message: "string",
            txHash: "string"
          }
        },
        extra: {
          name: "USD Coin",
          version: "2",
          symbol: "USDC",
          decimals: 6
        }
      },
      {
        scheme: "exact",
        network: "base",
        maxAmountRequired: "0",
        resource: "/api/owner-mint",
        description: "Owner mint (airdrop) Just Apes NFT",
        mimeType: "application/json",
        payTo: PAY_TO,
        maxTimeoutSeconds: 300,
        asset: "USDC"
      },
      {
        scheme: "exact",
        network: "base",
        maxAmountRequired: "0",
        resource: "/api/nft/metadata/:tokenId",
        description: "Retrieve NFT metadata",
        mimeType: "application/json",
        payTo: PAY_TO,
        maxTimeoutSeconds: 60,
        asset: "USDC"
      }
    ]
  });
});

module.exports = app;
