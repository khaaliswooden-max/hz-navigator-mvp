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
    <div className={cn('bg-zinc-900 border border-white/5 rounded-xl overflow-hidden', className)}>
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-400" />
          HUBZone Address Lookup
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Check if an address is within a designated HUBZone area
        </p>
      </div>

      <div className="p-6 space-y-4">
        {/* Search Form */}
        <form onSubmit={handleLookup} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter street address, city, state, ZIP..."
              className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !address.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors flex items-center gap-2 min-w-[120px] justify-center"
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
          <span className="text-xs text-zinc-500">Try:</span>
          {[
            '1600 Pennsylvania Ave, Washington DC',
            '100 N Court Square, Huntsville AL',
            '200 E Pratt St, Baltimore MD',
          ].map((example) => (
            <button
              key={example}
              onClick={() => setAddress(example)}
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
            >
              {example}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-400">Lookup Failed</p>
              <p className="text-sm text-red-400/80">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={cn(
              'rounded-xl p-4 border-2 animate-fade-in',
              result.isHubzone
                ? 'bg-emerald-500/10 border-emerald-500/50'
                : 'bg-zinc-800 border-zinc-700'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {result.isHubzone ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-zinc-500 flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-white">
                    {result.isHubzone
                      ? 'This address IS in a HUBZone'
                      : 'This address is NOT in a HUBZone'}
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">{result.address}</p>
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
              <div className="mt-4 pt-4 border-t border-emerald-500/20 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-emerald-400/60 uppercase tracking-wide">
                    HUBZone Type
                  </p>
                  <p className="font-medium text-emerald-400">
                    {hubzoneInfo?.label || result.hubzoneType}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-400/60 uppercase tracking-wide">
                    Coordinates
                  </p>
                  <p className="font-mono text-sm text-emerald-400">
                    {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                  </p>
                </div>
                {result.designationDate && (
                  <div>
                    <p className="text-xs text-emerald-400/60 uppercase tracking-wide">
                      Designated
                    </p>
                    <p className="font-medium text-emerald-400">
                      {new Date(result.designationDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {result.expirationDate && (
                  <div>
                    <p className="text-xs text-emerald-400/60 uppercase tracking-wide">
                      Expires
                    </p>
                    <p className="font-medium text-emerald-400">
                      {new Date(result.expirationDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {result.cached && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
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
