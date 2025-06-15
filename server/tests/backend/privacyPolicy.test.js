const request = require("supertest");
const app = require("../../app");

require("dotenv").config();

describe("GET /privacy-policy", () => {
  it("should return the privacy policy page", async () => {
    const res = await request(app).get("/privacy-policy");
    expect(res.statusCode).toBe(200);
    expect(res.text.length).toBeGreaterThan(1000);
  });
});