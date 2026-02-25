import { Keypair } from '@solana/web3.js';

/**
 * Generate a new token mint keypair
 * This is generated in the browser when user clicks "Create Coin"
 */
export function generateMintKeypair(): Keypair {
  return Keypair.generate();
}

/**
 * Get the complete create flow with mint generation
 * Call this when user submits the form
 */
export async function prepareCoinCreation(params: {
  imageFile: File;
  name: string;
  ticker: string;
  description: string;
  xLink?: string;
  websiteLink?: string;
  telegramLink?: string;
}) {
  // Step 1: Generate the mint keypair (baseMint)
  const mintKeypair = generateMintKeypair();
  const mintAddress = mintKeypair.publicKey.toString();
  console.log('Generated mint address:', mintAddress);
  
  // Step 2: Upload image and metadata
  const { uploadImage, uploadMetadata } = await import('./uploadService');
  
  // Upload image first
  const imageUrl = await uploadImage(params.imageFile, params.name);
  
  // Create and upload metadata with token's website always pointing to our site
  // The websiteLink param is NOT used in metadata, only stored in database
  const metadataUrl = await uploadMetadata({
    name: params.name,
    symbol: params.ticker,
    description: params.description,
    imageUrl: imageUrl,
    mintAddress: mintAddress, // Pass mint address for token website link
    xLink: params.xLink,
    telegramLink: params.telegramLink,
  });
  
  console.log('Uploaded assets:');
  console.log('- Image URL:', imageUrl);
  console.log('- Metadata URL:', metadataUrl);
  
  // Return everything needed for Meteora
  return {
    mintKeypair,
    imageUrl,
    metadataUrl,
  };
}
