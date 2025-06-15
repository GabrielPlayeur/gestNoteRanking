const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../../app");
const crypto = require("crypto");
const ranksModel = require("../../models/ranks.model");
const manifest = require("../../../extension/manifest.json");

// Define NODE_ENV to disable rate limiter in tests
process.env.NODE_ENV = 'test';

require("dotenv").config({ path: __dirname + '/../../.env' });
console.log('GESTNOTE_SECRET in test:', process.env.GESTNOTE_SECRET);

jest.setTimeout(20000); // Increase global timeout to 20s for slow tests (MongoDB connection)

function getHMACSignature(payload) {
  const secret = process.env.GESTNOTE_SECRET;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

const EXTENSION_VERSION = manifest.version;
const EXTENSION_USER_AGENT = `GestNoteRanking/${EXTENSION_VERSION}`;

// Helper function to add authentication headers
function addExtensionHeaders(request) {
  return request
    .set('User-Agent', EXTENSION_USER_AGENT)
    .set('X-Extension-User-Agent', EXTENSION_USER_AGENT);
}

describe("Ranks API", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    // Test data preparation
    await ranksModel.deleteMany({ hash: { $in: ["test1", "test2", "test3", "test4", "test5"] } });
    await ranksModel.create([
      { hash: "test1", year: 2000, maquette: 1, departement: 101, grade: 20 },
      { hash: "test2", year: 2000, maquette: 1, departement: 101, grade: 10 },
      { hash: "test3", year: 2000 , maquette: 1, departement: 101, grade: 2 },
    ]);
  });

  afterAll(async () => {
    await ranksModel.deleteMany({ hash: { $in: ["test1", "test2", "test3", "test4", "test5"] } });
    await mongoose.connection.close();
  });

  describe("GET /api/ranks/:hash", () => {    it("should return the user's rank if hash exists (test1)", async () => {
      const res = await addExtensionHeaders(request(app).get("/api/ranks/test1"));
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('rank');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('grades');
      expect(Array.isArray(res.body.grades)).toBe(true);
      expect(res.body.rank).toBe(1);
    });
    it("should return the user's rank if hash exists (test2)", async () => {
      const res = await addExtensionHeaders(request(app).get("/api/ranks/test2"));
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('rank');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('grades');
      expect(Array.isArray(res.body.grades)).toBe(true);
      expect(res.body.total).toBe(3);
    });    it("should return 404 if hash does not exist", async () => {
      const res = await addExtensionHeaders(request(app).get("/api/ranks/test_"));
      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual(expect.anything());
    });
  });

  describe("POST /api/ranks", () => {
    it("should update a user (test3)", async () => {
      const payload = {
        hash: "test3",
        year: 2000,
        maquette: 1,
        departement: 101,
        grade: 3,
      };
      const payloadStr = JSON.stringify(payload);
      const signature = getHMACSignature(payloadStr);
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', signature)
        .send(payload);
      console.log('Response body:', res.body);
      console.log('Response status code:', res.statusCode);      expect([200, 201]).toContain(res.statusCode); // Accept 200 or 201
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('rank');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('grades');
      expect(Array.isArray(res.body.grades)).toBe(true);
      expect(res.body.user.grade.$numberDecimal).toBe("3");
    });
    it("should create a user (test4)", async () => {
      const payload = {
        hash: "test4",
        year: 2000,
        maquette: 1,
        departement: 101,
        grade: 4,
      };
      const payloadStr = JSON.stringify(payload);
      const signature = getHMACSignature(payloadStr);
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', signature)
        .send(payload);      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('rank');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('grades');
      expect(Array.isArray(res.body.grades)).toBe(true);
      expect(res.body.user.grade.$numberDecimal).toBe("4");
    });
    it("should fail with invalid HMAC signature", async () => {
      const payload = {
        hash: "test5",
        year: 2000,
        maquette: 1,
        departement: 101,
        grade: 5,
      };
      const payloadStr = JSON.stringify(payload);
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', 'invalidsignature')
        .send(payload);
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/HMAC/);
    });
  });

  describe("Error & edge cases", () => {

    it("should return 500 if MongoDB fails on GET /api/ranks/:hash", async () => {
      const orig = ranksModel.findOne;
      ranksModel.findOne = jest.fn().mockRejectedValue(new Error("Mongo fail"));
      const res = await request(app)
        .get("/api/ranks/test1")
        .set('User-Agent', EXTENSION_USER_AGENT);
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('msg');
      ranksModel.findOne = orig;
    });

    it("should return 500 if HMAC_SECRET is missing on POST", async () => {
      const orig = process.env.GESTNOTE_SECRET;
      delete process.env.GESTNOTE_SECRET;
      const payload = { hash: "testX", year: 2000, maquette: 1, departement: 101, grade: 10 };
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', 'irrelevant')
        .send(payload);
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error');
      process.env.GESTNOTE_SECRET = orig;
    });

    it("should return 401 if HMAC signature is missing", async () => {
      const payload = { hash: "testX", year: 2000, maquette: 1, departement: 101, grade: 10 };
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        // No X-GestNote-Signature header
        .send(payload);
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/HMAC/);
    });

    it("should return 401 if HMAC signature is invalid", async () => {
      const payload = { hash: "testX", year: 2000, maquette: 1, departement: 101, grade: 10 };
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', 'bad')
        .send(payload);
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error');
    });    // Validation tests now work directly, without rate limiter
    it("should return 400 if validationResult fails (missing field)", async () => {
      const payload = { year: 2000, maquette: 1, departement: 101, grade: 10 };
      const payloadStr = JSON.stringify(payload);
      const signature = getHMACSignature(payloadStr);
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', signature)
        .send(payload);
      console.log('Validation error response:', res.body);
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it("should return 400 if grade is < 0 or > 20", async () => {
      for (const badGrade of [-1, 21]) {
        const payload = { hash: "testX", year: 2000, maquette: 1, departement: 101, grade: badGrade };
        const payloadStr = JSON.stringify(payload);
        const signature = getHMACSignature(payloadStr);
        const res = await request(app)
          .post("/api/ranks")
          .set('User-Agent', EXTENSION_USER_AGENT)
          .set('X-GestNote-Signature', signature)
          .send(payload);
        console.log('Validation error response:', res.body);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
      }
    });

    it("should log and handle zero grade submission", async () => {
      // Clean up before test to ensure user doesn't exist
      await ranksModel.deleteOne({ hash: "test_zero" });
      
      const payload = {
        hash: "test_zero",
        year: 2000,
        maquette: 1,
        departement: 101,
        grade: 0,
      };
      const payloadStr = JSON.stringify(payload);
      const signature = getHMACSignature(payloadStr);
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', signature)
        .send(payload);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.user.grade.$numberDecimal).toBe("0");
      
      // Clean up
      await ranksModel.deleteOne({ hash: "test_zero" });
    });

    it("should log and reject very high suspicious grades (>20)", async () => {
      const payload = {
        hash: "test_high",
        year: 2000,
        maquette: 1,
        departement: 101,
        grade: 21,
      };
      const payloadStr = JSON.stringify(payload);
      const signature = getHMACSignature(payloadStr);
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', signature)
        .send(payload);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid data');
    });

    it("should log and reject negative grades", async () => {
      const payload = {
        hash: "test_negative",
        year: 2000,
        maquette: 1,
        departement: 101,
        grade: -5,
      };
      const payloadStr = JSON.stringify(payload);
      const signature = getHMACSignature(payloadStr);
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', signature)
        .send(payload);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid data');
    });

    it("should log suspicious very high grade but allow it (19.8)", async () => {
      // Clean up before test to ensure user doesn't exist
      await ranksModel.deleteOne({ hash: "test_suspicious_high" });
      
      const payload = {
        hash: "test_suspicious_high",
        year: 2000,
        maquette: 1,
        departement: 101,
        grade: 19.8,
      };
      const payloadStr = JSON.stringify(payload);
      const signature = getHMACSignature(payloadStr);
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', signature)
        .send(payload);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.user.grade.$numberDecimal).toBe("19.8");
      
      // Clean up
      await ranksModel.deleteOne({ hash: "test_suspicious_high" });
    });

    it("should reject non-numeric values", async () => {
      const payload = {
        hash: "test_non_numeric",
        year: "not_a_number",
        maquette: 1,
        departement: 101,
        grade: 15,
      };
      const payloadStr = JSON.stringify(payload);
      const signature = getHMACSignature(payloadStr);
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', signature)
        .send(payload);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors[0]).toHaveProperty('msg', 'Year must be an integer');
    });

    it("should reject non-numeric string values in validation", async () => {
      const payload = {
        hash: "test_non_numeric",
        year: "not_a_number",
        maquette: 1,
        departement: 101,
        grade: 15,
      };
      const payloadStr = JSON.stringify(payload);
      const signature = getHMACSignature(payloadStr);
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', signature)
        .send(payload);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors[0]).toHaveProperty('msg', 'Year must be an integer');
    });

    it("should return 500 if MongoDB fails on POST/UPDATE", async () => {
      const orig = ranksModel.exists;
      ranksModel.exists = jest.fn().mockRejectedValue(new Error("Mongo fail"));
      
      const payload = {
        hash: "test_mongo_fail",
        year: 2000,
        maquette: 1,
        departement: 101,
        grade: 15,
      };
      const payloadStr = JSON.stringify(payload);
      const signature = getHMACSignature(payloadStr);
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', signature)
        .send(payload);
      
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('msg');
      ranksModel.exists = orig;
    });

    it("should return 500 if MongoDB fails during ranking calculation", async () => {
      const origFind = ranksModel.find;
      const origExists = ranksModel.exists;
      const origFindOneAndUpdate = ranksModel.findOneAndUpdate;
      
      // Mock exists to return true (user exists)
      ranksModel.exists = jest.fn().mockResolvedValue(true);
      // Mock findOneAndUpdate to succeed for the user update
      ranksModel.findOneAndUpdate = jest.fn().mockResolvedValue({
        hash: "test_ranking_fail",
        grade: { $numberDecimal: "15" }
      });
      // Mock find to fail on the second call (ranking calculation)
      let callCount = 0;
      ranksModel.find = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call should succeed (this might be for some initial check)
          return Promise.resolve([]);
        }
        // Second call fails (ranking calculation)
        return Promise.reject(new Error("Ranking calculation failed"));
      });
      
      const payload = {
        hash: "test_ranking_fail",
        year: 2000,
        maquette: 1,
        departement: 101,
        grade: 15,
      };
      const payloadStr = JSON.stringify(payload);
      const signature = getHMACSignature(payloadStr);
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', signature)
        .send(payload);
      
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('msg');
      
      ranksModel.find = origFind;
      ranksModel.exists = origExists;
      ranksModel.findOneAndUpdate = origFindOneAndUpdate;
    });
  });

  describe("Security & CORS", () => {
    it("should reject requests with wrong User-Agent", async () => {
      const res = await request(app)
        .get("/api/ranks")
        .set('User-Agent', 'BadAgent/1.0');
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    it("should reject CORS for disallowed origin", async () => {
      const res = await request(app)
        .get("/api/ranks")
        .set('Origin', 'https://evil.com')
        .set('User-Agent', EXTENSION_USER_AGENT);
      // CORS middleware returns 500 error if origin not authorized
      expect([500, 403]).toContain(res.statusCode);
    });
  });

  describe("Privacy policy route", () => {
    it("should return privacy policy HTML", async () => {
      const res = await request(app)
        .get("/privacy-policy")
        .set('User-Agent', EXTENSION_USER_AGENT);
      expect(res.statusCode).toBe(200);
      expect(res.text).toMatch(/Politique de confidentialité|privacy/i);
    });
  });
});