export interface CoinData {
  id: string;
  name: string;
  ticker: string;
  description: string;
  image: string; // IPFS URL or storage URL
  initialBuyAmount?: string;
  xLink?: string;
  websiteLink?: string;
  telegramLink?: string;
  
  // Meteora/Blockchain data
  contractAddress?: string;
  marketCap?: number;
  holders?: number;
  volume24h?: number;
  priceChange24h?: number;
  
  // Metadata
  createdAt: number;
  createdBy?: string;
  ipfsMetadata?: string; // IPFS hash for metadata JSON
  
  // Status
  status: 'pending' | 'active' | 'failed';
  
  // Category
  category?: 'agent' | 'meme';
  
  // Verification
  verified: boolean;
  telegramHandle?: string;
  githubRepo?: string;
  verificationNotes?: string;
  
  // Sanctuary Fundraising
  sanctuaries?: Array<{
    id: string;
    percentage: number;
  }>; // Multiple sanctuaries with fee percentages
}

export interface CreateCoinForm {
  name: string;
  ticker: string;
  description: string;
  initialBuyAmount: string;
  xLink: string;
  websiteLink: string;
  telegramLink: string;
  image: File | null;
  sanctuaries: Array<{
    id: string;
    percentage: number;
  }>;
}

// Export alias for compatibility
export type Coin = CoinData;
