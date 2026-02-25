'use client';

import { useEffect, useState } from 'react';
import { getAllCoins } from '@/lib/services/coinService';
import { CoinData } from '@/types/coin';
import { Globe, ChartLineUp, Lightning, MagnifyingGlass, Rocket } from 'phosphor-react';
import Link from 'next/link';

type SortOption = 'marketCap' | 'new';

export default function Home() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('marketCap');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<CoinData[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const coinsData = await getAllCoins();
        setCoins(coinsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Calculate stats
  const totalVolume = coins.reduce((acc, coin) => acc + (coin.marketCap || 0), 0);
  const totalHolders = coins.reduce((acc, coin) => acc + (coin.holders || 0), 0);
  const listedSites = coins.filter(c => c.status === 'active').length;

  // Filter and sort coins - optimized with top 50 limit
  const filteredCoins = [...coins]
    .filter(coin => {
      // Filter by active status
      if (coin.status !== 'active') return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'marketCap':
          // Sort by market cap descending
          return (b.marketCap || 0) - (a.marketCap || 0);
        case 'new':
          // Sort by creation time descending (most recent first)
          return (b.createdAt || 0) - (a.createdAt || 0);
        default:
          return 0;
      }
    })
    .slice(0, 50); // Limit to top 50 for performance

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // If exact match in search results, go to it
      const exactMatch = searchResults.find(coin => 
        coin.contractAddress?.toLowerCase() === searchQuery.toLowerCase()
      );
      if (exactMatch && exactMatch.contractAddress) {
        window.location.href = `/coin/${exactMatch.contractAddress}`;
      } else if (searchResults.length > 0 && searchResults[0].contractAddress) {
        // Go to first result
        window.location.href = `/coin/${searchResults[0].contractAddress}`;
      } else {
        // Try as contract address
        window.location.href = `/coin/${searchQuery.trim()}`;
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (value.trim()) {
      // Filter coins by name, ticker, or contract address
      const filtered = coins
        .filter(coin => coin.status === 'active' && coin.contractAddress)
        .filter(coin => 
          coin.name.toLowerCase().includes(value.toLowerCase()) ||
          coin.ticker.toLowerCase().includes(value.toLowerCase()) ||
          coin.contractAddress?.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 5); // Show max 5 results
      
      setSearchResults(filtered);
      setShowSearchDropdown(filtered.length > 0);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  };

  const handleSelectResult = (contractAddress: string) => {
    window.location.href = `/coin/${contractAddress}`;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#09090b' }}>
      <main className="w-full">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
          {/* Hero Text */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span style={{ color: '#f97316' }}>IPO</span>{' '}
            <span className="text-white">Your Website</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base text-gray-400 max-w-2xl">
            The stock market for the indie web. Tokenize your website, sell shares via IPO, 
            and auto-split revenue to holders.
          </p>
        </div>

        {/* Coins Section */}
        <div id="coins-section" className="pb-12">
          <div className="max-w-7xl mx-auto px-6">
            {/* Filter Tabs and Search */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortBy('marketCap')}
                  className="flex items-center gap-1.5 px-4 py-2 font-semibold text-sm cursor-pointer transition-all select-none"
                  style={{
                    backgroundColor: sortBy === 'marketCap' ? '#f97316' : 'transparent',
                    color: sortBy === 'marketCap' ? '#ffffff' : '#9ca3af',
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <ChartLineUp size={16} weight="regular" />
                  Market cap
                </button>
                <button
                  onClick={() => setSortBy('new')}
                  className="flex items-center gap-1.5 px-4 py-2 font-semibold text-sm cursor-pointer transition-all select-none"
                  style={{
                    backgroundColor: sortBy === 'new' ? '#f97316' : 'transparent',
                    color: sortBy === 'new' ? '#ffffff' : '#9ca3af',
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <Lightning size={16} weight="regular" />
                  New
                </button>
              </div>
              
              {/* Search */}
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  placeholder="Search by name or address..."
                  className="pl-10 pr-4 py-2 text-sm focus:outline-none text-white placeholder-gray-500 w-64"
                  style={{ backgroundColor: '#0f0f0f' }}
                />
                <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                
                {/* Search Dropdown */}
                {showSearchDropdown && searchResults.length > 0 && (
                  <div 
                    className="absolute top-full left-0 right-0 mt-2 rounded-lg overflow-hidden shadow-xl z-50"
                    style={{ backgroundColor: '#0f0f0f', border: '1px solid #1f1f1f' }}
                  >
                    {searchResults.map((coin) => (
                      <button
                        key={coin.id}
                        type="button"
                        onClick={() => coin.contractAddress && handleSelectResult(coin.contractAddress)}
                        className="w-full px-3 py-2 flex items-center gap-2 transition-colors cursor-pointer text-left"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <img 
                          src={coin.image} 
                          alt={coin.name}
                          className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">{coin.name}</div>
                          <div className="text-xs text-gray-400 truncate">{coin.ticker}</div>
                        </div>
                        <div className="text-xs font-bold text-green-400">
                          ${(coin.marketCap || 0) >= 1000000 
                            ? `${((coin.marketCap || 0) / 1000000).toFixed(1)}M`
                            : `${((coin.marketCap || 0) / 1000).toFixed(1)}K`}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {/* Coins List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ backgroundColor: '#1f1f1f' }}>
              {/* Real coins */}
              {filteredCoins.map((coin) => (
                <div 
                  key={coin.id}
                  className="cursor-pointer transition-colors hover:opacity-80"
                  onClick={() => window.location.href = `/coin/${coin.contractAddress}`}
                  style={{ backgroundColor: '#0a0a0a' }}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <img 
                        src={coin.image} 
                        alt={coin.name}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-sm mb-0.5">{coin.name}</h3>
                        <p className="text-gray-500 text-xs">${coin.ticker} • {coin.createdBy ? `${coin.createdBy.slice(0, 4)}...${coin.createdBy.slice(-4)}` : 'Anonymous'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500 mb-0.5">MCAP</p>
                        <p className="text-sm font-bold text-white">
                          ${(coin.marketCap || 0) >= 1000000 
                            ? `${((coin.marketCap || 0) / 1000000).toFixed(1)}M`
                            : `${((coin.marketCap || 0) / 1000).toFixed(1)}K`}
                        </p>
                      </div>
                    </div>
                    
                    {coin.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">{coin.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>0 commits</span>
                      <span>$0 PRIZE POOL</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Placeholder cards */}
              {Array.from({ length: Math.max(0, 9 - filteredCoins.length) }).map((_, i) => (
                <div key={`placeholder-${i}`} style={{ backgroundColor: '#0a0a0a' }}>
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded flex-shrink-0" style={{ backgroundColor: '#1a1a1a' }}></div>
                      <div className="flex-1">
                        <div className="h-3 w-24 mb-1 rounded" style={{ backgroundColor: '#1a1a1a' }}></div>
                        <div className="h-2 w-32 rounded" style={{ backgroundColor: '#1a1a1a' }}></div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="h-2 w-8 mb-1 rounded ml-auto" style={{ backgroundColor: '#1a1a1a' }}></div>
                        <div className="h-3 w-16 rounded" style={{ backgroundColor: '#1a1a1a' }}></div>
                      </div>
                    </div>
                    <div className="h-2 w-full mb-1 rounded" style={{ backgroundColor: '#1a1a1a' }}></div>
                    <div className="h-2 w-3/4 mb-2 rounded" style={{ backgroundColor: '#1a1a1a' }}></div>
                    <div className="flex items-center justify-between">
                      <div className="h-2 w-16 rounded" style={{ backgroundColor: '#1a1a1a' }}></div>
                      <div className="h-2 w-20 rounded" style={{ backgroundColor: '#1a1a1a' }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
