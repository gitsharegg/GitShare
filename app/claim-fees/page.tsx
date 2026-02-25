'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { PublicKey, Transaction, Connection, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import Navbar from '../../components/Navbar';

interface Pool {
  publicKey: string;
  account: {
    creator: string;
    baseMint: string;
    config: string;
    partnerBaseFee: string;
    partnerQuoteFee: string;
    protocolBaseFee: string;
    protocolQuoteFee: string;
    creatorBaseFee: string;
    creatorQuoteFee: string;
  };
}

export default function ClaimFeesPage() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [poolAddress, setPoolAddress] = useState('');
  const [maxBaseAmount, setMaxBaseAmount] = useState('');
  const [maxQuoteAmount, setMaxQuoteAmount] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [tempWSolAddress, setTempWSolAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [loadingPools, setLoadingPools] = useState(false);
  const [poolsError, setPoolsError] = useState<string | null>(null);
  const [showPools, setShowPools] = useState(false);
  const [creatorAddress, setCreatorAddress] = useState('');

  const walletAddress = user?.wallet?.address;

  const fetchMyPools = async () => {
    if (!creatorAddress) {
      setPoolsError('Please enter a creator address');
      return;
    }

    // Validate the address
    try {
      new PublicKey(creatorAddress);
    } catch {
      setPoolsError('Invalid creator address format');
      return;
    }

    setLoadingPools(true);
    setPoolsError(null);

    try {
      const response = await fetch(`/api/get-pools?creator=${creatorAddress}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pools');
      }

      setPools(data.pools || []);
      setShowPools(true);
    } catch (err) {
      setPoolsError(err instanceof Error ? err.message : 'Failed to fetch pools');
    } finally {
      setLoadingPools(false);
    }
  };

  const selectPool = (pool: Pool) => {
    setPoolAddress(pool.publicKey);
    setShowPools(false);
  };

  const handleClaimFees = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authenticated || !walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setTxSignature(null);

    try {
      // Validate pool address
      try {
        new PublicKey(poolAddress);
      } catch {
        throw new Error('Invalid pool address');
      }

      if (receiverAddress) {
        try {
          new PublicKey(receiverAddress);
        } catch {
          throw new Error('Invalid receiver address');
        }
      }

      if (tempWSolAddress) {
        try {
          new PublicKey(tempWSolAddress);
        } catch {
          throw new Error('Invalid temporary WSOL address');
        }
      }

      const response = await fetch('/api/claim-fees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pool: poolAddress,
          feeClaimer: walletAddress,
          payer: walletAddress,
          maxBaseAmount: maxBaseAmount || '0',
          maxQuoteAmount: maxQuoteAmount || '0',
          receiver: receiverAddress || null,
          tempWSolAcc: tempWSolAddress || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim fees');
      }

      // Get the transaction from API response
      if (!data.transaction) {
        throw new Error('No transaction returned from API');
      }

      // Get the Solana wallet from Privy
      if (!wallets || wallets.length === 0) {
        throw new Error('No Solana wallet connected!');
      }

      const wallet = wallets[0];

      // Deserialize the transaction
      const txBuffer = Buffer.from(data.transaction, 'base64');
      const transaction = Transaction.from(txBuffer);

      // Initialize connection
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
        'confirmed'
      );

      // Serialize the transaction to bytes
      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      // Let Privy sign AND send the transaction
      const res = await wallet.signAndSendTransaction!({
        chain: 'solana:mainnet',
        transaction: new Uint8Array(serialized),
      });

      // Normalize signature to base58 for confirmTransaction
      const sigBase58 =
        typeof res.signature === 'string'
          ? res.signature
          : bs58.encode(res.signature);

      await connection.confirmTransaction(sigBase58, 'confirmed');
      
      setTxSignature(sigBase58);
      setResult('Fees claimed successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f7f6fb' }}>
      <Navbar />
      
      <div className="flex-grow max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Claim Trading Fees
            </h1>
            <p className="text-gray-600">
              Claim your partner trading fees from dynamic bonding curve pools
            </p>
          </div>

          {!authenticated ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-yellow-800 font-semibold mb-4">
                Please connect your wallet to claim fees
              </p>
            </div>
          ) : (
            <>
              {/* Load Pools Section */}
              <div className="mb-6">
                <label htmlFor="creatorAddress" className="block text-sm font-bold text-gray-900 mb-2">
                  Load Pools by Creator Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="creatorAddress"
                    value={creatorAddress}
                    onChange={(e) => setCreatorAddress(e.target.value)}
                    placeholder="Enter creator wallet address"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={fetchMyPools}
                    disabled={loadingPools || !creatorAddress}
                    className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold text-sm transition-colors whitespace-nowrap"
                  >
                    {loadingPools ? 'Loading...' : 'Load Pools'}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Enter any creator wallet address to view their pools and select one
                </p>
              </div>

              {/* Pools List */}
              {poolsError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-bold mb-1">Error Loading Pools</p>
                  <p className="text-red-700 text-sm">{poolsError}</p>
                </div>
              )}

              {showPools && pools.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-3">Pools ({pools.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {pools.map((pool) => {
                      const partnerBaseFee = BigInt(pool.account.partnerBaseFee || '0');
                      const partnerQuoteFee = BigInt(pool.account.partnerQuoteFee || '0');
                      const protocolBaseFee = BigInt(pool.account.protocolBaseFee || '0');
                      const protocolQuoteFee = BigInt(pool.account.protocolQuoteFee || '0');
                      const creatorBaseFee = BigInt(pool.account.creatorBaseFee || '0');
                      const creatorQuoteFee = BigInt(pool.account.creatorQuoteFee || '0');
                      const hasClaimableFees = partnerBaseFee > BigInt(0) || partnerQuoteFee > BigInt(0);
                      
                      return (
                        <button
                          key={pool.publicKey}
                          type="button"
                          onClick={() => selectPool(pool)}
                          className="w-full text-left p-3 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-mono text-gray-900 font-bold break-all">
                                {pool.publicKey}
                              </p>
                              <div className="mt-1 text-xs text-gray-600">
                                <span className="font-semibold">Creator:</span> {pool.account.creator.slice(0, 8)}...
                              </div>
                            </div>
                            {hasClaimableFees && (
                              <div className="flex-shrink-0">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  💰 Fees Available
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Fee Details */}
                          <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                            {/* Partner Fees (Claimable) */}
                            <div>
                              <p className="text-xs font-semibold text-green-700 mb-1">Partner Fees (Claimable):</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-600">Base:</span>{' '}
                                  <span className="font-mono font-semibold text-gray-900">
                                    {partnerBaseFee === BigInt(0) ? '0' : partnerBaseFee.toString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Quote:</span>{' '}
                                  <span className="font-mono font-semibold text-gray-900">
                                    {partnerQuoteFee === BigInt(0) ? '0' : partnerQuoteFee.toString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Protocol Fees */}
                            <div>
                              <p className="text-xs font-semibold text-blue-700 mb-1">Protocol Fees:</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-600">Base:</span>{' '}
                                  <span className="font-mono font-semibold text-gray-900">
                                    {protocolBaseFee === BigInt(0) ? '0' : protocolBaseFee.toString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Quote:</span>{' '}
                                  <span className="font-mono font-semibold text-gray-900">
                                    {protocolQuoteFee === BigInt(0) ? '0' : protocolQuoteFee.toString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Creator Fees */}
                            <div>
                              <p className="text-xs font-semibold text-purple-700 mb-1">Creator Fees:</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-600">Base:</span>{' '}
                                  <span className="font-mono font-semibold text-gray-900">
                                    {creatorBaseFee === BigInt(0) ? '0' : creatorBaseFee.toString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Quote:</span>{' '}
                                  <span className="font-mono font-semibold text-gray-900">
                                    {creatorQuoteFee === BigInt(0) ? '0' : creatorQuoteFee.toString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPools(false)}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Hide Pools
                  </button>
                </div>
              )}

              {showPools && pools.length === 0 && !loadingPools && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-semibold">No pools found for your wallet</p>
                </div>
              )}

            <form onSubmit={handleClaimFees} className="space-y-6">
              {/* Pool Address */}
              <div>
                <label htmlFor="pool" className="block text-sm font-bold text-gray-900 mb-2">
                  Pool Address *
                </label>
                <input
                  type="text"
                  id="pool"
                  required
                  value={poolAddress}
                  onChange={(e) => setPoolAddress(e.target.value)}
                  placeholder="Enter pool public key"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <p className="mt-1 text-sm text-gray-500">
                  The address of the pool from which you want to claim fees
                </p>
              </div>

              {/* Connected Wallet Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-semibold mb-1">Connected Wallet</p>
                <p className="text-sm text-blue-800 font-mono">{walletAddress}</p>
                <p className="text-xs text-blue-700 mt-2">
                  This wallet will be used as both the fee claimer and payer
                </p>
              </div>

              {/* Max Amounts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="maxBase" className="block text-sm font-bold text-gray-900 mb-2">
                    Max Base Token Amount (in smallest unit)
                  </label>
                  <input
                    type="text"
                    id="maxBase"
                    value={maxBaseAmount}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      // Limit to reasonable length (18 digits max)
                      if (value.length <= 18) {
                        setMaxBaseAmount(value);
                      }
                    }}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-mono"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter raw token amount (e.g., 1000000000 = 1 token with 9 decimals). Use 0 to skip.
                  </p>
                </div>

                <div>
                  <label htmlFor="maxQuote" className="block text-sm font-bold text-gray-900 mb-2">
                    Max Quote Token Amount (in smallest unit)
                  </label>
                  <input
                    type="text"
                    id="maxQuote"
                    value={maxQuoteAmount}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      // Limit to reasonable length (18 digits max)
                      if (value.length <= 18) {
                        setMaxQuoteAmount(value);
                      }
                    }}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-mono"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter raw token amount (e.g., 1000000000 = 1 token with 9 decimals). Use 0 to skip.
                  </p>
                </div>
              </div>

              {/* Optional Fields */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Optional Parameters
                </h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="receiver" className="block text-sm font-bold text-gray-900 mb-2">
                      Receiver Address (Optional)
                    </label>
                    <input
                      type="text"
                      id="receiver"
                      value={receiverAddress}
                      onChange={(e) => setReceiverAddress(e.target.value)}
                      placeholder="Leave empty to receive in your wallet"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      The wallet that will receive the claimed tokens (defaults to your wallet)
                    </p>
                  </div>

                  <div>
                    <label htmlFor="tempWSol" className="block text-sm font-bold text-gray-900 mb-2">
                      Temporary WSOL Account (Optional)
                    </label>
                    <input
                      type="text"
                      id="tempWSol"
                      value={tempWSolAddress}
                      onChange={(e) => setTempWSolAddress(e.target.value)}
                      placeholder="Only required in specific cases"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Required only if receiver ≠ creator and quote mint is SOL
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white py-4 px-6 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed font-bold text-lg transition-colors border-b-2 border-black disabled:border-gray-500"
              >
                {loading ? 'Processing...' : 'Claim Trading Fees'}
              </button>
            </form>
            </>
          )}

          {/* Results */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-bold mb-1">Error</p>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-bold mb-2">Success!</p>
              <p className="text-green-700 mb-2">{result}</p>
              {txSignature && (
                <div className="mt-3">
                  <p className="text-sm text-green-800 font-semibold mb-1">Transaction Signature:</p>
                  <a
                    href={`https://solscan.io/tx/${txSignature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                  >
                    {txSignature}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Important Notes */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-blue-900 font-bold mb-3 flex items-center gap-2">
              <span>📋</span> Important Notes
            </h3>
            <ul className="list-disc list-inside text-blue-800 space-y-2 text-sm">
              <li>Your wallet must be registered as the <strong>feeClaimer</strong> for the pool</li>
              <li>Set amounts to 0 to skip claiming specific token types</li>
              <li>Transaction fees will be paid from your connected wallet</li>
              <li>The receiver doesn't need to sign the transaction if specified</li>
              <li>Provide tempWSolAcc only if receiver ≠ creator and quote mint is SOL</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
