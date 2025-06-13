const request = require("supertest");
const app = require("../app");
const { ipBlocker } = require('../utils/ipBlocker');
const SecurityLogAnalyzer = require('../utils/SecurityLogAnalyzer');
const { SecurityLogger } = require('../utils/securityLogger');

// Mock dependencies
jest.mock('../utils/ipBlocker', () => ({
  ipBlocker: {
    getStats: jest.fn(),
    isBlocked: jest.fn(),
    blockIP: jest.fn(),
    unblockIP: jest.fn(),
    middleware: jest.fn(() => (req, res, next) => next())
  }
}));
jest.mock('../utils/SecurityLogAnalyzer');
jest.mock('../utils/securityLogger');

describe("Admin Controller", () => {
  const validAdminToken = 'test-admin-token';
  beforeEach(() => {
    // Set admin token for tests
    process.env.ADMIN_TOKEN = validAdminToken;
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    ipBlocker.getStats.mockReturnValue({
      blockedCount: 5,
      blockedIPs: ['192.168.1.1', '10.0.0.1']
    });
    
    ipBlocker.isBlocked.mockReturnValue(false);
    ipBlocker.blockIP.mockImplementation(() => {});
    ipBlocker.unblockIP.mockImplementation(() => {});
    
    SecurityLogAnalyzer.prototype.analyzeSecurityLogs.mockResolvedValue({
      summary: {
        totalEvents: 100,
        uniqueIPs: 10,
        criticalCount: 5,
        suspiciousIPCount: 3,
        highRiskIPCount: 2
      },
      recommendations: ['Block IP 1.2.3.4', 'Monitor IP 5.6.7.8']
    });
    
    SecurityLogAnalyzer.prototype.generateBlockList.mockReturnValue({
      ips: ['1.2.3.4', '5.6.7.8']
    });
    
    SecurityLogger.logInvalidUserAgent.mockImplementation(() => {});
    SecurityLogger.logServerError.mockImplementation(() => {});
  });
  
  afterEach(() => {
    delete process.env.ADMIN_TOKEN;
  });

  describe("Authentication middleware", () => {
    it("should reject requests without admin token", async () => {
      const res = await request(app)
        .get("/admin/security/stats");
      
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Administration token required');
      expect(SecurityLogger.logInvalidUserAgent).toHaveBeenCalled();
    });

    it("should reject requests with invalid admin token", async () => {
      const res = await request(app)
        .get("/admin/security/stats")
        .set('x-admin-token', 'invalid-token');
      
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Administration token required');
      expect(SecurityLogger.logInvalidUserAgent).toHaveBeenCalled();
    });

    it("should allow requests with valid admin token", async () => {
      const res = await request(app)
        .get("/admin/security/stats")
        .set('x-admin-token', validAdminToken);
      
      expect(res.statusCode).toBe(200);
    });    it("should require authentication even when ADMIN_TOKEN env is not set", async () => {
      delete process.env.ADMIN_TOKEN;
      
      const res = await request(app)
        .get("/admin/security/stats");
        // No token header at all
      
      expect(res.statusCode).toBe(401); // Should still be unauthorized because !token is true
    });
  });

  describe("GET /admin/security/stats", () => {
    it("should return security statistics", async () => {
      const res = await request(app)
        .get("/admin/security/stats")
        .set('x-admin-token', validAdminToken);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('security');
      expect(res.body).toHaveProperty('blockedIPs');
      expect(res.body).toHaveProperty('recommendations');
      
      expect(res.body.security).toMatchObject({
        totalEvents: 100,
        uniqueIPs: 10,
        criticalEvents: 5,
        suspiciousIPs: 3,
        highRiskIPs: 2
      });
    });

    it("should handle errors when analyzing security logs", async () => {
      SecurityLogAnalyzer.prototype.analyzeSecurityLogs.mockRejectedValue(
        new Error('Analysis failed')
      );
      
      const res = await request(app)
        .get("/admin/security/stats")
        .set('x-admin-token', validAdminToken);
      
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error retrieving statistics');
      expect(SecurityLogger.logServerError).toHaveBeenCalled();
    });
  });

  describe("GET /admin/security/report", () => {
    it("should return complete security report", async () => {
      const mockReport = {
        summary: { totalEvents: 100 },
        details: { someDetail: 'value' }
      };
      
      SecurityLogAnalyzer.prototype.analyzeSecurityLogs.mockResolvedValue(mockReport);
      
      const res = await request(app)
        .get("/admin/security/report")
        .set('x-admin-token', validAdminToken);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockReport);
    });

    it("should handle errors when generating report", async () => {
      SecurityLogAnalyzer.prototype.analyzeSecurityLogs.mockRejectedValue(
        new Error('Report generation failed')
      );
      
      const res = await request(app)
        .get("/admin/security/report")
        .set('x-admin-token', validAdminToken);
      
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error generating report');
      expect(SecurityLogger.logServerError).toHaveBeenCalled();
    });
  });

  describe("POST /admin/security/block", () => {
    it("should block an IP with reason", async () => {
      ipBlocker.getStats.mockReturnValue({ blockedCount: 6 });
      
      const res = await request(app)
        .post("/admin/security/block")
        .set('x-admin-token', validAdminToken)
        .send({ ip: '192.168.1.100', reason: 'Suspicious activity' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: 'IP 192.168.1.100 blocked',
        blockedCount: 6
      });
      expect(ipBlocker.blockIP).toHaveBeenCalledWith('192.168.1.100', 'Suspicious activity');
    });

    it("should block an IP without reason (default reason)", async () => {
      const res = await request(app)
        .post("/admin/security/block")
        .set('x-admin-token', validAdminToken)
        .send({ ip: '192.168.1.100' });
      
      expect(res.statusCode).toBe(200);
      expect(ipBlocker.blockIP).toHaveBeenCalledWith('192.168.1.100', 'Manual admin block');
    });

    it("should return error when IP is missing", async () => {
      const res = await request(app)
        .post("/admin/security/block")
        .set('x-admin-token', validAdminToken)
        .send({ reason: 'Test' });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'IP required');
    });

    it("should handle errors when blocking IP", async () => {
      ipBlocker.blockIP.mockImplementation(() => {
        throw new Error('Block failed');
      });
      
      const res = await request(app)
        .post("/admin/security/block")
        .set('x-admin-token', validAdminToken)
        .send({ ip: '192.168.1.100' });
      
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error blocking IP');
      expect(SecurityLogger.logServerError).toHaveBeenCalled();
    });
  });

  describe("DELETE /admin/security/block/:ip", () => {
    it("should unblock an IP", async () => {
      ipBlocker.getStats.mockReturnValue({ blockedCount: 4 });
      
      const res = await request(app)
        .delete("/admin/security/block/192.168.1.100")
        .set('x-admin-token', validAdminToken);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: 'IP 192.168.1.100 unblocked',
        blockedCount: 4
      });
      expect(ipBlocker.unblockIP).toHaveBeenCalledWith('192.168.1.100');
    });

    it("should handle errors when unblocking IP", async () => {
      ipBlocker.unblockIP.mockImplementation(() => {
        throw new Error('Unblock failed');
      });
      
      const res = await request(app)
        .delete("/admin/security/block/192.168.1.100")
        .set('x-admin-token', validAdminToken);
      
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error unblocking IP');
      expect(SecurityLogger.logServerError).toHaveBeenCalled();
    });
  });

  describe("GET /admin/security/blocked", () => {
    it("should return list of blocked IPs", async () => {
      const mockStats = {
        blockedCount: 3,
        blockedIPs: ['1.1.1.1', '2.2.2.2', '3.3.3.3']
      };
      ipBlocker.getStats.mockReturnValue(mockStats);
      
      const res = await request(app)
        .get("/admin/security/blocked")
        .set('x-admin-token', validAdminToken);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockStats);
    });

    it("should handle errors when retrieving blocked IPs", async () => {
      ipBlocker.getStats.mockImplementation(() => {
        throw new Error('Stats failed');
      });
      
      const res = await request(app)
        .get("/admin/security/blocked")
        .set('x-admin-token', validAdminToken);
      
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error retrieving blocked IPs');
      expect(SecurityLogger.logServerError).toHaveBeenCalled();
    });
  });

  describe("POST /admin/security/analyze", () => {
    it("should analyze security logs without auto-blocking", async () => {
      const res = await request(app)
        .post("/admin/security/analyze")
        .set('x-admin-token', validAdminToken)
        .send({});
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        report: {
          suspiciousIPs: 3,
          highRiskIPs: 2,
          recommendations: 2
        },
        blockList: {
          recommended: 2,
          newlyBlocked: 0
        }
      });
    });

    it("should analyze security logs with auto-blocking", async () => {
      ipBlocker.isBlocked.mockReturnValue(false);
      ipBlocker.getStats.mockReturnValue({ blockedCount: 7 });
      
      const res = await request(app)
        .post("/admin/security/analyze")
        .set('x-admin-token', validAdminToken)
        .send({ autoBlock: true });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.blockList.newlyBlocked).toBe(2);
      expect(ipBlocker.blockIP).toHaveBeenCalledTimes(2);
      expect(ipBlocker.blockIP).toHaveBeenCalledWith('1.2.3.4', 'Auto-block from security analysis');
      expect(ipBlocker.blockIP).toHaveBeenCalledWith('5.6.7.8', 'Auto-block from security analysis');
    });

    it("should not block already blocked IPs", async () => {
      ipBlocker.isBlocked.mockReturnValue(true);
      
      const res = await request(app)
        .post("/admin/security/analyze")
        .set('x-admin-token', validAdminToken)
        .send({ autoBlock: true });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.blockList.newlyBlocked).toBe(0);
      expect(ipBlocker.blockIP).not.toHaveBeenCalled();
    });

    it("should handle errors during security analysis", async () => {
      SecurityLogAnalyzer.prototype.analyzeSecurityLogs.mockRejectedValue(
        new Error('Analysis failed')
      );
      
      const res = await request(app)
        .post("/admin/security/analyze")
        .set('x-admin-token', validAdminToken)
        .send({});
      
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error during security analysis');
      expect(SecurityLogger.logServerError).toHaveBeenCalled();
    });
  });
});
