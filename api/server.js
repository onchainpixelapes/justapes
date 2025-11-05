const express = require("express");
const { config } = require("dotenv");
const { ethers } = require("ethers");

config();

// ------------------------
// x402 mock middleware
// ------------------------
function paymentMiddleware(payTo, routes, options) {
  return (req, res, next) => {
    console.log("x402 mock middleware", req.path);
    next();
  };
}

// ------------------------
// Env
// ------------------------
const FACILITATOR_URL = process.env.FACILITATOR_URL;
const PAY_TO = process.env.ADDRESS;
const NFT_CONTRACT = process.env.NFT_CONTRACT;
const USDC_ADDRESS = process.env.USDC_ADDRESS;
const PROVIDER_URL = process.env.PROVIDER_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const MINT_PRICE = 100_000; // 0.1 USDC

// ------------------------
// Provider + Signer
// ------------------------
const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// ABI import (require)
const nftAbi = require("../abi/JustApes.json");
const erc20Abi = require("../abi/IERC20.json");

const nftContract = new ethers.Contract(NFT_CONTRACT, nftAbi, signer);
const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20Abi, signer);

// ------------------------
// Express app
// ------------------------
const app = express();
app.use(express.json());

// x402 mock middleware
app.use(
  paymentMiddleware(PAY_TO, {
    "POST /nft/purchase": { price: MINT_PRICE.toString() }
  }, { url: FACILITATOR_URL })
);

// ------------------------
// User mint
// ------------------------
app.post("/nft/purchase", async (req, res) => {
  try {
    const { to, quantity = 1 } = req.body;

    const totalPrice = MINT_PRICE * quantity;
    const allowance = await usdcContract.allowance(to, NFT_CONTRACT);
    if (allowance.lt(totalPrice)) {
      return res.status(400).json({ success: false, error: "USDC allowance too low" });
    }

    const tx = await nftContract.mint(quantity, { from: to });
    const receipt = await tx.wait();

    res.json({
      success: true,
      transactionHash: receipt.transactionHash,
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
// ------------------------
app.post("/nft/owner-mint", async (req, res) => {
  try {
    const { to, quantity = 1 } = req.body;
    const tx = await nftContract.ownerMint(to, quantity);
    const receipt = await tx.wait();
    res.json({ success: true, transactionHash: receipt.transactionHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = app;
