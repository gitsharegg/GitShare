import { NextResponse } from 'next/server';
import { getAllCoins, updateCoinData } from '@/lib/services/coinService';
import { fetchJupiterData, mapJupiterToCoinData } from '@/lib/services/jupiterService';

export async function POST() {
  try {
    console.log('Starting price update...');
    
    // Get all coins from Firebase
    const coins = await getAllCoins();
    console.log(`Found ${coins.length} coins to update`);
    
    if (coins.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No coins to update',
        updated: 0 
      });
    }
    
    // Extract mint addresses
    const mintAddresses = coins
      .map(coin => coin.contractAddress)
      .filter(addr => addr) as string[];
    
    // Process in batches of 100 (Jupiter API limit)
    const batchSize = 100;
    let totalUpdated = 0;
    
    for (let i = 0; i < mintAddresses.length; i += batchSize) {
      const batch = mintAddresses.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}: ${batch.length} addresses`);
      
      // Fetch data from Jupiter
      const jupiterData = await fetchJupiterData(batch);
      const mappedData = mapJupiterToCoinData(jupiterData);
      
      // Update each coin in Firebase
      const updatePromises = Object.entries(mappedData).map(([mintAddress, data]) => {
        const coin = coins.find(c => c.contractAddress === mintAddress);
        if (coin && coin.id) {
          return updateCoinData(coin.id, data);
        }
        return Promise.resolve();
      });
      
      await Promise.all(updatePromises);
      totalUpdated += Object.keys(mappedData).length;
      
      console.log(`Batch complete. Updated ${Object.keys(mappedData).length} coins`);
    }
    
    console.log(`Price update complete! Updated ${totalUpdated} coins`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully updated ${totalUpdated} coins`,
      updated: totalUpdated,
      total: coins.length
    });
    
  } catch (error) {
    console.error('Error updating prices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update prices' },
      { status: 500 }
    );
  }
}

// Allow GET requests too for easy testing
export async function GET() {
  return POST();
}
