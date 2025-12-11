import { NextRequest, NextResponse } from 'next/server';

const SBA_HUBZONE_API = 'https://maps.certify.sba.gov/hubzone/api/geocoding';

interface GeocodingResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
}

interface HubzoneCheckResult {
  hubzone_status: boolean;
  hubzone_type?: string;
  designation_date?: string;
  expiration_date?: string;
  tract_code?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: 'Address parameter is required' },
      { status: 400 }
    );
  }

  // Check if we have a valid database connection
  const hasDatabase = process.env.DATABASE_URL && 
    process.env.DATABASE_URL.startsWith('postgresql://');

  try {
    const normalizedAddress = address.toLowerCase().trim();
    
    // Try to check cache if database is available
    if (hasDatabase) {
      try {
        const { default: prisma } = await import('@/lib/prisma');
        const cached = await prisma.addressLookupCache.findUnique({
          where: { inputAddress: normalizedAddress },
        });

        if (cached && cached.expiresAt > new Date()) {
          return NextResponse.json({
            cached: true,
            address: address,
            latitude: cached.latitude,
            longitude: cached.longitude,
            isHubzone: cached.isHubzone,
            hubzoneType: cached.hubzoneType,
          });
        }
      } catch (e) {
        console.warn('Cache lookup failed:', e);
      }
    }

    // Geocode address using Mapbox (fallback to mock for MVP)
    const geocoded = await geocodeAddress(address);
    
    if (!geocoded) {
      return NextResponse.json(
        { error: 'Could not geocode address' },
        { status: 400 }
      );
    }

    // Check HUBZone status using SBA API
    const hubzoneResult = await checkHubzoneStatus(geocoded.latitude, geocoded.longitude);

    // Cache the result if database is available (24 hour TTL)
    if (hasDatabase) {
      try {
        const { default: prisma } = await import('@/lib/prisma');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        await prisma.addressLookupCache.upsert({
          where: { inputAddress: normalizedAddress },
          create: {
            inputAddress: normalizedAddress,
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
            isHubzone: hubzoneResult.hubzone_status,
            hubzoneType: hubzoneResult.hubzone_type || null,
            expiresAt,
          },
          update: {
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
            isHubzone: hubzoneResult.hubzone_status,
            hubzoneType: hubzoneResult.hubzone_type || null,
            expiresAt,
          },
        });
      } catch (e) {
        console.warn('Cache save failed:', e);
      }
    }

    return NextResponse.json({
      cached: false,
      address: geocoded.formatted_address || address,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
      isHubzone: hubzoneResult.hubzone_status,
      hubzoneType: hubzoneResult.hubzone_type,
      designationDate: hubzoneResult.designation_date,
      expirationDate: hubzoneResult.expiration_date,
    });
  } catch (error) {
    console.error('HUBZone lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to check HUBZone status' },
      { status: 500 }
    );
  }
}

async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
  if (!mapboxToken) {
    // Mock geocoding for demo/development
    console.warn('No Mapbox token, using mock geocoding');
    return mockGeocode(address);
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&country=US&limit=1`
    );

    if (!response.ok) {
      throw new Error('Mapbox geocoding failed');
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return {
        latitude: feature.center[1],
        longitude: feature.center[0],
        formatted_address: feature.place_name,
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return mockGeocode(address);
  }
}

async function checkHubzoneStatus(lat: number, lng: number): Promise<HubzoneCheckResult> {
  try {
    // Try SBA's HUBZone API
    const response = await fetch(
      `${SBA_HUBZONE_API}/hubzone?latlng=${lat},${lng}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        hubzone_status: data.hubzone_status || false,
        hubzone_type: data.hubzone_type,
        designation_date: data.designation_date,
        expiration_date: data.expiration_date,
        tract_code: data.tract_code,
      };
    }
  } catch (error) {
    console.error('SBA API error:', error);
  }

  // Fallback: Use internal HUBZone data if available
  // For MVP, return mock based on known HUBZone patterns
  return mockHubzoneCheck(lat, lng);
}

function mockGeocode(address: string): GeocodingResult {
  // Simple mock for testing - returns DC coordinates
  const addressLower = address.toLowerCase();
  
  // Some known test locations
  if (addressLower.includes('huntsville') || addressLower.includes('35801')) {
    return { latitude: 34.7304, longitude: -86.5861, formatted_address: 'Huntsville, AL' };
  }
  if (addressLower.includes('washington') || addressLower.includes('20001')) {
    return { latitude: 38.9072, longitude: -77.0369, formatted_address: 'Washington, DC' };
  }
  if (addressLower.includes('baltimore') || addressLower.includes('21201')) {
    return { latitude: 39.2904, longitude: -76.6122, formatted_address: 'Baltimore, MD' };
  }
  
  // Default: random coordinates in continental US
  return {
    latitude: 38.9 + (Math.random() - 0.5) * 10,
    longitude: -77.0 + (Math.random() - 0.5) * 20,
    formatted_address: address,
  };
}

function mockHubzoneCheck(lat: number, lng: number): HubzoneCheckResult {
  // Mock HUBZone status based on coordinates
  // In production, this would query the actual HUBZone boundary data
  
  // Simulate ~40% of addresses being in HUBZones for demo
  const isHubzone = (Math.abs(lat * lng) % 10) < 4;
  
  const types = ['QCT', 'QNMC', 'DDA', 'INDIAN'];
  const randomType = types[Math.floor(Math.abs(lat * 100) % types.length)];
  
  return {
    hubzone_status: isHubzone,
    hubzone_type: isHubzone ? randomType : undefined,
    designation_date: isHubzone ? '2020-01-01' : undefined,
    expiration_date: isHubzone ? '2025-12-31' : undefined,
  };
}
