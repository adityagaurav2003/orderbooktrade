const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const TICKER = "GOOGLE";

// raw body parser for webhook ONLY
app.use('/webhook/payment', express.raw({ type: '*/*' }));
app.use(bodyParser.json());

const users = [
  { id: "1", balances: { "GOOGLE": 10, "USD": 50000 } },
  { id: "2", balances: { "GOOGLE": 10, "USD": 50000 } }
];

const bids = [];
const asks = [];
const processedEvents = new Set();

// ------------------ PAYMENT WEBHOOK ------------------
function verifySignature(secret, timestamp, body, signature) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(timestamp + "." + body)
    .digest("hex");

  // avoid crash when signature length differs
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

app.post("/webhook/payment", (req, res) => {
  const secret = process.env.WEBHOOK_SECRET || "local-secret";
  const sig = req.headers["x-signature"];
  const ts = req.headers["x-timestamp"];

  if (!ts || Math.abs(Date.now() - Number(ts)) > 5 * 60 * 1000) {
    return res.status(400).end("stale");
  }

  const bodyStr = req.body.toString();
  if (!verifySignature(secret, ts, bodyStr, sig || "")) {
    return res.status(401).end("bad sig");
  }

  res.status(200).end("ok"); // ACK immediately

  setImmediate(() => {
    let payload;
    try { payload = JSON.parse(bodyStr); } catch { return; }

    const eventId = payload.id;
    if (!eventId || processedEvents.has(eventId)) return;
    processedEvents.add(eventId);

    if (payload.type === "payment.succeeded") {
      const { userId, amount } = payload.data || {};
      const user = users.find(u => u.id === String(userId));
      if (user) user.balances.USD += Number(amount || 0);
    }
  });
});
// ------------------------------------------------------

// ------------------ ORDER ENDPOINTS -------------------
app.post("/order", (req, res) => {
  const { side, price, quantity, userId } = req.body;
  const remainingQty = fillOrders(side, price, quantity, userId);

  if (remainingQty === 0) {
    return res.json({ filledQuantity: quantity });
  }

  const order = { userId, price, quantity: remainingQty };

  if (side === "bid") {
    bids.push(order);
    bids.sort((a, b) => b.price - a.price);
  } else {
    asks.push(order);
    asks.sort((a, b) => a.price - b.price);
  }

  res.json({ filledQuantity: quantity - remainingQty });
});

app.get("/depth", (req, res) => {
  const depth = {};
  [...bids, ...asks].forEach(order => {
    if (!depth[order.price]) {
      depth[order.price] = {
        type: bids.includes(order) ? "bid" : "ask",
        quantity: 0
      };
    }
    depth[order.price].quantity += order.quantity;
  });
  res.json({ depth });
});

app.get("/balance/:userId", (req, res) => {
  const user = users.find(u => u.id === req.params.userId);
  res.json({
    balances: user ? user.balances : { "USD": 0, [TICKER]: 0 }
  });
});

app.post("/quote", (req, res) => {
  const { side, quantity } = req.body;

  if (side === "bid") {
    if (!asks.length) return res.json({ quote: 0 });
    return res.json({ quote: asks[0].price * quantity });
  }

  if (side === "ask") {
    if (!bids.length) return res.json({ quote: 0 });
    return res.json({ quote: bids[0].price * quantity });
  }

  return res.status(400).json({ quote: 0 });
});

// ----------------- MATCHING ENGINE --------------------
function fillOrders(side, price, quantity, userId) {
  const orders = side === "bid" ? asks : bids;
  let remainingQty = quantity;

  while (orders.length && remainingQty > 0) {
    const best = orders[0];

    if (side === "bid") {
      if (best.price > price) break;
    } else {
      if (best.price < price) break;
    }

    const fillQty = Math.min(best.quantity, remainingQty);

    const buyerId = side === "bid" ? userId : best.userId;
    const sellerId = side === "bid" ? best.userId : userId;

    flipBalance(sellerId, buyerId, fillQty, best.price);

    best.quantity -= fillQty;
    remainingQty -= fillQty;

    if (best.quantity === 0) orders.shift();
  }

  return remainingQty;
}

function flipBalance(sellerId, buyerId, quantity, price) {
  const seller = users.find(u => u.id === sellerId);
  const buyer = users.find(u => u.id === buyerId);
  if (!seller || !buyer) return;

  seller.balances[TICKER] -= quantity;
  seller.balances.USD += quantity * price;

  buyer.balances[TICKER] += quantity;
  buyer.balances.USD -= quantity * price;
}

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = { app, TICKER };
