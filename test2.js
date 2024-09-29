import { app, TICKER } from "../"; // Importing the Express app and the TICKER constant
import request from "supertest"; // Importing Supertest for making HTTP requests

describe("Can create a bid", () => {
  beforeAll(async () => {
    // Setting up initial orders before all tests
    await request(app).post("/order").send({
      type: "limit",
      side: "bid",
      price: 1400.1,
      quantity: 1,
      userId: "1"
    });

    await request(app).post("/order").send({
      type: "limit",
      side: "ask",
      price: 1400.9,
      quantity: 10,
      userId: "2"
    });

    await request(app).post("/order").send({
      type: "limit",
      side: "ask",
      price: 1501,
      quantity: 5,
      userId: "2"
    });
  });

  it("Can get the right quote", async () => {
    // Test to verify that the quote is calculated correctly
    let res = await request(app).post("/quote/").send({
      side: "bid",
      quantity: 2,
      userId: "1"
    });

    // Expect the quote to be equal to the price of the best ask multiplied by quantity
    expect(res.body.quote).toBe(1400.9 * 2);
  });
});
