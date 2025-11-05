// api/mint.ts
import express from "express";
import { exact } from "@coinbase/x402/schemes";
import { useFacilitator } from "@coinbase/x402/verify";
import { PaymentRequirements, Price, Resource, settleResponseHeader } from "@coinbase/x402/types";
import { processPriceToAtomicAmount, findMatchingPaymentRequirements } from "@coinbase/x402/shared";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const FACILITATOR_URL = process.env.FACILITATOR_URL!;
const PAY_TO = process.env.ADDRESS!;
const RPC_URL = process.env.RPC_URL!;
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY!;
const USDC_ADDRESS = process.env.USDC_ADDRESS!;
const NFT_CONTRACT = "0x400707dd8bae16b2740e79a54d7a85c57acf3f2c";
const MINT_PRICE_USDC = 0.1;

// x402 facilitator
const { verify, settle } = useFacilitator({
  url: FACILITATOR_URL,
  apiKeyId: process.env.CDP_API_KEY_ID!,
  apiKeySecret: process.env.CDP_API_KEY_SECRET!,
});

// ethers.js
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);
const ERC721_ABI = ["function mint(uint256 quantity) external"];
const nft = new ethers.Contract(NFT_CONTRACT, ERC721_ABI, wallet);

const x402Version = 1;

// ------------------------
// Payment requirement
// ------------------------
function createExactPaymentRequirements(price: Price, network: string, resource: Resource): PaymentRequirements {
  const atomicAmount = processPriceToAtomicAmount(price, network);
  if ("error" in atomicAmount) throw new Error(atomicAmount.error);
  const { maxAmountRequired, asset } = atomicAmount;

  return {
    scheme: "exact",
    network,
    maxAmountRequired,
    resource,
    description: "Mint JustApes NFT",
    mimeType: "",
    payTo: PAY_TO,
    maxTimeoutSeconds: 60,
    asset: asset.address,
    outputSchema: undefined,
    extra: { name: asset.eip712.name, version: asset.eip712.version },
  };
}

// ------------------------
// Verify payment
// ------------------------
async function verifyPayment(req: express.Request, res: express.Response, paymentRequirements: PaymentRequirements[]) {
  const payment = req.header("X-PAYMENT");
  if (!payment) {
    res.status(402).json({ x402Version, error: "X-PAYMENT header required", accepts: paymentRequirements });
    return false;
  }

  let decoded;
  try {
    decoded = exact.evm.decodePayment(payment);
    decoded.x402Version = x402Version;
  } catch (err) {
    res.status(402).json({ x402Version, error: err, accepts: paymentRequirements });
    return false;
  }

  try {
    const selected = findMatchingPaymentRequirements(paymentRequirements, decoded) || paymentRequirements[0];
    const response = await verify(decoded, selected);
    if (!response.isValid) {
      res.status(402).json({ x402Version, error: response.invalidReason, accepts: paymentRequirements, payer: response.payer });
      return false;
    }
  } catch (err) {
    res.status(402).json({ x402Version, error: err, accepts: paymentRequirements });
    return false;
  }

  return true;
}

// -----------------
// /mint Endpoint
// -----------------
app.post("/mint", async (req, res) => {
  try {
    const quantity = parseInt(req.body.quantity ?? "1");
    if (quantity < 1) throw new Error("Quantity must be at least 1");

    const resource = `${req.protocol}://${req.headers.host}${req.originalUrl}` as Resource;

    const paymentRequirements = [
      createExactPaymentRequirements(
        { amount: (MINT_PRICE_USDC * 1e6).toString(), asset: { address: USDC_ADDRESS, decimals: 6, eip712: { name: "USDC", version: "2" } } },
        "base",
        resource
      ),
    ];

    console.log("Verifying payment...");
    const isValid = await verifyPayment(req, res, paymentRequirements);
    if (!isValid) return;
    console.log("Payment verified.");

    console.log("Settling payment...");
    const decoded = exact.evm.decodePayment(req.header("X-PAYMENT")!);
    const settleResponse = await settle(decoded, paymentRequirements[0]);
    res.setHeader("X-PAYMENT-RESPONSE", settleResponseHeader(settleResponse));
    console.log("Payment settled.");

    console.log(`Minting ${quantity} NFT(s)...`);
    const tx = await nft.mint(quantity);
    const receipt = await tx.wait();
    console.log("NFT minted, txHash:", receipt.transactionHash);

    res.status(200).json({ success: true, txHash: receipt.transactionHash, quantity });
  } catch (err: any) {
    console.error("Mint endpoint error:", err);
    res.status(500).json({ error: err.message ?? "Internal Server Error" });
  }
});

export default app;
