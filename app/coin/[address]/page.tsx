'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCoinByAddress } from '@/lib/services/coinService';
import { Coin } from '@/types/coin';
import CoinHeader from '@/components/coin/CoinHeader';
import CoinStats from '@/components/coin/CoinStats';
import CoinChart from '@/components/coin/CoinChart';
import CoinDescription from '@/components/coin/CoinDescription';
import { GithubLogo, Star, GitCommit, Rocket, CopySimple } from 'phosphor-react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { getPoolsFeesByCreator } from '@/lib/services/meteoraService';

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
}

export default function CoinPage() {
  const params = useParams();
  const address = params.address as string;
  const { user, authenticated } = usePrivy();
  const [coin, setCoin] = useState<Coin | null>(null);
  const [loading, setLoading] = useState(true);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [repoInfo, setRepoInfo] = useState<GitHubRepo | null>(null);
  const [totalFees, setTotalFees] = useState(0);
  const [loadingFees, setLoadingFees] = useState(false);
  const [claimingFees, setClaimingFees] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [poolAddress, setPoolAddress] = useState<string | null>(null);

  const {wallets} = useWallets();
  const userWalletAddress = user?.wallet?.address;
  const isCreator = coin?.createdBy && userWalletAddress && coin.createdBy.toLowerCase() === userWalletAddress.toLowerCase();

  const handleClaimFees = async () => {
    if (!authenticated || !userWalletAddress) {
      setClaimError('Please connect your wallet first');
      return;
    }

    if (!isCreator) {
      setClaimError('You are not authorized to claim fees. Only the project creator can claim the prize pool.');
      return;
    }

    if (!poolAddress) {
      setClaimError('No pool found for this project');
      return;
    }

    setClaimingFees(true);
    setClaimError(null);
    setClaimSuccess(null);

    try {
      const response = await fetch('/api/claim-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pool: poolAddress,
          feeClaimer: userWalletAddress,
          payer: userWalletAddress,
          maxBaseAmount: '0',
          maxQuoteAmount: '0',
          receiver: null,
          tempWSolAcc: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim fees');
      }

      if (!data.transaction) {
        throw new Error('No transaction returned from API');
      }

      if (!wallets || wallets.length === 0) {
        throw new Error('No Solana wallet connected!');
      }

      const wallet = wallets[0];
      const txBuffer = Buffer.from(data.transaction, 'base64');
      const transaction = Transaction.from(txBuffer);

      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
        'confirmed'
      );

      const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      const res = await wallet.signAndSendTransaction!({
        chain: 'solana:mainnet',
        transaction: new Uint8Array(serialized),
      });

      const sigBase58 = typeof res.signature === 'string' ? res.signature : bs58.encode(res.signature);

      await connection.confirmTransaction(sigBase58, 'confirmed');
      
      setClaimSuccess(`Fees claimed successfully! TX: ${sigBase58.slice(0, 8)}...`);
      // Reload fees after claiming
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setClaimingFees(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const coinData = await getCoinByAddress(address);
        setCoin(coinData);

        // Fetch fees if creator exists
        if (coinData?.createdBy) {
          setLoadingFees(true);
          try {
            const creatorPubkey = new PublicKey(coinData.createdBy);
            const feesData = await getPoolsFeesByCreator(creatorPubkey);
            
            // Platform gets 100% of fees as partnerQuoteFee
            const totalQuoteFees = feesData.reduce((sum: number, fee: any) => {
              return sum + (fee.partnerQuoteFee?.toNumber() || 0);
            }, 0);
            
            // Save pool address for claiming
            if (feesData.length > 0) {
              setPoolAddress(feesData[0].poolAddress.toString());
            }
            
            // Convert lamports to SOL (1 SOL = 1e9 lamports)
            // Then multiply by SOL price (approximate $150 for now)
            const feesInSol = totalQuoteFees / 1e9;
            const feesInUsd = feesInSol * 150; // Replace with actual SOL price
            setTotalFees(feesInUsd);
          } catch (error) {
            console.error('Error fetching fees:', error);
          } finally {
            setLoadingFees(false);
          }
        }

        // Fetch GitHub data if repo exists
        if (coinData?.githubRepo) {
          try {
            const urlParts = coinData.githubRepo.replace('https://github.com/', '').split('/');
            if (urlParts.length >= 2) {
              const owner = urlParts[0];
              const repo = urlParts[1];

              const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
              if (repoResponse.ok) {
                const repoData = await repoResponse.json();
                setRepoInfo(repoData);
              }

              const commitsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`);
              if (commitsResponse.ok) {
                const commitsData = await commitsResponse.json();
                setCommits(commitsData);
              }
            }
          } catch (error) {
            console.error('Error fetching GitHub data:', error);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [address]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center text-white">Loading...</div>
        </main>
      </div>
    );
  }

  if (!coin) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center text-white">Coin not found</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <CoinHeader
            image={coin.image}
            name={coin.name}
            ticker={coin.ticker}
            xLink={coin.xLink}
            telegramLink={coin.telegramLink}
            websiteLink={coin.websiteLink}
            contractAddress={coin.contractAddress}
          />
        </div>

        {repoInfo && (
          <div className="mb-6 p-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GithubLogo size={20} weight="fill" className="text-white" />
                <a 
                  href={repoInfo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-white hover:text-blue-400 transition-colors"
                >
                  {repoInfo.full_name}
                </a>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Star size={14} weight="fill" className="text-yellow-500" />
                  <span>{repoInfo.stargazers_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/>
                  </svg>
                  <span>{repoInfo.forks_count}</span>
                </div>
              </div>
            </div>
            {repoInfo.description && (
              <p className="text-xs text-gray-400 mb-3">{repoInfo.description}</p>
            )}
            <div className="flex gap-2">
              <a
                href={`https://railway.app/new/template?code=${encodeURIComponent(repoInfo.html_url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs font-bold text-white cursor-pointer transition-opacity hover:opacity-90 flex items-center gap-2"
                style={{ backgroundColor: '#f97316' }}
              >
                <Rocket size={14} weight="fill" />
                Deploy to Railway
              </a>
              <a
                href={repoInfo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs font-bold text-gray-300 cursor-pointer transition-colors hover:text-white flex items-center gap-2"
                style={{ backgroundColor: '#2a2a2a' }}
              >
                <GithubLogo size={14} weight="fill" />
                View Repository
              </a>
            </div>
          </div>
        )}

        <div className="mb-6">
          <CoinStats
            marketCap={coin.marketCap || 0}
            volume24h={coin.volume24h || 0}
            holders={coin.holders || 0}
            priceChange24h={coin.priceChange24h || 0}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CoinChart address={address} />
            <CoinDescription description={coin.description} />
          </div>

          <div className="lg:col-span-1 space-y-6">
            {/* Treasury Section */}
            <div className="p-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <h3 className="text-sm font-bold text-white mb-4">Contribute & Earn</h3>
              <p className="text-xs text-gray-400 mb-4">
                Make commits to earn from the 100% fee pool allocated to contributors.
              </p>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Prize Pool</span>
                  <span className="text-sm font-bold text-green-400">
                    {loadingFees ? '...' : `$${totalFees.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Treasury</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(process.env.NEXT_PUBLIC_PLATFORM_WALLET || '')}
                    className="text-xs font-mono text-gray-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {process.env.NEXT_PUBLIC_PLATFORM_WALLET?.slice(0, 4)}...{process.env.NEXT_PUBLIC_PLATFORM_WALLET?.slice(-4)}
                    <CopySimple size={12} weight="regular" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Creator</span>
                  <button
                    onClick={() => coin.createdBy && navigator.clipboard.writeText(coin.createdBy)}
                    className="text-xs font-mono text-gray-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {coin.createdBy?.slice(0, 4)}...{coin.createdBy?.slice(-4)}
                    <CopySimple size={12} weight="regular" />
                  </button>
                </div>
              </div>

              {claimError && (
                <div className="mb-3 p-2 rounded" style={{ backgroundColor: '#2a0a0a', border: '1px solid #ef4444' }}>
                  <p className="text-xs text-red-400">{claimError}</p>
                </div>
              )}

              {claimSuccess && (
                <div className="mb-3 p-2 rounded" style={{ backgroundColor: '#0a2a0a', border: '1px solid #10b981' }}>
                  <p className="text-xs text-green-400">{claimSuccess}</p>
                </div>
              )}

              <div className="flex gap-2">
                <a
                  href={coin.githubRepo || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 text-xs font-bold text-center cursor-pointer transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#f97316', color: '#fff' }}
                >
                  View Commits
                </a>
                <button
                  onClick={handleClaimFees}
                  disabled={claimingFees || totalFees === 0}
                  className="flex-1 px-3 py-2 text-xs font-bold text-center cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#f97316', color: '#fff' }}
                >
                  {claimingFees ? 'Claiming...' : 'Claim Prize Pool'}
                </button>
              </div>
            </div>

            {/* Recent Commits */}
            <div className="p-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <div className="flex items-center gap-2 mb-4">
                <GitCommit size={16} className="text-gray-400" />
                <span className="text-sm text-white">{commits.length} recent commits</span>
              </div>

              {commits.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400 mb-2">No recent commits found.</p>
                  <p className="text-xs text-gray-500">Start contributing to this repo to earn rewards.</p>
                </div>
              ) : (
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-white mb-2">Recent Commits</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {commits.map((commit) => (
                      <a
                        key={commit.sha}
                        href={commit.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 hover:bg-white/5 transition-colors cursor-pointer"
                        style={{ backgroundColor: '#0a0a0a' }}
                      >
                        <div className="flex items-start gap-2">
                          <GitCommit size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate mb-1">
                              {commit.commit.message.split('\n')[0]}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{commit.commit.author.name}</span>
                              <span>•</span>
                              <span>{new Date(commit.commit.author.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <a
                href={coin.githubRepo || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <GithubLogo size={14} weight="fill" />
                View All Commits
              </a>
            </div>

            {/* Fee Distribution */}
            <div className="p-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <h3 className="text-sm font-bold text-white mb-3">Fee Distribution</h3>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-400">Contributor Rewards</span>
                    <span className="text-xs font-bold text-orange-400">100%</span>
                  </div>
                  <div className="w-full h-2" style={{ backgroundColor: '#2a2a2a' }}>
                    <div className="h-full" style={{ width: '100%', backgroundColor: '#f97316' }}></div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-3">
                All trading fees go directly to contributors who make commits.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
