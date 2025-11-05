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

// Disable any response transformations
app.set('json spaces', 0);
app.set('json replacer', null);

// Create a standard payment requirement object
const createPaymentRequirement = () => {
  return {
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
  };
};

// Create a standard 402 response
const create402Response = () => {
  return {
    x402Version: 1,
    error: "X-PAYMENT header is required",
    accepts: [createPaymentRequirement()]
  };
};

// ------------------------
// Mint endpoint
app.post("/api/mint", async (req, res) => {
  const paymentHeader = req.headers["x-payment"];
  if (!paymentHeader) {
    // Use manual JSON stringification to avoid any Express transformations
    res.status(402);
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(create402Response()));
  }

  const { to, quantity = 1 } = req.body;

  try {
    const tx = await nftContract.mint(quantity, { from: to });
    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      x402Version: 1,
      status: "success",
      message: "NFT minted successfully",
      txHash: tx.hash
    }));
  } catch (err) {
    console.error("Mint error:", err);
    res.status(500);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      x402Version: 1,
      status: "error",
      message: err.message
    }));
  }
});

// ------------------------
// Owner mint (airdrop)
app.post("/api/owner-mint", async (req, res) => {
  const { to, quantity = 1 } = req.body;

  try {
    const tx = await nftContract.ownerMint(to, quantity);
    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      x402Version: 1,
      status: "success",
      message: "NFT owner-minted successfully",
      txHash: tx.hash
    }));
  } catch (err) {
    console.error("Owner mint error:", err);
    res.status(500);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      x402Version: 1,
      status: "error",
      message: err.message
    }));
  }
});

// ------------------------
// Payment verification (mock)
app.get("/api/payment/verify/:txHash", (req, res) => {
  const { txHash } = req.params;

  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
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
  }));
});

// ------------------------
// NFT metadata
app.get("/api/metadata/:tokenId", (req, res) => {
  const { tokenId } = req.params;

  res.status(200);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    tokenId,
    name: `Just Apes #${tokenId}`,
    description: "Exclusive Just Apes NFT",
    image: `https://ipfs.io/ipfs/bafybeig54f3gx5er2mirkm3quqq2vyqxrdevcdsbztfvtmy3y6fpo3qmxm/${tokenId}.png`,
    attributes: [
      { trait_type: "Tier", value: "Citizen" },
      { trait_type: "Utility Access", value: "Premium" }
    ],
    external_url: "https://justapes.vercel.app"
  }));
});

// ------------------------
// x402Scan endpoint with manual JSON response
app.get("/api/x402/scan", (req, res) => {
  // Use manual JSON stringification to avoid any Express transformations
  res.status(402);
  res.setHeader('Content-Type', 'application/json');
  
  // Create a very simple response first to test
  const simpleResponse = {
    x402Version: 1,
    error: "X-PAYMENT header is required",
    accepts: [
      {
        scheme: "exact",
        network: "base",
        maxAmountRequired: MINT_PRICE.toString(),
        payTo: PAY_TO,
        asset: USDC_ADDRESS
      }
    ]
  };
  
  return res.end(JSON.stringify(simpleResponse));
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
