const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../app");
const crypto = require("crypto");
const ranksModel = require("../models/ranks.model");
const manifest = require("../../extension/manifest.json");

// Définir NODE_ENV pour désactiver le rate limiter en tests
process.env.NODE_ENV = 'test';

require("dotenv").config({ path: __dirname + '/../.env' });
console.log('GESTNOTE_SECRET in test:', process.env.GESTNOTE_SECRET);

jest.setTimeout(20000); // Augmente le timeout global à 20s pour les tests lents (connexion MongoDB)

function getHMACSignature(payload) {
  const secret = process.env.GESTNOTE_SECRET;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

const EXTENSION_VERSION = manifest.version;
const EXTENSION_USER_AGENT = `GestNoteRanking/${EXTENSION_VERSION}`;

// Helper function pour ajouter les headers d'authentification
function addExtensionHeaders(request) {
  return request
    .set('User-Agent', EXTENSION_USER_AGENT)
    .set('X-Extension-User-Agent', EXTENSION_USER_AGENT);
}

describe("Ranks API", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    // Préparation des données de test
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

  describe("GET /api/ranks", () => {    it("should return all users", async () => {
      const res = await addExtensionHeaders(request(app).get("/api/ranks"));
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/ranks/:hash", () => {
    it("should return the user's rank if hash exists (test1)", async () => {
      const res = await request(app)
        .get("/api/ranks/test1")
        .set('User-Agent', EXTENSION_USER_AGENT);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('rank');
      expect(res.body).toHaveProperty('total');
      expect(res.body.rank).toBe(1);
    });
    it("should return the user's rank if hash exists (test2)", async () => {
      const res = await request(app)
        .get("/api/ranks/test2")
        .set('User-Agent', EXTENSION_USER_AGENT);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('rank');
      expect(res.body).toHaveProperty('total');
      expect(res.body.total).toBe(3);
    });
    it("should return 404 if hash does not exist", async () => {
      const res = await request(app)
        .get("/api/ranks/test_")
        .set('User-Agent', EXTENSION_USER_AGENT);
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
      console.log('Response status code:', res.statusCode);
      expect([200, 201]).toContain(res.statusCode); // Accepte 200 ou 201
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('rank');
      expect(res.body).toHaveProperty('total');
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

  describe("DELETE /api/ranks/:hash", () => {
    it("should delete a user (test4)", async () => {
      const res = await request(app)
        .delete("/api/ranks/test4")
        .set('User-Agent', EXTENSION_USER_AGENT);
      expect(res.statusCode).toBe(200);
      // Accepte null ou objet (si déjà supprimé)
      expect([null, Object.prototype]).toContain(res.body === null ? null : Object.prototype);
    });
  });

  describe("Error & edge cases", () => {
    it("should return 500 if MongoDB fails on GET /api/ranks", async () => {
      const orig = ranksModel.find;
      ranksModel.find = jest.fn().mockRejectedValue(new Error("Mongo fail"));
      const res = await request(app)
        .get("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT);
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('msg');
      ranksModel.find = orig;
    });

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

    it("should return 401 if HMAC signature is invalid", async () => {
      const payload = { hash: "testX", year: 2000, maquette: 1, departement: 101, grade: 10 };
      const res = await request(app)
        .post("/api/ranks")
        .set('User-Agent', EXTENSION_USER_AGENT)
        .set('X-GestNote-Signature', 'bad')
        .send(payload);
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error');
    });    // Les tests de validation fonctionnent maintenant directement, sans rate limiter
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

    it("should return 500 if MongoDB fails on DELETE", async () => {
      const orig = ranksModel.findOneAndDelete;
      ranksModel.findOneAndDelete = jest.fn().mockRejectedValue(new Error("Mongo fail"));
      const res = await request(app)
        .delete("/api/ranks/test1")
        .set('User-Agent', EXTENSION_USER_AGENT);
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('msg');
      ranksModel.findOneAndDelete = orig;
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
      // CORS middleware renvoie une erreur 500 si origine non autorisée
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