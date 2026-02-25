// Jupiter Lite API Service for updating coin prices and market data

interface JupiterTokenData {
  id: string; // mint address
  mcap: number; // Market cap
  holderCount: number;
  liquidity: number;
  stats5m?: {
    priceChange: number;
  };
}

/**
 * Fetch token data from Jupiter Lite API for multiple mint addresses
 * API supports up to 100 addresses at once
 */
export async function fetchJupiterData(mintAddresses: string[]) {
  try {
    // API allows up to 100 addresses
    const addresses = mintAddresses.slice(0, 100);
    const query = addresses.join(',');
    
    console.log(`Fetching Jupiter data for ${addresses.length} addresses...`);
    console.log('Query:', query);
    
    const response = await fetch(
      `https://lite-api.jup.ag/tokens/v2/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );
    
    if (!response.ok) {
      console.error('Jupiter API error:', response.status);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return [];
    }
    
    const data = await response.json();
    console.log('Jupiter API response:', data);
    console.log(`Received data for ${Array.isArray(data) ? data.length : 0} tokens`);
    
    // API returns array directly, not wrapped in data property
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching Jupiter data:', error);
    return [];
  }
}

/**
 * Map Jupiter data to our format (only the fields we display in cards)
 */
export function mapJupiterToCoinData(jupiterData: JupiterTokenData[]) {
  const mapped: { [mintAddress: string]: any } = {};
  
  jupiterData.forEach(token => {
    mapped[token.id] = {
      holders: token.holderCount || 0,
      marketCap: token.mcap || 0,
      volume24h: token.liquidity || 0, // Using liquidity as volume proxy
      priceChange24h: token.stats5m?.priceChange || 0,
    };
  });
  
  return mapped;
}
