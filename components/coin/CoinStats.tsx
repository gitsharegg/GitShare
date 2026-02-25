interface CoinStatsProps {
  marketCap: number;
  volume24h: number;
  holders: number;
  priceChange24h: number;
}

export default function CoinStats({ marketCap, volume24h, holders, priceChange24h }: CoinStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <div>
        <div className="text-gray-500 text-xs font-medium mb-1">Market Cap</div>
        <div className="text-white text-base font-bold">${marketCap.toLocaleString()}</div>
      </div>
      <div>
        <div className="text-gray-500 text-xs font-medium mb-1">24h Volume</div>
        <div className="text-white text-base font-bold">${volume24h.toLocaleString()}</div>
      </div>
      <div>
        <div className="text-gray-500 text-xs font-medium mb-1">Holders</div>
        <div className="text-white text-base font-bold">{holders.toLocaleString()}</div>
      </div>
      <div>
        <div className="text-gray-500 text-xs font-medium mb-1">24h Change</div>
        <div className={`text-base font-bold ${priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
