'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { SignOut, UserCircle } from 'phosphor-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

export default function Navbar() {
  const pathname = usePathname();
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(0);
  
  const walletAddress = user?.wallet?.address;
  
  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  useEffect(() => {
    if (!walletAddress) return;
    
    const fetchBalance = async () => {
      try {
        const pubkey = new PublicKey(walletAddress);
        const lamports = await connection.getBalance(pubkey);
        setBalance(lamports / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance(null);
      }
    };
    
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [walletAddress]);
  
  return (
    <nav className="w-full border-b sticky top-0 z-50" style={{ backgroundColor: '#0a0a0a', borderColor: '#1f1f1f' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex h-14 items-center justify-between">
          {/* Left - Logo and Nav Links */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center">
              <img src="/GITSHARE.png" alt="GitShare" className="h-8" />
            </Link>
            <Link
              href="/"
              className={`text-xs font-semibold uppercase tracking-wide transition-colors antialiased ${
                pathname === '/' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              DISCOVER
            </Link>
            <Link
              href="/create"
              className={`text-xs font-semibold uppercase tracking-wide transition-colors antialiased ${
                pathname === '/create' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              CREATE
            </Link>
          </div>

          {/* Right Side - Auth */}
          <div className="flex items-center gap-4">
            {!ready ? (
              <div className="w-20 h-8 bg-gray-800 rounded animate-pulse"></div>
            ) : authenticated ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="px-3 py-1 font-bold text-xs cursor-pointer transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#f97316', color: '#fff' }}
                >
                  {walletAddress && shortenAddress(walletAddress)}
                </button>
                
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 overflow-hidden shadow-xl z-50" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                    <div className="px-3 py-2 border-b" style={{ borderColor: '#2a2a2a' }}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <img src="/solana-sol-logo-png_seeklogo-423095.png" alt="SOL" className="w-3 h-3" />
                        <p className="text-xs font-bold text-white">{`${(balance || 0).toFixed(2)} SOL`}</p>
                      </div>
                      <p className="text-xs text-gray-400">{walletAddress && shortenAddress(walletAddress)}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="px-3 py-2 flex items-center gap-1.5 cursor-pointer transition-colors hover:bg-white/5 border-b"
                      style={{ borderColor: '#2a2a2a' }}
                    >
                      <UserCircle size={14} weight="regular" className="text-gray-400" />
                      <p className="text-xs font-semibold text-white">Profile</p>
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-1.5 px-3 py-2 text-left text-xs font-bold text-red-400 cursor-pointer transition-colors hover:bg-white/5"
                    >
                      <SignOut size={14} weight="regular" />
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={login}
                className="px-5 py-1.5 font-bold text-sm cursor-pointer transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#f97316', color: '#fff' }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
