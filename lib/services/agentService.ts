import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export interface AgentSubmission {
  id: string;
  name: string;
  language: string;
  description: string;
  tags: string;
  githubRepo: string;
  requirements: { package: string; install: string }[];
  links: { name: string; url: string }[];
  submittedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  imageUrl?: string;
}

export async function getAgentSubmissionsByWallet(walletAddress: string): Promise<AgentSubmission[]> {
  try {
    const q = query(
      collection(db, 'agent-submissions'),
      where('submittedBy', '==', walletAddress)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AgentSubmission));
  } catch (error) {
    console.error('Error fetching agent submissions:', error);
    return [];
  }
}
