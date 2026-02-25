'use client';

import "./globals.css";
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

function WalletAdapter({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(() => [], []);
  const endpoint = useMemo(() => process.env.NEXT_PUBLIC_SOLANA_RPC || '', []);
  
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>GitShare</title>
        <meta name="description" content="The stock market for the indie web" />
        <link rel="icon" href="/GITSHARE.png" />
        <meta property="og:title" content="GitShare" />
        <meta property="og:description" content="The stock market for the indie web" />
        <meta property="og:image" content="/GITSHARE.png" />
      </head>
      <body className="antialiased">
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
          config={{
            appearance: {
              walletChainType: 'solana-only',
              walletList: ['phantom']
            },
            externalWallets: {
              solana: {
                connectors: toSolanaWalletConnectors({
                  shouldAutoConnect: true,
                }),
              },
            },
          }}
        >
          <WalletAdapter>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <div className="flex-1">
                {children}
              </div>
              <Footer />
            </div>
          </WalletAdapter>
        </PrivyProvider>
      </body>
    </html>
  );
}
