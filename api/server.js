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
let provider, signer, nftContract, usdcContract;

try {
  // Provider ve signer'ı sadece gerektiğinde başlat
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
    return { provider, signer, nftContract, usdcContract };
  };
} catch (error) {
  console.error("Blockchain initialization error:", error);
}

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  res.status(500).json({
    x402Version: 1,
    status: "error",
    message: "Server error: " + err.message
  });
});

// Standart ödeme gereksinimleri
const getPaymentRequirements = () => {
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
      input: { type: "http", method: "POST" },
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

// ------------------------
// Mint endpoint
app.post("/api/mint", async (req, res) => {
  const paymentHeader = req.headers["x-payment"];
  if (!paymentHeader) {
    return res.status(402).json({
      x402Version: 1,
      error: "X-PAYMENT header is required",
      accepts: [getPaymentRequirements()]
    });
  }

  try {
    const { to, quantity = 1 } = req.body;
    
    // Blockchain işlemleri için provider ve contract'ları başlat
    const { nftContract } = initBlockchain();
    
    // Gerçek mint işlemi
    const tx = await nftContract.mint(quantity, { from: to });
    
    return res.status(200).json({
      x402Version: 1,
      status: "success",
      message: "NFT minted successfully",
      txHash: tx.hash
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
    // Blockchain işlemleri için provider ve contract'ları başlat
    const { nftContract } = initBlockchain();
    
    // Gerçek owner mint işlemi
    const tx = await nftContract.ownerMint(to, quantity);
    
    return res.status(200).json({
      x402Version: 1,
      status: "success",
      message: "NFT owner-minted successfully",
      txHash: tx.hash
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
// x402Scan endpoint - API yolu
app.get("/api/x402/scan", (req, res) => {
  return res.status(402).json({
    x402Version: 1,
    error: "Payment required",
    accepts: [getPaymentRequirements()]
  });
});

// ------------------------
// x402Scan endpoint - Alternatif yol
app.get("/x402scan", (req, res) => {
  return res.status(402).json({
    x402Version: 1,
    error: "Payment required",
    accepts: [getPaymentRequirements()]
  });
});

// ------------------------
// Ana sayfa
app.get("/", (req, res) => {
  res.send("Just Apes API is running. Visit /api/x402/scan or /x402scan to see payment requirements.");
});

// Catch-all route for 404
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `The requested endpoint ${req.path} does not exist.`
  });
});

// Vercel için export
module.exports = app;

// Eğer doğrudan çalıştırılıyorsa (development)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT}/api/x402/scan to see payment requirements`);
  });
}
