import { NextRequest, NextResponse } from 'next/server';
import { PublicKey, Connection } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import BN from 'bn.js';

interface ClaimFeesRequest {
  pool: string;
  feeClaimer: string;
  payer: string;
  maxBaseAmount: string;
  maxQuoteAmount: string;
  receiver?: string | null;
  tempWSolAcc?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: ClaimFeesRequest = await request.json();

    // Validate required fields
    if (!body.pool || !body.feeClaimer || !body.payer) {
      return NextResponse.json(
        { error: 'Missing required fields: pool, feeClaimer, and payer are required' },
        { status: 400 }
      );
    }

    // Validate addresses
    let poolPubkey: PublicKey;
    let feeClaimerPubkey: PublicKey;
    let payerPubkey: PublicKey;
    let receiverPubkey: PublicKey | undefined = undefined;
    let tempWSolPubkey: PublicKey | undefined = undefined;

    try {
      poolPubkey = new PublicKey(body.pool);
      feeClaimerPubkey = new PublicKey(body.feeClaimer);
      payerPubkey = new PublicKey(body.payer);
      
      if (body.receiver) {
        receiverPubkey = new PublicKey(body.receiver);
      }
      
      if (body.tempWSolAcc) {
        tempWSolPubkey = new PublicKey(body.tempWSolAcc);
      }
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid public key format' },
        { status: 400 }
      );
    }

    // Initialize Solana connection
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Initialize Meteora SDK
    const client = DynamicBondingCurveClient.create(connection);

    // Convert amounts to BN - expects amounts in smallest unit (lamports/raw tokens)
    const maxBaseAmountBN = new BN(body.maxBaseAmount || '0');
    const maxQuoteAmountBN = new BN(body.maxQuoteAmount || '0');

    console.log('Attempting to claim partner trading fee with params:', {
      pool: body.pool,
      feeClaimer: body.feeClaimer,
      payer: body.payer,
      maxBaseAmount: body.maxBaseAmount,
      maxQuoteAmount: body.maxQuoteAmount,
      receiver: body.receiver,
      tempWSolAcc: body.tempWSolAcc
    });

    // Validate pool exists
    try {
      const poolInfo = await connection.getAccountInfo(poolPubkey);
      if (!poolInfo) {
        return NextResponse.json(
          { error: 'Pool account does not exist' },
          { status: 400 }
        );
      }
      console.log('Pool account found, owner:', poolInfo.owner.toString());
    } catch (error) {
      console.error('Error fetching pool info:', error);
      return NextResponse.json(
        { error: 'Failed to validate pool account' },
        { status: 400 }
      );
    }

    // Prepare parameters for claiming fees
    const params = {
      pool: poolPubkey,
      feeClaimer: feeClaimerPubkey,
      payer: payerPubkey,
      maxBaseAmount: maxBaseAmountBN,
      maxQuoteAmount: maxQuoteAmountBN,
      receiver: receiverPubkey,
      tempWSolAcc: tempWSolPubkey,
    };

    // Create the claim fees transaction
    const transaction = await client.partner.claimPartnerTradingFee(params);

    // Get recent blockhash and set it on the transaction
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payerPubkey;

    // Serialize the transaction for the frontend to sign
    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString('base64');

    return NextResponse.json({
      success: true,
      message: 'Transaction created successfully. Please sign and send using your wallet.',
      transaction: serializedTx,
      params: {
        pool: body.pool,
        feeClaimer: body.feeClaimer,
        payer: body.payer,
        maxBaseAmount: body.maxBaseAmount,
        maxQuoteAmount: body.maxQuoteAmount,
        receiver: body.receiver || 'Not specified',
        tempWSolAcc: body.tempWSolAcc || 'Not specified',
      },
    });

  } catch (error) {
    console.error('Error claiming fees:', error);
    
    let errorMessage = 'Failed to claim fees';
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
