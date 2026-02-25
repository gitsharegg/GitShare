export interface Donation {
  id: string;
  solscanLink: string;
  dollarAmount: number;
  sanctuaryId?: string; // Reference to sanctuary in Firebase
  zooName?: string; // Legacy field, keep for backwards compatibility
  zooImage?: string; // Legacy field
  createdAt: number;
  status: 'active' | 'inactive';
}
