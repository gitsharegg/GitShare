import { NextRequest, NextResponse } from 'next/server';
import { PublicKey, Connection } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creator = searchParams.get('creator');

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator address is required' },
        { status: 400 }
      );
    }

    // Validate creator address
    let creatorPubkey: PublicKey;
    try {
      creatorPubkey = new PublicKey(creator);
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid creator address format' },
        { status: 400 }
      );
    }

    // Initialize Solana connection
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Initialize Meteora SDK
    const client = DynamicBondingCurveClient.create(connection);

    // Fetch pools by creator
    const pools = await client.state.getPoolsByCreator(creatorPubkey);

    // Format the response with fee information
    const formattedPools = pools.map((pool) => ({
      publicKey: pool.publicKey.toString(),
      account: {
        creator: pool.account.creator.toString(),
        baseMint: pool.account.baseMint.toString(),
        config: pool.account.config.toString(),
        // Partner fees accumulated (what can be claimed by partners)
        partnerBaseFee: pool.account.partnerBaseFee?.toString() || '0',
        partnerQuoteFee: pool.account.partnerQuoteFee?.toString() || '0',
        // Protocol fees accumulated
        protocolBaseFee: pool.account.protocolBaseFee?.toString() || '0',
        protocolQuoteFee: pool.account.protocolQuoteFee?.toString() || '0',
        // Creator fees accumulated
        creatorBaseFee: pool.account.creatorBaseFee?.toString() || '0',
        creatorQuoteFee: pool.account.creatorQuoteFee?.toString() || '0',
      },
    }));

    return NextResponse.json({
      success: true,
      pools: formattedPools,
      count: formattedPools.length,
    });

  } catch (error) {
    console.error('Error fetching pools:', error);
    
    let errorMessage = 'Failed to fetch pools';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
