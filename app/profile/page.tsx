'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { getCoinsByCreator } from '@/lib/services/coinService';
import { CoinData } from '@/types/coin';
import Link from 'next/link';

export default function Profile() {
  const { user, authenticated } = usePrivy();
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const walletAddress = user?.wallet?.address;

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  useEffect(() => {
    const loadData = async () => {
      if (!walletAddress) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const coinsData = await getCoinsByCreator(walletAddress);
        setCoins(coinsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (authenticated && walletAddress) {
      loadData();
    } else if (authenticated && !walletAddress) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [authenticated, walletAddress]);

  const renderSkeleton = () => (
    <>
      {/* Table Header */}
      <div className="px-6 py-3">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Name
          </div>
          <div className="col-span-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
            Market Cap
          </div>
        </div>
      </div>
      
      {/* Skeleton Rows */}
      <div className="space-y-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-6 py-4">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-8 flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg animate-pulse" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
                <div className="min-w-0 space-y-2">
                  <div className="h-3.5 w-16 rounded animate-pulse" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
                  <div className="h-3 w-24 rounded animate-pulse" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
                </div>
              </div>
              <div className="col-span-4 flex justify-end">
                <div className="h-3.5 w-20 rounded animate-pulse" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (!authenticated) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
        <main className="mx-auto max-w-3xl px-6 py-8">
          {/* Unified Profile Card */}
          <div className="rounded-lg overflow-hidden">
            {/* Profile Header */}
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full animate-pulse" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
                  <div className="h-3 w-48 rounded animate-pulse" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></div>
                </div>
              </div>
            </div>

            {/* Tab Content with Connect Wallet Overlay */}
            <div className="min-h-[400px] relative">
              {renderSkeleton()}
              
              {/* Connect Wallet Overlay */}
              <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)' }}>
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-white mb-4">Please connect your wallet</h1>
                  <p className="text-gray-400">You need to connect your wallet to view your profile.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Unified Profile Card */}
        <div className="rounded-lg overflow-hidden">
          {/* Profile Header */}
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: '#3b82f6' }}>
                {walletAddress?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-white mb-0.5">
                  {shortenAddress(walletAddress || '')}
                </h1>
                <p className="text-xs text-gray-500 font-mono truncate">{walletAddress}</p>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {loading ? (
              renderSkeleton()
            ) : coins.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500">No tokens created yet</p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="px-6 py-3">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-8 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Name
                    </div>
                    <div className="col-span-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
                      Market Cap
                    </div>
                  </div>
                </div>
                
                {/* Coins List */}
                <div className="max-h-[480px] overflow-y-auto">
                  {coins.map((coin) => (
                    <Link
                      key={coin.id}
                      href={`/coin/${coin.contractAddress}`}
                      className="block px-6 py-4 transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-8 flex items-center gap-3">
                          <img 
                            src={coin.image} 
                            alt={coin.name}
                            className="w-11 h-11 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white">{coin.ticker}</div>
                            <div className="text-xs text-gray-500 truncate">{coin.name}</div>
                          </div>
                        </div>
                        <div className="col-span-4 text-right">
                          <span className="text-sm font-bold text-white">
                            ${(coin.marketCap || 0) >= 1000000 
                              ? `${((coin.marketCap || 0) / 1000000).toFixed(1)}M`
                              : `${((coin.marketCap || 0) / 1000).toFixed(1)}K`}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
