import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, where, doc, updateDoc } from 'firebase/firestore';
import { CoinData } from '@/types/coin';

const COINS_COLLECTION = 'coins';

/**
 * Save coin to Firestore after successful Meteora deployment or as pending submission
 */
export async function saveCoin(
  coinData: Omit<CoinData, 'id' | 'createdAt' | 'status'>,
  status: 'active' | 'pending' = 'active'
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COINS_COLLECTION), {
      ...coinData,
      createdAt: Date.now(),
      status: status,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving coin:', error);
    throw new Error('Failed to save coin to database');
  }
}

/**
 * Get all active coins ordered by market cap for homepage
 */
export async function getCoinsForHomepage(limitCount: number = 50): Promise<CoinData[]> {
  try {
    const q = query(
      collection(db, COINS_COLLECTION),
      where('status', '==', 'active'),
      orderBy('marketCap', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CoinData));
  } catch (error) {
    console.error('Error fetching coins:', error);
    return [];
  }
}

/**
 * Get all coins for creations page
 */
export async function getAllCoins(): Promise<CoinData[]> {
  try {
    const q = query(
      collection(db, COINS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CoinData));
  } catch (error) {
    console.error('Error fetching all coins:', error);
    return [];
  }
}

/**
 * Get coins by creator address
 */
export async function getCoinsByCreator(creatorAddress: string): Promise<CoinData[]> {
  try {
    // Try with index-required query first
    try {
      const q = query(
        collection(db, COINS_COLLECTION),
        where('createdBy', '==', creatorAddress),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CoinData));
    } catch (indexError) {
      // If index doesn't exist, fall back to filtering client-side
      console.log('Falling back to client-side filtering');
      const q = query(
        collection(db, COINS_COLLECTION),
        where('createdBy', '==', creatorAddress)
      );
      const querySnapshot = await getDocs(q);
      const coins = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CoinData));
      
      // Sort by createdAt descending
      return coins.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  } catch (error) {
    console.error('Error fetching coins by creator:', error);
    return [];
  }
}

/**
 * Get coin by contract address
 */
export async function getCoinByAddress(address: string): Promise<CoinData | null> {
  try {
    const q = query(
      collection(db, COINS_COLLECTION),
      where('contractAddress', '==', address),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const docSnapshot = querySnapshot.docs[0];
    return {
      id: docSnapshot.id,
      ...docSnapshot.data()
    } as CoinData;
  } catch (error) {
    console.error('Error fetching coin by address:', error);
    return null;
  }
}

/**
 * Update coin data (for price updates from Jupiter API)
 */
export async function updateCoinData(
  coinId: string, 
  data: Partial<CoinData>
): Promise<void> {
  try {
    const coinRef = doc(db, COINS_COLLECTION, coinId);
    await updateDoc(coinRef, {
      ...data,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error updating coin data:', error);
    throw new Error('Failed to update coin data');
  }
}
