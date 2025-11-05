// api/mint.ts
import express from "express";
import { exact } from "x402/schemes";
import { useFacilitator } from "x402/verify";
import { PaymentPayload, PaymentRequirements, Price, Resource, settleResponseHeader } from "x402/types";
import { processPriceToAtomicAmount, findMatchingPaymentRequirements } from "x402/shared";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const FACILITATOR_URL = process.env.FACILITATOR_URL!;
const PAY_TO = process.env.ADDRESS!;
const RPC_URL = process.env.RPC_URL!;
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY!;
const NFT_CONTRACT = "0x400707dd8bae16b2740e79a54d7a85c57acf3f2c";
const USDC_ADDRESS = process.env.USDC_ADDRESS!;
const MINT_PRICE_USDC = 0.1;

if (!FACILITATOR_URL || !PAY_TO || !RPC_URL || !MINTER_PRIVATE_KEY || !USDC_ADDRESS) {
  throw new Error("Missing required environment variables");
}

const { verify, settle } = useFacilitator({ url: FACILITATOR_URL });
const x402Version = 1;

// ethers setup
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);
const ERC721_ABI = ["function mint(uint256 quantity) external"];
const nft = new ethers.Contract(NFT_CONTRACT, ERC721_ABI, wallet);

// Express app
const app = express();
app.use(express.json());

// ------------------------
// PAYMENT HELPERS
// ------------------------
function createExactPaymentRequirements(
  price: Price,
  network: string,
  resource: Resource,
  description = ""
): PaymentRequirements {
  const atomicAmountForAsset = processPriceToAtomicAmount(price, network);
  if ("error" in atomicAmountForAsset) throw new Error(atomicAmountForAsset.error);
  const { maxAmountRequired, asset } = atomicAmountForAsset;

  return {
    scheme: "exact",
    network,
    maxAmountRequired,
    resource,
    description,
    mimeType: "",
    payTo: PAY_TO,
    maxTimeoutSeconds: 60,
    asset: asset.address,
    outputSchema: undefined,
    extra: { name: asset.eip712.name, version: asset.eip712.version },
  };
}

async function verifyPayment(req: express.Request, res: express.Response, paymentRequirements: PaymentRequirements[]) {
  const payment = req.header("X-PAYMENT");
  if (!payment) {
    res.status(402).json({ x402Version, error: "X-PAYMENT header required", accepts: paymentRequirements });
    return false;
  }

  let decodedPayment: PaymentPayload;
  try {
    decodedPayment = exact.evm.decodePayment(payment);
    decodedPayment.x402Version = x402Version;
  } catch (err) {
    res.status(402).json({ x402Version, error: err, accepts: paymentRequirements });
    return false;
  }

  try {
    const selectedPaymentRequirement =
      findMatchingPaymentRequirements(paymentRequirements, decodedPayment) || paymentRequirements[0];
    const response = await verify(decodedPayment, selectedPaymentRequirement);
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

// ------------------------
// /mint ENDPOINT
// ------------------------
app.post("/mint", async (req, res) => {
  const quantity = parseInt(req.body.quantity ?? "1");
  const resource = `${req.protocol}://${req.headers.host}${req.originalUrl}` as Resource;

  const paymentRequirements = [
    createExactPaymentRequirements(
      {
        amount: (MINT_PRICE_USDC * 1e6).toString(),
        asset: { address: USDC_ADDRESS, decimals: 6, eip712: { name: "USDC", version: "2" } },
      },
      "base", // Base mainnet
      resource,
      "Mint JustApes NFT"
    ),
  ];

  const isValid = await verifyPayment(req, res, paymentRequirements);
  if (!isValid) return;

  try {
    const decodedPayment = exact.evm.decodePayment(req.header("X-PAYMENT")!);
    const settleResponse = await settle(decodedPayment, paymentRequirements[0]);
    res.setHeader("X-PAYMENT-RESPONSE", settleResponseHeader(settleResponse));

    const tx = await nft.mint(quantity);
    const receipt = await tx.wait();

    res.status(200).json({ success: true, txHash: receipt.transactionHash, quantity });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Mint failed" });
  }
});

export default app;
