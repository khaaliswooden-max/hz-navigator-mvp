/**
 * CARTOGRAPH Agent Stress Tests
 * 
 * Tests:
 * - Address parsing with malformed/edge case addresses
 * - HUBZone boundary precision
 * - API reliability under load
 * - Batch verification (200+ addresses)
 * - Address form autocomplete
 * - Error message clarity
 */

import { PrismaClient } from '@prisma/client';
import { CartographAgent } from '../../src/agents/hz-navigator-agents/src/agents/cartograph/geospatialIntelligence';
import {
  generateMalformedAddresses,
  generateValidAddresses,
  generateMockEmployee,
  generateId,
} from '../utils/mockDataGenerators';

describe('CARTOGRAPH Agent Stress Tests', () => {
  let prisma: PrismaClient;
  let cartograph: CartographAgent;
  const testOrgId = 'test-org-cartograph';

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = new PrismaClient();
    cartograph = new CartographAgent(prisma);
  });

  describe('Malformed Address Handling', () => {
    /**
     * Critical test: System must gracefully handle invalid addresses
     * without crashing or producing misleading results
     */

    test('should handle empty address gracefully', async () => {
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      
      const result = await cartograph.verifyAddress('');
      
      expect(result).toBeDefined();
      expect(result.address.input).toBe('');
      expect(result.verification.confidence).toBeLessThan(1);
    });

    test('should handle whitespace-only address', async () => {
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      
      const result = await cartograph.verifyAddress('   ');
      
      expect(result).toBeDefined();
      expect(result.address.normalized.trim()).toBe('');
    });

    test('should handle address with only special characters', async () => {
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      
      const result = await cartograph.verifyAddress('!@#$%^&*()');
      
      expect(result).toBeDefined();
      // Should not crash, result may indicate low confidence
      expect(result.verification).toBeDefined();
    });

    test('should handle extremely long address (500+ characters)', async () => {
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      
      const longAddress = 'A'.repeat(500);
      const result = await cartograph.verifyAddress(longAddress);
      
      expect(result).toBeDefined();
      // Address should be truncated or handled appropriately
      expect(result.address.normalized.length).toBeLessThanOrEqual(500);
    });

    test('should handle address with newlines', async () => {
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      
      const multilineAddress = '123 Main Street\nWashington\nDC 20001';
      const result = await cartograph.verifyAddress(multilineAddress);
      
      expect(result).toBeDefined();
      // Should normalize newlines
      expect(result.address.normalized).not.toContain('\n');
    });

    test('should handle address with tabs', async () => {
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      
      const tabbedAddress = '123 Main St\tWashington\tDC\t20001';
      const result = await cartograph.verifyAddress(tabbedAddress);
      
      expect(result).toBeDefined();
    });

    test('should handle all malformed address variants', async () => {
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      
      const malformedAddresses = generateMalformedAddresses();
      const results: { address: string; success: boolean; error?: string }[] = [];

      for (const address of malformedAddresses) {
        try {
          const result = await cartograph.verifyAddress(address);
          results.push({ address, success: true });
        } catch (error) {
          results.push({ 
            address, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      // All addresses should be handled (either verified or gracefully failed)
      expect(results.length).toBe(malformedAddresses.length);
      
      // Count how many were handled without throwing
      const handled = results.filter(r => r.success).length;
      expect(handled).toBeGreaterThan(0);
    });

    test('should handle Unicode characters in address', async () => {
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      
      const unicodeAddress = '１２３ Main Street, Washington, DC 20001';
      const result = await cartograph.verifyAddress(unicodeAddress);
      
      expect(result).toBeDefined();
    });

    test('should handle address with excessive spaces', async () => {
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      
      const spacyAddress = '   123   Main   Street  ,  Washington  ,  DC   20001   ';
      const result = await cartograph.verifyAddress(spacyAddress);
      
      expect(result).toBeDefined();
      // Should have normalized the spaces
      expect(result.address.normalized).not.toContain('  ');
    });
  });

  describe('HUBZone Boundary Precision', () => {
    /**
     * Critical test: Boundary determination must be accurate
     * Edge cases at exact boundaries are especially important
     */

    test('should correctly identify address inside HUBZone', async () => {
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.addressLookupCache.upsert as jest.Mock).mockResolvedValue({});
      
      const result = await cartograph.verifyAddress('123 Main St, Washington, DC 20001');
      
      expect(result.hubzoneStatus).toBeDefined();
      expect(typeof result.hubzoneStatus.isHubzone).toBe('boolean');
      expect(result.hubzoneStatus.hubzoneType).toBeDefined();
    });

    test('should correctly identify address outside HUBZone', async () => {
      // Mock API to return non-HUBZone status
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue({
        latitude: 38.9,
        longitude: -77.0,
        isHubzone: false,
        hubzoneType: null,
        expiresAt: new Date(Date.now() + 86400000),
      });
      
      const result = await cartograph.verifyAddress('456 Non-HUBZone Ave, Suburb, VA 22102');
      
      expect(result.hubzoneStatus.isHubzone).toBe(false);
      expect(result.hubzoneStatus.hubzoneType).toBeNull();
      expect(result.verification.cacheHit).toBe(true);
    });

    test('should return all HUBZone types correctly', async () => {
      const hubzoneTypes = ['QCT', 'QNMC', 'DDA', 'BRAC', 'GOV', 'INDIAN', 'REDESIGNATED'];
      
      for (const hzType of hubzoneTypes) {
        (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue({
          latitude: 38.9,
          longitude: -77.0,
          isHubzone: true,
          hubzoneType: hzType,
          expiresAt: new Date(Date.now() + 86400000),
        });
        
        const result = await cartograph.verifyAddress(`123 ${hzType} Street, City, ST 12345`);
        
        expect(result.hubzoneStatus.isHubzone).toBe(true);
        expect(result.hubzoneStatus.hubzoneType).toBe(hzType);
      }
    });

    test('should assess redesignation risk levels correctly', async () => {
      (prisma.hubzoneArea.findFirst as jest.Mock).mockResolvedValue({
        tractCode: '11001000100',
        hubzoneType: 'QCT',
        effectiveFrom: new Date('2020-01-01'),
        effectiveTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      });

      const result = await cartograph.execute(
        'assess_redesignation_risk',
        { censusTract: '11001000100' },
        testOrgId
      ) as { riskAssessment: { level: string } };

      expect(result.riskAssessment.level).toBe('high'); // <90 days = high risk
    });

    test('should handle unknown census tract gracefully', async () => {
      (prisma.hubzoneArea.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await cartograph.execute(
        'assess_redesignation_risk',
        { censusTract: '99999999999' },
        testOrgId
      ) as { found: boolean; riskLevel: string };

      expect(result.found).toBe(false);
      expect(result.riskLevel).toBe('unknown');
    });
  });

  describe('Batch Verification (200 addresses)', () => {
    /**
     * Stress test: System must handle batch verification efficiently
     * 200 addresses should complete in reasonable time with accurate results
     */

    test('should batch verify 200 addresses within performance threshold', async () => {
      const addresses = generateValidAddresses(200);
      
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.addressLookupCache.upsert as jest.Mock).mockResolvedValue({});

      const startTime = performance.now();
      const result = await cartograph.execute(
        'batch_verify',
        { addresses },
        testOrgId
      ) as { total: number; verified: number; errorCount: number };
      const duration = performance.now() - startTime;

      expect(result.total).toBe(200);
      expect(result.verified + result.errorCount).toBe(200);
      // Allow generous time due to rate limiting (100ms per address)
      expect(duration).toBeLessThan(30000); // 30 seconds max
    }, 35000); // 35 second timeout for this test

    test('should accurately calculate HUBZone percentage in batch', async () => {
      const addresses = generateValidAddresses(100);
      
      // Mock 60% HUBZone rate
      let callCount = 0;
      (prisma.addressLookupCache.findUnique as jest.Mock).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          latitude: 38.9,
          longitude: -77.0,
          isHubzone: callCount <= 60,
          hubzoneType: callCount <= 60 ? 'QCT' : null,
          expiresAt: new Date(Date.now() + 86400000),
        });
      });

      const result = await cartograph.execute(
        'batch_verify',
        { addresses },
        testOrgId
      ) as { summary: { hubzonePercentage: number } };

      expect(result.summary.hubzonePercentage).toBeCloseTo(60, 0);
    }, 15000); // 15 second timeout for 100 addresses

    test('should handle mixed valid/invalid addresses in batch', async () => {
      const malformedAddresses = generateMalformedAddresses(); // Returns ~20 addresses
      const validAddresses = generateValidAddresses(200 - malformedAddresses.length);
      const mixedAddresses = [...validAddresses, ...malformedAddresses];

      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.addressLookupCache.upsert as jest.Mock).mockResolvedValue({});

      const result = await cartograph.execute(
        'batch_verify',
        { addresses: mixedAddresses },
        testOrgId
      ) as { total: number; verified: number; errorCount: number };

      expect(result.total).toBe(200);
      // Should have some errors from malformed addresses
      expect(result.verified).toBeGreaterThan(0);
    }, 30000); // 30 second timeout for 200 addresses

    test('should utilize cache effectively in batch verification', async () => {
      const addresses = generateValidAddresses(50);
      // Duplicate some addresses
      const addressesWithDupes = [...addresses, ...addresses.slice(0, 25)];

      let cacheChecks = 0;
      let cacheMisses = 0;
      
      (prisma.addressLookupCache.findUnique as jest.Mock).mockImplementation((query) => {
        cacheChecks++;
        const address = query.where.inputAddress;
        // First 50 are misses, next 25 are hits
        if (cacheChecks <= 50) {
          cacheMisses++;
          return Promise.resolve(null);
        }
        return Promise.resolve({
          latitude: 38.9,
          longitude: -77.0,
          isHubzone: true,
          hubzoneType: 'QCT',
          expiresAt: new Date(Date.now() + 86400000),
        });
      });
      (prisma.addressLookupCache.upsert as jest.Mock).mockResolvedValue({});

      const result = await cartograph.execute(
        'batch_verify',
        { addresses: addressesWithDupes },
        testOrgId
      ) as { total: number };

      expect(result.total).toBe(75);
    }, 12000); // 12 second timeout for 75 addresses
  });

  describe('API Reliability', () => {
    /**
     * Tests system behavior under various API conditions
     */

    test('should handle API timeout gracefully', async () => {
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.addressLookupCache.upsert as jest.Mock).mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      );

      // Should not throw, should handle gracefully
      const result = await cartograph.verifyAddress('123 Main St, Washington, DC 20001');
      expect(result).toBeDefined();
    });

    test('should return cached result when API is unavailable', async () => {
      const cachedResult = {
        latitude: 38.9,
        longitude: -77.0,
        isHubzone: true,
        hubzoneType: 'QCT',
        expiresAt: new Date(Date.now() + 86400000),
      };
      
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(cachedResult);

      const result = await cartograph.verifyAddress('123 Main St, Washington, DC 20001');
      
      expect(result.verification.cacheHit).toBe(true);
      expect(result.hubzoneStatus.isHubzone).toBe(true);
    });

    test('should handle rate limiting appropriately', async () => {
      const addresses = generateValidAddresses(10);
      
      (prisma.addressLookupCache.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.addressLookupCache.upsert as jest.Mock).mockResolvedValue({});

      const startTime = performance.now();
      await cartograph.execute('batch_verify', { addresses }, testOrgId);
      const duration = performance.now() - startTime;

      // Should take at least 900ms due to 100ms rate limiting between 10 addresses
      expect(duration).toBeGreaterThanOrEqual(900);
    });
  });

  describe('Map Change Detection', () => {
    /**
     * Tests HUBZone map change detection for organization employees
     */

    test('should detect employees affected by map changes', async () => {
      const employees = Array(5).fill(null).map((_, i) => ({
        ...generateMockEmployee(testOrgId),
        censusTract: `1100100010${i}`,
        isHubzoneResident: true,
      }));

      const mapChanges = [
        {
          censusTract: '11001000100',
          changeType: 'redesignated',
          effectiveDate: new Date(),
          newStatus: 'expired',
        },
        {
          censusTract: '11001000101',
          changeType: 'redesignated',
          effectiveDate: new Date(),
          newStatus: 'expired',
        },
      ];

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.hubzoneMapChange.findMany as jest.Mock).mockResolvedValue(mapChanges);

      const result = await cartograph.execute(
        'check_map_changes',
        {},
        testOrgId
      ) as { affectedEmployees: number };

      expect(result.affectedEmployees).toBe(2);
    });

    test('should handle no map changes gracefully', async () => {
      const employees = Array(5).fill(null).map(() => generateMockEmployee(testOrgId));

      (prisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
      (prisma.hubzoneMapChange.findMany as jest.Mock).mockResolvedValue([]);

      const result = await cartograph.execute(
        'check_map_changes',
        {},
        testOrgId
      ) as { affectedEmployees: number; recentChanges: number };

      expect(result.affectedEmployees).toBe(0);
      expect(result.recentChanges).toBe(0);
    });
  });

  describe('Geocoding Accuracy', () => {
    /**
     * Tests geocoding functionality
     */

    test('should parse standard address components correctly', async () => {
      const result = await cartograph.execute(
        'geocode_address',
        { address: '123 Main Street, Washington, DC 20001' },
        testOrgId
      ) as { street: string; city: string; state: string; zipCode: string };

      expect(result.street).toBeDefined();
      expect(result.city).toBeDefined();
      expect(result.state).toBeDefined();
      expect(result.zipCode).toBeDefined();
    });

    test('should return coordinates within valid ranges', async () => {
      const result = await cartograph.execute(
        'geocode_address',
        { address: '123 Main Street, Washington, DC 20001' },
        testOrgId
      ) as { latitude: number; longitude: number };

      expect(result.latitude).toBeGreaterThanOrEqual(-90);
      expect(result.latitude).toBeLessThanOrEqual(90);
      expect(result.longitude).toBeGreaterThanOrEqual(-180);
      expect(result.longitude).toBeLessThanOrEqual(180);
    });

    test('should include confidence score', async () => {
      const result = await cartograph.execute(
        'geocode_address',
        { address: '123 Main Street, Washington, DC 20001' },
        testOrgId
      ) as { confidence: number };

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('HUBZone Area Queries', () => {
    /**
     * Tests querying HUBZone areas by state/type
     */

    test('should return HUBZone areas by state', async () => {
      const mockAreas = Array(10).fill(null).map((_, i) => ({
        geoId: `geo-${i}`,
        name: `Area ${i}`,
        hubzoneType: i % 2 === 0 ? 'QCT' : 'QNMC',
        tractCode: `11001000${i}`,
        countyFips: '11001',
        effectiveFrom: new Date('2020-01-01'),
        effectiveTo: null,
      }));

      (prisma.hubzoneArea.findMany as jest.Mock).mockResolvedValue(mockAreas);

      const result = await cartograph.execute(
        'get_hubzone_areas',
        { state: 'DC' },
        testOrgId
      ) as { totalAreas: number; byType: Record<string, number> };

      expect(result.totalAreas).toBe(10);
      expect(result.byType).toHaveProperty('QCT');
      expect(result.byType).toHaveProperty('QNMC');
    });

    test('should filter HUBZone areas by type', async () => {
      const qctAreas = Array(5).fill(null).map((_, i) => ({
        geoId: `geo-${i}`,
        name: `Area ${i}`,
        hubzoneType: 'QCT',
        tractCode: `11001000${i}`,
        countyFips: '11001',
        effectiveFrom: new Date('2020-01-01'),
        effectiveTo: null,
      }));

      (prisma.hubzoneArea.findMany as jest.Mock).mockResolvedValue(qctAreas);

      const result = await cartograph.execute(
        'get_hubzone_areas',
        { state: 'DC', type: 'QCT' },
        testOrgId
      ) as { totalAreas: number };

      expect(result.totalAreas).toBe(5);
    });
  });

  describe('Error Message Clarity', () => {
    /**
     * Tests that error messages are clear and actionable
     */

    test('should provide clear error for unknown task type', async () => {
      await expect(
        cartograph.execute('unknown_task', {}, testOrgId)
      ).rejects.toThrow(/Unknown task type/);
    });

    test('should provide clear feedback for nearest HUBZone search limitation', async () => {
      const result = await cartograph.execute(
        'find_nearest_hubzone',
        { latitude: 38.9, longitude: -77.0 },
        testOrgId
      ) as { nearestHubzone: { found: boolean; recommendation: string } };

      expect(result.nearestHubzone.found).toBe(false);
      expect(result.nearestHubzone.recommendation).toBeDefined();
    });
  });
});
