// api/config.js
const { ethers } = require("ethers");

// Env değerleri
const PAY_TO = process.env.ADDRESS;
const NFT_CONTRACT = process.env.NFT_CONTRACT;
const USDC_ADDRESS = process.env.USDC_ADDRESS;
const PROVIDER_URL = process.env.PROVIDER_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const MINT_PRICE = 100000; // 0.1 USDC (6 decimals)

// Provider + Signer
const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// ABI import
const nftAbi = require("../abi/JustApes.json");
const erc20Abi = require("../abi/IERC20.json");

const nftContract = new ethers.Contract(NFT_CONTRACT, nftAbi, signer);
const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20Abi, signer);

// 402 yanıtı için basit obje
const paymentRequirement = {
  scheme: "exact",
  network: "base",
  maxAmountRequired: MINT_PRICE.toString(),
  resource: "https://justapes.vercel.app/api/mint",
  description: "Mint 1 Just Apes NFT 0.1 USDC",
  mimeType: "application/json",
  payTo: PAY_TO,
  maxTimeoutSeconds: 60,
  asset: USDC_ADDRESS
};

module.exports = {
  PAY_TO,
  NFT_CONTRACT,
  USDC_ADDRESS,
  MINT_PRICE,
  nftContract,
  usdcContract,
  paymentRequirement
};