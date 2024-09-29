const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const TICKER = "GOOGLE";

app.use(bodyParser.json());

const users = [
  { id: "1", balances: { "GOOGLE": 10, "USD": 50000 } },
  { id: "2", balances: { "GOOGLE": 10, "USD": 50000 } }
];

const bids = [], asks = [];

// Place a limit order
app.post("/order", (req, res) => {
  const { side, price, quantity, userId } = req.body;
  const remainingQty = fillOrders(side, price, quantity, userId);

  if (remainingQty === 0) return res.json({ filledQuantity: quantity });

  const order = { userId, price, quantity: remainingQty };
  side === "bid" ? bids.push(order) : asks.push(order);
  (side === "bid" ? bids : asks).sort((a, b) => side === "bid" ? b.price - a.price : a.price - b.price);

  res.json({ filledQuantity: quantity - remainingQty });
});

// Get depth of the order book
app.get("/depth", (req, res) => {
  const depth = {};
  [...bids, ...asks].forEach(order => {
    if (!depth[order.price]) depth[order.price] = { type: bids.includes(order) ? "bid" : "ask", quantity: 0 };
    depth[order.price].quantity += order.quantity;
  });
  res.json({ depth });
});

// Get balance of a user
app.get("/balance/:userId", (req, res) => {
  const user = users.find(u => u.id === req.params.userId);
  res.json({ balances: user ? user.balances : { "USD": 0, [TICKER]: 0 } });
});

// Placeholder for quote (not implemented)
app.get("/quote", (req, res) => {
  res.json({ message: "Quote feature not implemented yet." });
});

// Fill orders and adjust balances
function fillOrders(side, price, quantity, userId) {
  const orders = side === "bid" ? asks : bids;
  let remainingQty = quantity;

  while (orders.length && ((side === "bid" && orders[orders.length - 1].price <= price) || (side === "ask" && orders[orders.length - 1].price >= price))) {
    const order = orders.pop();
    const fillQty = Math.min(order.quantity, remainingQty);
    flipBalance(order.userId, userId, fillQty, order.price);

    remainingQty -= fillQty;
    if (fillQty < order.quantity) {
      order.quantity -= fillQty;
      orders.push(order);
    }
    if (remainingQty === 0) break;
  }
  return remainingQty;
}

// Adjust balances between users
function flipBalance(userId1, userId2, quantity, price) {
  const user1 = users.find(u => u.id === userId1);
  const user2 = users.find(u => u.id === userId2);
  if (!user1 || !user2) return;

  user1.balances[TICKER] -= quantity;
  user2.balances[TICKER] += quantity;
  user1.balances.USD += quantity * price;
  user2.balances.USD -= quantity * price;
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
