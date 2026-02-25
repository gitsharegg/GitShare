import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { Donation } from '@/types/donation';

const DONATIONS_COLLECTION = 'donations';

export async function getAllDonations(): Promise<Donation[]> {
  try {
    const querySnapshot = await getDocs(collection(db, DONATIONS_COLLECTION));
    
    const donations = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Donation[];
    
    // Filter and sort in memory to avoid needing composite index
    return donations
      .filter(d => d.status === 'active')
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    console.error('Error fetching donations:', error);
    return [];
  }
}

export async function createDonation(donationData: Omit<Donation, 'id'>): Promise<string> {
  try {
    // Remove undefined fields to avoid Firebase error
    const cleanData: any = {
      solscanLink: donationData.solscanLink,
      dollarAmount: donationData.dollarAmount,
      createdAt: Date.now(),
      status: 'active'
    };
    
    // Only add optional fields if they have values
    if (donationData.zooName) {
      cleanData.zooName = donationData.zooName;
    }
    if (donationData.zooImage) {
      cleanData.zooImage = donationData.zooImage;
    }
    
    const docRef = await addDoc(collection(db, DONATIONS_COLLECTION), cleanData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating donation:', error);
    throw error;
  }
}

export async function updateDonation(id: string, donationData: Partial<Donation>): Promise<void> {
  try {
    const donationRef = doc(db, DONATIONS_COLLECTION, id);
    await updateDoc(donationRef, donationData);
  } catch (error) {
    console.error('Error updating donation:', error);
    throw error;
  }
}

export async function deleteDonation(id: string): Promise<void> {
  try {
    const donationRef = doc(db, DONATIONS_COLLECTION, id);
    await deleteDoc(donationRef);
  } catch (error) {
    console.error('Error deleting donation:', error);
    throw error;
  }
}
