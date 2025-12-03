const request = require("supertest");
const crypto = require("crypto");
const { app, TICKER } = require("./server");

const secret = "local-secret";

function sign(ts, body) {
  return crypto.createHmac("sha256", secret)
    .update(ts + "." + body)
    .digest("hex");
}

describe("Basic tests", () => {

  it("Initial balances", async () => {
    let res = await request(app).get("/balance/1");
    expect(res.body.balances[TICKER]).toBe(10);
  });

  it("Order placement + depth", async () => {
    await request(app).post("/order").send({ side: "bid", price: 1400.1, quantity: 1, userId: "1" });
    await request(app).post("/order").send({ side: "ask", price: 1400.9, quantity: 10, userId: "2" });
    await request(app).post("/order").send({ side: "ask", price: 1501, quantity: 5, userId: "2" });

    const res = await request(app).get("/depth");
    expect(res.body.depth["1501"].quantity).toBe(5);
  });

  it("Matching works", async () => {
    const res = await request(app).post("/order").send({
      side: "bid",
      price: 1502,
      quantity: 2,
      userId: "1",
    });
    expect(res.body.filledQuantity).toBe(2);
  });

  it("Balances update", async () => {
    let res = await request(app).get("/balance/1");
    expect(res.body.balances[TICKER]).toBe(12);
  });

  // ---- WEBHOOK TEST ----
  it("Webhook credits USD", async () => {
    const payload = JSON.stringify({
      id: "evt_test1",
      type: "payment.succeeded",
      data: { userId: "1", amount: 2000 }
    });

    const ts = String(Date.now());
    const sig = sign(ts, payload);

    await request(app)
      .post("/webhook/payment")
      .set("x-timestamp", ts)
      .set("x-signature", sig)
      .send(payload)
      .expect(200);

    // allow async setImmediate to run
    await new Promise(r => setTimeout(r, 20));

    const res = await request(app).get("/balance/1");
    // account for previous buy: user1 paid 2 * 1400.9 earlier (accounted in tests); webhook adds 2000
    expect(res.body.balances.USD).toBe(50000 - (2 * 1400.9) + 2000);
  });

});
