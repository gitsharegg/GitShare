import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import app from '@/lib/firebase';

const storage = getStorage(app);

/**
 * Upload image to Firebase Storage
 */
export async function uploadImage(imageFile: File, coinName: string): Promise<string> {
  try {
    // Create unique filename
    const timestamp = Date.now();
    const filename = `coins/${coinName}-${timestamp}.${imageFile.name.split('.').pop()}`;
    
    // Create storage reference
    const storageRef = ref(storage, filename);
    
    // Upload file
    await uploadBytes(storageRef, imageFile);
    
    // Get download URL
    const url = await getDownloadURL(storageRef);
    
    return url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
}

/**
 * Create metadata JSON and upload to Firebase Storage
 */
export async function uploadMetadata(data: {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  mintAddress?: string;
  xLink?: string;
  telegramLink?: string;
}): Promise<string> {
  try {
    const metadata: any = {
      name: data.name,
      symbol: data.symbol,
      description: data.description,
      image: data.imageUrl,
    };

    // Add social links if provided
    // IMPORTANT: Token metadata website always points to our site
    const links: any = {};
    if (data.xLink) links.twitter = data.xLink;
    if (data.mintAddress) {
      links.website = `https://gitshare.xyz/coin/${data.mintAddress}`;
    }
    if (data.telegramLink) links.telegram = data.telegramLink;
    
    if (Object.keys(links).length > 0) {
      metadata.extensions = {
        ...links
      };
    }
    
    // Convert to JSON blob
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    
    // Create unique filename
    const timestamp = Date.now();
    const filename = `metadata/${data.symbol}-${timestamp}.json`;
    
    // Create storage reference
    const storageRef = ref(storage, filename);
    
    // Upload JSON file
    await uploadBytes(storageRef, metadataBlob);
    
    // Get download URL
    const url = await getDownloadURL(storageRef);
    
    return url;
  } catch (error) {
    console.error('Error uploading metadata:', error);
    throw new Error('Failed to upload metadata');
  }
}

/**
 * Complete upload flow: image + metadata
 */
export async function uploadCoinAssets(params: {
  imageFile: File;
  name: string;
  ticker: string;
  description: string;
}): Promise<{
  imageUrl: string;
  metadataUrl: string;
}> {
  // Upload image first
  const imageUrl = await uploadImage(params.imageFile, params.name);
  
  // Create and upload metadata with image URL
  const metadataUrl = await uploadMetadata({
    name: params.name,
    symbol: params.ticker,
    description: params.description,
    imageUrl: imageUrl,
  });
  
  return {
    imageUrl,
    metadataUrl,
  };
}
