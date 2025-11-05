import express from "express";
import { config } from "dotenv";
import { paymentMiddleware } from "x402-express";
import { ethers } from "ethers";
import IERC20Abi from "../abi/IERC20.json";
import JustApesAbi from "../abi/JustApes.json";

config();

const app = express();
app.use(express.json());

const FACILITATOR_URL = process.env.FACILITATOR_URL!;
const PAY_TO = process.env.ADDRESS! as `0x${string}`;
const NFT_CONTRACT = process.env.NFT_CONTRACT! as `0x${string}`;
const USDC_ADDRESS = process.env.USDC_ADDRESS! as `0x${string}`;
const PROVIDER_URL = process.env.PROVIDER_URL!;

const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const nftContract = new ethers.Contract(NFT_CONTRACT, JustApesAbi, signer);
const usdcContract = new ethers.Contract(USDC_ADDRESS, IERC20Abi, signer);

const MINT_PRICE = 100_000; // 0.1 USDC

app.use(
  paymentMiddleware(PAY_TO, {
    "POST /nft/purchase": {
      price: MINT_PRICE.toString(),
      network: "base",
      asset: {
        address: USDC_ADDRESS,
        decimals: 6,
        eip712: { name: "USDC", version: "1" },
      },
    },
  }, { url: FACILITATOR_URL })
);

// -------------------------
// User mint
// -------------------------
app.post("/nft/purchase", async (req, res) => {
  try {
    const { to, quantity = 1 } = req.body;

    const totalPrice = MINT_PRICE * quantity;
    const allowance = await usdcContract.allowance(to, NFT_CONTRACT);
    if (allowance < totalPrice) return res.status(400).json({ success: false, error: "USDC allowance too low" });

    const tx = await nftContract.mint(quantity, { from: to });
    const receipt = await tx.wait();

    res.json({
      success: true,
      transactionHash: receipt.transactionHash,
      mintedQuantity: quantity,
      tokenIds: Array.from({ length: quantity }, (_, i) => i + 1),
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------
// Owner mint (airdrop)
// -------------------------
app.post("/nft/owner-mint", async (req, res) => {
  try {
    const { to, quantity = 1 } = req.body;
    const tx = await nftContract.ownerMint(to, quantity);
    const receipt = await tx.wait();
    res.json({ success: true, transactionHash: receipt.transactionHash });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default app;
