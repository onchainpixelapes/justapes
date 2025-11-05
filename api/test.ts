// api/test.ts
import express from "express";
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.get("/", async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL!);
    const wallet = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY!, provider);
    console.log("Wallet OK:", wallet.address);
    res.json({ success: true, wallet: wallet.address });
  } catch (err: any) {
    console.error("Test endpoint error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default app;
