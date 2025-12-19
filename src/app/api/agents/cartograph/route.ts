import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * CARTOGRAPH Agent API Route
 * 
 * Handles address verification against HUBZone boundaries.
 * Uses geocoding + census tract lookup to determine HUBZone status.
 */

// HUBZone designation types
const HUBZONE_DESIGNATIONS = {
  QCT: 'Qualified Census Tract',
  QNMC: 'Qualified Non-Metropolitan County',
  INDIAN_LAND: 'Indian Land',
  BRAC: 'Base Realignment and Closure Area',
  REDESIGNATED: 'Redesignated Area',
  DISASTER: 'Qualified Disaster Area',
  GOVERNOR: 'Governor-Designated Covered Area',
};

// Census API endpoint
const CENSUS_GEOCODER_URL = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';

interface GeocodeResult {
  result: {
    addressMatches: Array<{
      matchedAddress: string;
      coordinates: {
        x: number; // longitude
        y: number; // latitude
      };
      geographies: {
        'Census Tracts'?: Array<{
          GEOID: string;
          STATE: string;
          COUNTY: string;
          TRACT: string;
          NAME: string;
        }>;
        'Counties'?: Array<{
          GEOID: string;
          STATE: string;
          COUNTY: string;
          NAME: string;
        }>;
      };
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskType, input, organizationId } = body;

    switch (taskType) {
      case 'verify_address':
        return handleVerifyAddress(input, organizationId);
      
      case 'batch_verify':
        return handleBatchVerify(input, organizationId);
      
      case 'get_hubzone_info':
        return handleGetHubzoneInfo(input);
      
      default:
        return NextResponse.json(
          { error: `Unknown task type: ${taskType}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Cartograph API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

async function handleVerifyAddress(
  input: { address: string; employeeId?: string },
  organizationId?: string
) {
  const { address, employeeId } = input;

  if (!address) {
    return NextResponse.json(
      { error: 'Address is required' },
      { status: 400 }
    );
  }

  // Step 1: Geocode the address using Census Bureau API
  const geocodeResult = await geocodeAddress(address);

  if (!geocodeResult.matched) {
    return NextResponse.json({
      success: true,
      address,
      isHubzone: false,
      error: 'Address could not be geocoded',
      suggestions: geocodeResult.suggestions,
    });
  }

  // Step 2: Check if the census tract is a HUBZone
  const hubzoneStatus = await checkHubzoneStatus(
    geocodeResult.censusTract,
    geocodeResult.countyFips,
    geocodeResult.stateFips
  );

  // Step 3: Store verification result
  if (organizationId) {
    try {
      await prisma.addressVerification.create({
        data: {
          employeeId: employeeId || null,
          streetAddress: geocodeResult.streetAddress || address,
          city: geocodeResult.city || '',
          state: geocodeResult.state || '',
          zipCode: geocodeResult.zipCode || '',
          fullAddress: geocodeResult.matchedAddress,
          isHubzone: hubzoneStatus.isHubzone,
          hubzoneType: hubzoneStatus.primaryType,
          hubzoneTypes: hubzoneStatus.types,
          censusTract: geocodeResult.censusTract,
          county: geocodeResult.county,
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          verificationSource: 'CENSUS_API',
          confidence: geocodeResult.confidence,
        },
      });
    } catch (dbError) {
      console.error('Failed to store verification:', dbError);
      // Continue even if storage fails
    }
  }

  return NextResponse.json({
    success: true,
    address: geocodeResult.matchedAddress,
    isHubzone: hubzoneStatus.isHubzone,
    hubzoneType: hubzoneStatus.primaryType,
    hubzoneTypes: hubzoneStatus.types,
    hubzoneDescriptions: hubzoneStatus.descriptions,
    censusTract: geocodeResult.censusTract,
    county: geocodeResult.county,
    state: geocodeResult.state,
    latitude: geocodeResult.latitude,
    longitude: geocodeResult.longitude,
    expirationDate: hubzoneStatus.expirationDate,
    verifiedAt: new Date().toISOString(),
    confidence: geocodeResult.confidence,
  });
}

async function handleBatchVerify(
  input: { addresses: string[] },
  organizationId?: string
) {
  const { addresses } = input;

  if (!addresses || !Array.isArray(addresses)) {
    return NextResponse.json(
      { error: 'Addresses array is required' },
      { status: 400 }
    );
  }

  const results = await Promise.all(
    addresses.map(async (address) => {
      const response = await handleVerifyAddress({ address }, organizationId);
      const data = await response.json();
      return data;
    })
  );

  const summary = {
    total: results.length,
    hubzone: results.filter((r) => r.isHubzone).length,
    nonHubzone: results.filter((r) => !r.isHubzone).length,
    failed: results.filter((r) => r.error).length,
  };

  return NextResponse.json({
    success: true,
    results,
    summary,
  });
}

async function handleGetHubzoneInfo(input: { type?: string }) {
  const { type } = input;

  if (type && HUBZONE_DESIGNATIONS[type as keyof typeof HUBZONE_DESIGNATIONS]) {
    return NextResponse.json({
      success: true,
      type,
      name: HUBZONE_DESIGNATIONS[type as keyof typeof HUBZONE_DESIGNATIONS],
      description: getHubzoneDescription(type),
    });
  }

  return NextResponse.json({
    success: true,
    designations: Object.entries(HUBZONE_DESIGNATIONS).map(([key, name]) => ({
      type: key,
      name,
      description: getHubzoneDescription(key),
    })),
  });
}

// Helper Functions

async function geocodeAddress(address: string): Promise<{
  matched: boolean;
  matchedAddress: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  censusTract?: string;
  countyFips?: string;
  stateFips?: string;
  county?: string;
  confidence?: number;
  suggestions?: string[];
}> {
  try {
    const params = new URLSearchParams({
      address,
      benchmark: 'Public_AR_Current',
      vintage: 'Current_Current',
      format: 'json',
    });

    const response = await fetch(`${CENSUS_GEOCODER_URL}?${params}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Census API returned ${response.status}`);
    }

    const data: GeocodeResult = await response.json();
    const matches = data.result?.addressMatches || [];

    if (matches.length === 0) {
      return {
        matched: false,
        matchedAddress: address,
        suggestions: ['Try entering the full address with city, state, and ZIP code'],
      };
    }

    const match = matches[0];
    const tract = match.geographies?.['Census Tracts']?.[0];
    const county = match.geographies?.['Counties']?.[0];

    // Parse address components from matched address
    const addressParts = match.matchedAddress.split(',').map((p) => p.trim());

    return {
      matched: true,
      matchedAddress: match.matchedAddress,
      streetAddress: addressParts[0],
      city: addressParts[1],
      state: addressParts[2]?.split(' ')[0],
      zipCode: addressParts[2]?.split(' ')[1],
      latitude: match.coordinates.y,
      longitude: match.coordinates.x,
      censusTract: tract?.GEOID,
      countyFips: county?.COUNTY,
      stateFips: county?.STATE,
      county: county?.NAME,
      confidence: 1.0,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      matched: false,
      matchedAddress: address,
      suggestions: ['Geocoding service unavailable, please try again'],
    };
  }
}

async function checkHubzoneStatus(
  censusTract?: string,
  countyFips?: string,
  stateFips?: string
): Promise<{
  isHubzone: boolean;
  primaryType?: string;
  types: string[];
  descriptions: string[];
  expirationDate?: string;
}> {
  // In production, this would query the SBA HUBZone database
  // For now, we'll use a simplified check based on known HUBZone tracts
  
  // Known HUBZone census tracts (sample - would be a full database in production)
  const knownHubzoneTracts = new Set([
    // Washington DC QCT tracts
    '11001006202',
    '11001006201',
    '11001007401',
    '11001007403',
    '11001007406',
    '11001007407',
    '11001007408',
    '11001007502',
    '11001007503',
    '11001007601',
    '11001007603',
    '11001007604',
    '11001007703',
    '11001007707',
    '11001007708',
    '11001007709',
    '11001007803',
    '11001007804',
    '11001007806',
    '11001007807',
    '11001007808',
    '11001007809',
    '11001009603',
    '11001009604',
    '11001009801',
    '11001009802',
    '11001009803',
    '11001009804',
    '11001009807',
    '11001009808',
    '11001009809',
    '11001009810',
    '11001009811',
  ]);

  // Check if census tract is a known HUBZone
  if (censusTract && knownHubzoneTracts.has(censusTract)) {
    return {
      isHubzone: true,
      primaryType: 'qct',
      types: ['qct'],
      descriptions: ['Qualified Census Tract'],
    };
  }

  // For demo purposes, check if it's in DC (many DC tracts are HUBZones)
  if (stateFips === '11') {
    // DC has many QCT HUBZones
    return {
      isHubzone: true,
      primaryType: 'qct',
      types: ['qct'],
      descriptions: ['Qualified Census Tract'],
    };
  }

  return {
    isHubzone: false,
    types: [],
    descriptions: [],
  };
}

function getHubzoneDescription(type: string): string {
  const descriptions: Record<string, string> = {
    QCT: 'A census tract where at least 50% of households have incomes below 60% of the Area Median Gross Income (AMGI) or have a poverty rate of at least 25%.',
    QNMC: 'A county located outside of a metropolitan area with median household income of less than 80% of the nonmetropolitan state median household income or an unemployment rate of at least 140% of the statewide average.',
    INDIAN_LAND: 'Land held in trust by the United States for individual Indians or tribes, or land held by individual Indians or tribes that is subject to restrictions on alienation.',
    BRAC: 'A census tract or non-metropolitan county where a military installation was closed through a base closure law.',
    REDESIGNATED: 'An area that was previously a Qualified Census Tract or Qualified Non-Metropolitan County but no longer meets the criteria. Firms have a 3-year grace period.',
    DISASTER: 'An area affected by a major disaster declared by the President.',
    GOVERNOR: 'An area designated by a state governor as a covered area eligible for HUBZone benefits.',
  };

  return descriptions[type] || 'Unknown HUBZone designation type.';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (address) {
    return handleVerifyAddress({ address });
  }

  return handleGetHubzoneInfo({});
}
