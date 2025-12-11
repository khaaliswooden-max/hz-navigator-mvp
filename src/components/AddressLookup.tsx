'use client';

import { useState } from 'react';
import { Search, MapPin, CheckCircle2, XCircle, Loader2, Info } from 'lucide-react';
import { cn, HUBZONE_TYPES, type HubzoneType } from '@/lib/utils';

interface LookupResult {
  address: string;
  latitude: number;
  longitude: number;
  isHubzone: boolean;
  hubzoneType?: string;
  designationDate?: string;
  expirationDate?: string;
  cached?: boolean;
}

interface AddressLookupProps {
  onResult?: (result: LookupResult) => void;
  className?: string;
}

export default function AddressLookup({ onResult, className }: AddressLookupProps) {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `/api/hubzone/lookup?address=${encodeURIComponent(address)}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Lookup failed');
      }

      const data: LookupResult = await response.json();
      setResult(data);
      onResult?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const hubzoneInfo = result?.hubzoneType
    ? HUBZONE_TYPES[result.hubzoneType as HubzoneType]
    : null;

  return (
    <div className={cn('card', className)}>
      <div className="card-header">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-hz-500" />
          HUBZone Address Lookup
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Check if an address is within a designated HUBZone area
        </p>
      </div>

      <div className="card-body space-y-4">
        {/* Search Form */}
        <form onSubmit={handleLookup} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter street address, city, state, ZIP..."
              className="input pl-10"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !address.trim()}
            className="btn btn-primary min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking...
              </>
            ) : (
              'Check Status'
            )}
          </button>
        </form>

        {/* Quick Examples */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-400">Try:</span>
          {[
            '1600 Pennsylvania Ave, Washington DC',
            '100 N Court Square, Huntsville AL',
            '200 E Pratt St, Baltimore MD',
          ].map((example) => (
            <button
              key={example}
              onClick={() => setAddress(example)}
              className="text-xs text-hz-500 hover:text-hz-600 hover:underline"
            >
              {example}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-critical-light rounded-lg">
            <XCircle className="w-5 h-5 text-critical flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-critical-dark">Lookup Failed</p>
              <p className="text-sm text-critical-dark/80">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={cn(
              'rounded-lg p-4 border-2 animate-fade-in',
              result.isHubzone
                ? 'bg-compliant-light border-compliant'
                : 'bg-slate-50 border-slate-200'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {result.isHubzone ? (
                  <CheckCircle2 className="w-6 h-6 text-compliant flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-slate-400 flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-slate-900">
                    {result.isHubzone
                      ? 'This address IS in a HUBZone'
                      : 'This address is NOT in a HUBZone'}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">{result.address}</p>
                </div>
              </div>

              {result.isHubzone && hubzoneInfo && (
                <div
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: hubzoneInfo.color }}
                >
                  {result.hubzoneType}
                </div>
              )}
            </div>

            {result.isHubzone && (
              <div className="mt-4 pt-4 border-t border-compliant/20 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-compliant-dark/60 uppercase tracking-wide">
                    HUBZone Type
                  </p>
                  <p className="font-medium text-compliant-dark">
                    {hubzoneInfo?.label || result.hubzoneType}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-compliant-dark/60 uppercase tracking-wide">
                    Coordinates
                  </p>
                  <p className="font-mono text-sm text-compliant-dark">
                    {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                  </p>
                </div>
                {result.designationDate && (
                  <div>
                    <p className="text-xs text-compliant-dark/60 uppercase tracking-wide">
                      Designated
                    </p>
                    <p className="font-medium text-compliant-dark">
                      {new Date(result.designationDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {result.expirationDate && (
                  <div>
                    <p className="text-xs text-compliant-dark/60 uppercase tracking-wide">
                      Expires
                    </p>
                    <p className="font-medium text-compliant-dark">
                      {new Date(result.expirationDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {result.cached && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <Info className="w-3.5 h-3.5" />
                Result from cache
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
