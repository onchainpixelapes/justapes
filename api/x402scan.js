// api/x402scan.js
const { paymentRequirement } = require('./config');

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');
  
  // Çok basit 402 yanıtı
  return res.status(402).json({
    x402Version: 1,
    error: "Payment required",
    accepts: [paymentRequirement]
  });
};