const express = require("express");
const { ethers } = require("ethers");

// ------------------------
// x402 mock middleware
// ------------------------
function paymentMiddleware(payTo, routes, options) {
  return (req, res, next) => {
    console.log("x402 mock middleware hit:", req.path);
    next();
  };
}

// ------------------------
// Env değerleri (Vercel üzerinden)
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

// x402 mock middleware
app.use(paymentMiddleware(PAY_TO, {}, { url: FACILITATOR_URL }));

// ------------------------
// User mint
app.post("/api/purchase", async (req, res) => {
  try {
    const { to, quantity = 1 } = req.body;

    const totalPrice = MINT_PRICE * quantity;
    console.log(`Mint request: to=${to}, quantity=${quantity}, totalPrice=${totalPrice}`);

    const tx = await nftContract.mint(quantity, { from: to });
    res.json({
      success: true,
      transactionHash: tx.hash,
      mintedQuantity: quantity,
      tokenIds: Array.from({ length: quantity }, (_, i) => i + 1)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------
// Owner mint (airdrop)
app.post("/api/owner-mint", async (req, res) => {
  try {
    const { to, quantity = 1 } = req.body;
    const tx = await nftContract.ownerMint(to, quantity);
    res.json({
      success: true,
      transactionHash: tx.hash
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------------
// Payment verification (mock)
app.get("/api/payment/verify/:txHash", (req, res) => {
  const { txHash } = req.params;
  res.json({
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
              to: { type: "string", required: true, description: "Wallet address receiving the NFT" },
              quantity: { type: "number", required: false, description: "Number of NFTs to mint" }
            }
          },
          output: {
            success: true,
            transactionHash: "string",
            mintedQuantity: "number",
            tokenIds: ["string"]
          }
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
        asset: "USDC",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              to: { type: "string", required: true },
              quantity: { type: "number", required: true }
            }
          },
          output: {
            success: true,
            transactionHash: "string"
          }
        }
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
