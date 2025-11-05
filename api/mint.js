// api/mint.js
const { nftContract, paymentRequirement } = require('./config');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-payment');
  res.setHeader('Content-Type', 'application/json');
  
  // OPTIONS için yanıt
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // POST işlemi
  if (req.method === 'POST') {
    const paymentHeader = req.headers["x-payment"];
    if (!paymentHeader) {
      return res.status(402).json({
        x402Version: 1,
        error: "X-PAYMENT header is required",
        accepts: [paymentRequirement]
      });
    }

    try {
      const { to, quantity = 1 } = req.body;
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
  }
  
  // Diğer HTTP metodları için
  return res.status(405).json({ error: "Method not allowed" });
};