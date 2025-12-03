const request = require("supertest");
const { app } = require("./server");

describe("Quote test", () => {

  beforeAll(async () => {
    await request(app).post("/order").send({
      side: "bid",
      price: 1400.1,
      quantity: 1,
      userId: "1",
    });

    await request(app).post("/order").send({
      side: "ask",
      price: 1400.9,
      quantity: 10,
      userId: "2",
    });

    await request(app).post("/order").send({
      side: "ask",
      price: 1501,
      quantity: 5,
      userId: "2",
    });
  });

  it("Correct quote", async () => {
    const res = await request(app).post("/quote").send({
      side: "bid",
      quantity: 2,
      userId: "1",
    });

    expect(res.body.quote).toBe(1400.9 * 2);
  });

});
