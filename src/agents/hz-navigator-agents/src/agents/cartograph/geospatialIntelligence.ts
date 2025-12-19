/**
 * CARTOGRAPH - Geospatial Intelligence Agent
 * 
 * HUBZone boundary verification, address geocoding, map change detection,
 * and redesignation risk assessment.
 * 
 * Integrates with SBA HUBZone API, Census Bureau, and mapping services.
 */

import { PrismaClient, Prisma } from '@prisma/client';

// HUBZone types per SBA definitions
export type HubzoneType = 'QCT' | 'QNMC' | 'DDA' | 'BRAC' | 'GOV' | 'INDIAN' | 'REDESIGNATED';

export interface AddressVerificationResult {
  address: {
    input: string;
    normalized: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  hubzoneStatus: {
    isHubzone: boolean;
    hubzoneType: HubzoneType | null;
    censusTract: string | null;
    countyFips: string | null;
    expirationDate: Date | null;
    redesignationRisk: 'low' | 'medium' | 'high';
  };
  verification: {
    source: string;
    timestamp: Date;
    confidence: number;
    cacheHit: boolean;
  };
}

export interface MapChangeAlert {
  censusTract: string;
  county: string;
  state: string;
  changeType: 'designated' | 'redesignated' | 'expired';
  previousStatus: string | null;
  newStatus: string;
  effectiveDate: Date;
  impactedEmployees: number;
}

/**
 * CARTOGRAPH Agent - Geospatial intelligence and HUBZone verification
 */
export class CartographAgent {
  private prisma: PrismaClient;
  private sbaApiBase = 'https://maps.certify.sba.gov/hubzone/api';

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Main execution router
   */
  async execute(
    taskType: string,
    input: Record<string, unknown>,
    organizationId: string
  ): Promise<Record<string, unknown>> {
    console.log(`[CARTOGRAPH] Executing: ${taskType}`);

    switch (taskType) {
      case 'verify_address':
        return await this.verifyAddress(
          input.address as string
        ) as unknown as Record<string, unknown>;

      case 'batch_verify':
        return await this.batchVerifyAddresses(
          input.addresses as string[]
        );

      case 'check_map_changes':
        return await this.checkMapChanges(organizationId);

      case 'get_hubzone_areas':
        return await this.getHubzoneAreas(
          input.state as string,
          input.type as HubzoneType | undefined
        );

      case 'find_nearest_hubzone':
        return await this.findNearestHubzone(
          input.latitude as number,
          input.longitude as number
        );

      case 'assess_redesignation_risk':
        return await this.assessRedesignationRisk(
          input.censusTract as string
        );

      case 'geocode_address':
        return await this.geocodeAddress(input.address as string);

      case 'get_census_tract':
        return await this.getCensusTract(
          input.latitude as number,
          input.longitude as number
        );

      default:
        throw new Error(`[CARTOGRAPH] Unknown task type: ${taskType}`);
    }
  }

  /**
   * Verify if an address is in a HUBZone
   */
  async verifyAddress(address: string): Promise<AddressVerificationResult> {
    console.log(`[CARTOGRAPH] Verifying address: ${address}`);

    // Check cache first
    const cached = await this.checkCache(address);
    if (cached) {
      console.log(`[CARTOGRAPH] Cache hit for: ${address}`);
      return this.formatCachedResult(cached);
    }

    // Geocode the address
    const geocoded = await this.geocodeAddress(address);

    // Query SBA HUBZone API
    const hubzoneStatus = await this.querySbaApi(
      geocoded.latitude,
      geocoded.longitude
    );

    // Get census tract info
    const censusTract = await this.getCensusTract(
      geocoded.latitude,
      geocoded.longitude
    );

    // Assess redesignation risk
    const redesignationRisk = await this.calculateRedesignationRisk(
      hubzoneStatus.hubzoneType,
      censusTract.tractCode
    );

    // Cache the result
    await this.cacheResult(address, geocoded, hubzoneStatus);

    return {
      address: {
        input: address,
        normalized: geocoded.normalizedAddress,
        street: geocoded.street,
        city: geocoded.city,
        state: geocoded.state,
        zipCode: geocoded.zipCode,
      },
      coordinates: {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
      },
      hubzoneStatus: {
        isHubzone: hubzoneStatus.isHubzone,
        hubzoneType: hubzoneStatus.hubzoneType,
        censusTract: censusTract.tractCode,
        countyFips: censusTract.countyFips,
        expirationDate: hubzoneStatus.expirationDate,
        redesignationRisk,
      },
      verification: {
        source: 'SBA HUBZone API',
        timestamp: new Date(),
        confidence: 0.95,
        cacheHit: false,
      },
    };
  }

  /**
   * Batch verify multiple addresses
   */
  async batchVerifyAddresses(
    addresses: string[]
  ): Promise<Record<string, unknown>> {
    console.log(`[CARTOGRAPH] Batch verifying ${addresses.length} addresses`);

    const results: AddressVerificationResult[] = [];
    const errors: Array<{ address: string; error: string }> = [];

    for (const address of addresses) {
      try {
        const result = await this.verifyAddress(address);
        results.push(result);
      } catch (error) {
        errors.push({
          address,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Rate limiting
      await this.delay(100);
    }

    const hubzoneCount = results.filter(r => r.hubzoneStatus.isHubzone).length;

    return {
      total: addresses.length,
      verified: results.length,
      errorCount: errors.length,
      summary: {
        inHubzone: hubzoneCount,
        notInHubzone: results.length - hubzoneCount,
        hubzonePercentage: results.length > 0
          ? (hubzoneCount / results.length) * 100
          : 0,
      },
      results,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Check for HUBZone map changes affecting an organization
   */
  async checkMapChanges(organizationId: string): Promise<Record<string, unknown>> {
    console.log(`[CARTOGRAPH] Checking map changes for org: ${organizationId}`);

    // Get all employees with their census tracts
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        censusTract: true,
        isHubzoneResident: true,
      },
    });

    // Get recent map changes
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentChanges = await this.prisma.hubzoneMapChange.findMany({
      where: {
        effectiveDate: { gte: thirtyDaysAgo },
      },
    });

    // Find affected employees
    const affectedEmployees: Array<{
      employee: { id: string; name: string };
      change: { type: string; newStatus: string };
    }> = [];

    for (const employee of employees) {
      if (!employee.censusTract) continue;

      const change = recentChanges.find(c => c.censusTract === employee.censusTract);
      if (change) {
        affectedEmployees.push({
          employee: {
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
          },
          change: {
            type: change.changeType,
            newStatus: change.newStatus,
          },
        });
      }
    }

    return {
      checkDate: new Date(),
      totalEmployees: employees.length,
      recentChanges: recentChanges.length,
      affectedEmployees: affectedEmployees.length,
      changes: recentChanges.map(c => ({
        censusTract: c.censusTract,
        changeType: c.changeType,
        effectiveDate: c.effectiveDate,
        newStatus: c.newStatus,
      })),
      affected: affectedEmployees,
      recommendations: this.getMapChangeRecommendations(affectedEmployees.length),
    };
  }

  /**
   * Get HUBZone areas by state and type
   */
  async getHubzoneAreas(
    state: string,
    type?: HubzoneType
  ): Promise<Record<string, unknown>> {
    const where: Prisma.HubzoneAreaWhereInput = {
      state: state.toUpperCase(),
      isActive: true,
    };

    if (type) {
      where.hubzoneType = type;
    }

    const areas = await this.prisma.hubzoneArea.findMany({
      where,
      select: {
        geoId: true,
        name: true,
        hubzoneType: true,
        tractCode: true,
        countyFips: true,
        effectiveFrom: true,
        effectiveTo: true,
      },
      take: 100,
    });

    const byType: Record<string, number> = {};
    for (const area of areas) {
      byType[area.hubzoneType] = (byType[area.hubzoneType] || 0) + 1;
    }

    return {
      state: state.toUpperCase(),
      filter: type || 'all',
      totalAreas: areas.length,
      byType,
      areas: areas.slice(0, 50), // Limit response size
    };
  }

  /**
   * Find nearest HUBZone to a location
   */
  async findNearestHubzone(
    latitude: number,
    longitude: number
  ): Promise<Record<string, unknown>> {
    // In production, this would use PostGIS spatial queries
    // For now, return a simplified response

    return {
      searchLocation: { latitude, longitude },
      nearestHubzone: {
        found: false,
        message: 'Spatial search requires PostGIS configuration',
        recommendation: 'Use verify_address with a specific address instead',
      },
      alternatives: [
        'Search by state using get_hubzone_areas',
        'Verify specific addresses using verify_address',
      ],
    };
  }

  /**
   * Assess redesignation risk for a census tract
   */
  async assessRedesignationRisk(
    censusTract: string
  ): Promise<Record<string, unknown>> {
    // Check if tract exists in our database
    const area = await this.prisma.hubzoneArea.findFirst({
      where: { tractCode: censusTract },
    });

    if (!area) {
      return {
        censusTract,
        found: false,
        riskLevel: 'unknown',
        message: 'Census tract not found in HUBZone database',
      };
    }

    // Calculate risk based on various factors
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Check if approaching expiration
    if (area.effectiveTo) {
      const daysUntilExpiration = Math.floor(
        (area.effectiveTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiration < 90) {
        riskScore += 40;
        riskFactors.push(`Expires in ${daysUntilExpiration} days`);
      } else if (daysUntilExpiration < 180) {
        riskScore += 20;
        riskFactors.push(`Expires in ${daysUntilExpiration} days`);
      }
    }

    // QCT and QNMC areas are recalculated periodically
    if (area.hubzoneType === 'QCT' || area.hubzoneType === 'QNMC') {
      riskScore += 15;
      riskFactors.push(`${area.hubzoneType} areas are subject to periodic recalculation`);
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskScore >= 40) riskLevel = 'high';
    else if (riskScore >= 20) riskLevel = 'medium';

    return {
      censusTract,
      hubzoneType: area.hubzoneType,
      effectiveFrom: area.effectiveFrom,
      effectiveTo: area.effectiveTo,
      riskAssessment: {
        level: riskLevel,
        score: riskScore,
        factors: riskFactors,
      },
      recommendations: this.getRedesignationRecommendations(riskLevel),
    };
  }

  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(address: string): Promise<{
    normalizedAddress: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    latitude: number;
    longitude: number;
    confidence: number;
    source: string;
    note: string;
  }> {
    // In production, integrate with Mapbox, Google, or Census Geocoder
    // For now, return a mock structure

    console.log(`[CARTOGRAPH] Geocoding: ${address}`);

    // Normalize address: uppercase, remove newlines/tabs, collapse multiple spaces
    const normalizedAddress = address
      .toUpperCase()
      .replace(/[\n\r\t]/g, ' ')  // Replace newlines and tabs with spaces
      .replace(/\s+/g, ' ')        // Collapse multiple spaces to single space
      .trim();                      // Remove leading/trailing whitespace

    // Parse address components (simplified)
    const parts = normalizedAddress.split(',').map(p => p.trim());

    return {
      normalizedAddress,
      street: parts[0] || '',
      city: parts[1] || '',
      state: parts[2]?.split(' ')[0] || '',
      zipCode: parts[2]?.split(' ')[1] || '',
      latitude: 38.9072, // Default to DC area for demo
      longitude: -77.0369,
      confidence: 0.85,
      source: 'mock_geocoder',
      note: 'Production would use real geocoding service',
    };
  }

  /**
   * Get census tract for coordinates
   */
  async getCensusTract(
    latitude: number,
    longitude: number
  ): Promise<{
    tractCode: string | null;
    countyFips: string | null;
    stateFips: string;
    blockGroup: string;
    source: string;
    note: string;
  }> {
    // In production, call Census Bureau Geocoder API
    // https://geocoding.geo.census.gov/geocoder/geographies/coordinates

    return {
      tractCode: '11001000100', // Example DC tract
      countyFips: '11001',
      stateFips: '11',
      blockGroup: '1',
      source: 'mock_census',
      note: 'Production would use Census Bureau API',
    };
  }

  // ============ PRIVATE HELPER METHODS ============

  private async checkCache(address: string): Promise<{
    latitude: number;
    longitude: number;
    isHubzone: boolean;
    hubzoneType: string | null;
  } | null> {
    const normalizedAddress = address.toUpperCase().trim();

    const cached = await this.prisma.addressLookupCache.findUnique({
      where: { inputAddress: normalizedAddress },
    });

    if (cached && cached.expiresAt > new Date()) {
      return {
        latitude: cached.latitude,
        longitude: cached.longitude,
        isHubzone: cached.isHubzone,
        hubzoneType: cached.hubzoneType,
      };
    }

    return null;
  }

  private formatCachedResult(cached: {
    latitude: number;
    longitude: number;
    isHubzone: boolean;
    hubzoneType: string | null;
  }): AddressVerificationResult {
    return {
      address: {
        input: '',
        normalized: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
      },
      coordinates: {
        latitude: cached.latitude,
        longitude: cached.longitude,
      },
      hubzoneStatus: {
        isHubzone: cached.isHubzone,
        hubzoneType: cached.hubzoneType as HubzoneType | null,
        censusTract: null,
        countyFips: null,
        expirationDate: null,
        redesignationRisk: 'low',
      },
      verification: {
        source: 'cache',
        timestamp: new Date(),
        confidence: 0.95,
        cacheHit: true,
      },
    };
  }

  private async querySbaApi(
    latitude: number,
    longitude: number
  ): Promise<{
    isHubzone: boolean;
    hubzoneType: HubzoneType | null;
    expirationDate: Date | null;
  }> {
    // In production, call SBA HUBZone API
    // For now, return mock data

    return {
      isHubzone: true,
      hubzoneType: 'QCT',
      expirationDate: null,
    };
  }

  private async cacheResult(
    address: string,
    geocoded: { latitude: number; longitude: number },
    hubzoneStatus: { isHubzone: boolean; hubzoneType: HubzoneType | null }
  ): Promise<void> {
    const normalizedAddress = address.toUpperCase().trim();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Cache for 30 days

    try {
      await this.prisma.addressLookupCache.upsert({
        where: { inputAddress: normalizedAddress },
        update: {
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
          isHubzone: hubzoneStatus.isHubzone,
          hubzoneType: hubzoneStatus.hubzoneType,
          expiresAt,
        },
        create: {
          inputAddress: normalizedAddress,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
          isHubzone: hubzoneStatus.isHubzone,
          hubzoneType: hubzoneStatus.hubzoneType,
          expiresAt,
        },
      });
    } catch (error) {
      console.error('[CARTOGRAPH] Cache write failed:', error);
    }
  }

  private async calculateRedesignationRisk(
    hubzoneType: HubzoneType | null,
    tractCode: string | null
  ): Promise<'low' | 'medium' | 'high'> {
    if (!hubzoneType) return 'low';

    // QCT and QNMC areas have higher risk due to periodic recalculation
    if (hubzoneType === 'QCT' || hubzoneType === 'QNMC') {
      return 'medium';
    }

    return 'low';
  }

  private getMapChangeRecommendations(affectedCount: number): string[] {
    if (affectedCount === 0) {
      return ['No immediate action required', 'Continue monitoring HUBZone map updates'];
    }

    return [
      `Re-verify addresses for ${affectedCount} affected employee(s)`,
      'Update employee HUBZone status in system',
      'Recalculate overall compliance percentage',
      'Consider relocation assistance if needed',
    ];
  }

  private getRedesignationRecommendations(riskLevel: 'low' | 'medium' | 'high'): string[] {
    switch (riskLevel) {
      case 'high':
        return [
          'Immediately identify backup HUBZone areas',
          'Prepare contingency hiring plan',
          'Consider employee relocation assistance',
          'Monitor SBA announcements closely',
        ];
      case 'medium':
        return [
          'Monitor area status quarterly',
          'Identify alternative HUBZone areas',
          'Build compliance buffer through hiring',
        ];
      default:
        return [
          'Continue normal monitoring',
          'Review status annually',
        ];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
