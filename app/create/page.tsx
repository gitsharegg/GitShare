'use client';

import ImageUpload from '@/components/ImageUpload';
import FormInput from '@/components/FormInput';
import FormTextarea from '@/components/FormTextarea';
import Modal from '@/components/Modal';
import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { useConnection } from '@solana/wallet-adapter-react';
import { prepareCoinCreation } from '@/lib/services/mintService';
import { createCoinOnMeteora } from '@/lib/services/meteoraService';
import { saveCoin } from '@/lib/services/coinService';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { CaretDown, Gear, GithubLogo, MagnifyingGlass, Star } from 'phosphor-react';
import Script from 'next/script';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  private?: boolean;
}

export default function CreateCoin() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { connection } = useConnection();
  const [formData, setFormData] = useState({
    name: '',
    ticker: '',
    description: '',
    initialBuyAmount: '',
    xLink: '',
    websiteLink: '',
    telegramLink: '',
    telegramHandle: '',
    githubUsername: '',
    selectedRepo: '',
    image: null as File | null,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // GitHub state
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [githubError, setGithubError] = useState('');

  const fetchGithubRepos = async (username: string) => {
    if (!username.trim()) {
      setGithubRepos([]);
      return;
    }

    setLoadingRepos(true);
    setGithubError('');
    
    try {
      const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setGithubError('User not found');
        } else {
          setGithubError('Failed to fetch repositories');
        }
        setGithubRepos([]);
        return;
      }
      
      const repos: GitHubRepo[] = await response.json();
      const publicRepos = repos.filter(repo => !repo.private);
      setGithubRepos(publicRepos);
      
      if (publicRepos.length === 0) {
        setGithubError('No public repositories found');
      }
    } catch (error) {
      console.error('Error fetching GitHub repos:', error);
      setGithubError('Failed to fetch repositories');
      setGithubRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.githubUsername) {
        fetchGithubRepos(formData.githubUsername);
      } else {
        setGithubRepos([]);
        setGithubError('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.githubUsername]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'initialBuyAmount') {
      const numValue = parseFloat(value);
      if (value !== '' && (numValue < 0.1 || numValue > 5)) {
        return;
      }
    }
    
    if (name === 'name' && value.length > 32) return;
    if (name === 'ticker' && value.length > 10) return;
    if (name === 'description' && value.length > 100) return;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authenticated) {
      login();
      return;
    }
    
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.image) newErrors.image = 'Please upload an image';
    if (!formData.name.trim()) newErrors.name = 'Please enter a name';
    if (!formData.ticker.trim()) newErrors.ticker = 'Please enter a symbol';
    if (!formData.description.trim()) newErrors.description = 'Please enter a description';
    if (!formData.githubUsername.trim()) newErrors.githubUsername = 'Please enter your GitHub username';
    if (!formData.selectedRepo) newErrors.selectedRepo = 'Please select a repository';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) return;
    
    setShowModal(true);
  };

  const handleFinalSubmit = async () => {
    if (!authenticated || !formData.image) return;

    try {
      setIsCreating(true);
      
      const { mintKeypair, imageUrl, metadataUrl } = await prepareCoinCreation({
        imageFile: formData.image,
        name: formData.name,
        ticker: formData.ticker,
        description: formData.description,
        xLink: formData.xLink,
        websiteLink: formData.websiteLink,
        telegramLink: formData.telegramLink,
      });
      
      if (!wallets || wallets.length === 0) {
        throw new Error('No Solana wallet connected!');
      }
      
      const wallet = wallets[0];
      const walletPublicKey = new PublicKey(wallet.address);
      
      const meteoraResult = await createCoinOnMeteora({
        name: formData.name,
        ticker: formData.ticker,
        description: formData.description,
        imageUrl: metadataUrl,
        initialBuyAmount: formData.initialBuyAmount ? parseFloat(formData.initialBuyAmount) : undefined,
        walletPublicKey: walletPublicKey,
        baseMintKeypair: mintKeypair,
      });

      if (!meteoraResult.success || !meteoraResult.transactions) {
        throw new Error(meteoraResult.error || 'Failed to get Meteora transactions');
      }

      const validTransactions = meteoraResult.transactions.filter((tx) => tx);
      
      console.log('🚀 Signing', validTransactions.length, 'transactions (one at a time, via Privy)');

      const results: { signature: string }[] = [];

      for (let i = 0; i < validTransactions.length; i++) {
        const tx = validTransactions[i];
        console.log(`Signing transaction ${i + 1}/${validTransactions.length}`);

        const serialized = tx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });

        const res = await wallet.signAndSendTransaction!({
          chain: 'solana:mainnet',
          transaction: new Uint8Array(serialized),
        });

        const sigBase58 =
          typeof res.signature === 'string'
            ? res.signature
            : bs58.encode(res.signature);

        await connection.confirmTransaction(sigBase58, 'confirmed');
        results.push({ signature: sigBase58 });

        console.log(`Transaction ${i + 1} confirmed:`, sigBase58);
      }

      console.log('✅ All transactions confirmed!');

      await saveCoin({
        name: formData.name,
        ticker: formData.ticker,
        description: formData.description,
        image: imageUrl,
        initialBuyAmount: formData.initialBuyAmount,
        xLink: formData.xLink,
        websiteLink: formData.websiteLink,
        telegramLink: formData.telegramLink,
        contractAddress: meteoraResult.contractAddress!,
        createdBy: wallet.address,
        ipfsMetadata: metadataUrl,
        verified: false,
        marketCap: 0,
        holders: 0,
        volume24h: 0,
        priceChange24h: 0,
        githubRepo: formData.selectedRepo,
      }, 'active');
      
      window.location.href = `/coin/${meteoraResult.contractAddress}`;

    } catch (error) {
      console.error('❌ Error:', error);
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <main className="mx-auto max-w-lg px-6 py-8">
        <h1 className="text-white text-xl font-bold mb-8">
          Create IPO
        </h1>

        <form onSubmit={handleFormSubmit} noValidate className="space-y-5">
          {/* Image Upload */}
          <div className="flex flex-col items-center">
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handleImageChange(e);
                  if (e.target.files && e.target.files[0]) {
                    setErrors(prev => ({ ...prev, image: '' }));
                  }
                }}
                className="hidden"
              />
              <div className={`w-28 h-28 border-2 border-dashed flex flex-col items-center justify-center transition-colors overflow-hidden`} style={{ backgroundColor: '#1a1a1a', borderColor: errors.image ? '#ef4444' : '#2a2a2a' }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <svg className="w-7 h-7 text-gray-600 mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs font-medium text-gray-500">Image <span className="text-red-500">*</span></p>
                  </div>
                )}
               </div>
            </label>
            {errors.image && (
              <p className="text-xs text-red-400 mt-1">{errors.image}</p>
            )}
          </div>

          {/* Name and Ticker */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={(e) => {
                  handleChange(e);
                  setErrors(prev => ({ ...prev, name: '' }));
                }}
                placeholder="My Website"
                maxLength={32}
                autoComplete="off"
                className="w-full px-4 py-2.5 text-white placeholder-gray-600 placeholder:font-bold focus:outline-none transition-all text-sm"
                style={{ 
                  backgroundColor: '#1a1a1a',
                  border: errors.name ? '1px solid #ef4444' : 'none'
                }}
              />
              {errors.name && (
                <p className="text-xs text-red-400 mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Symbol <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-sm">$</span>
                <input
                  type="text"
                  name="ticker"
                  value={formData.ticker}
                  onChange={(e) => {
                    handleChange(e);
                    setErrors(prev => ({ ...prev, ticker: '' }));
                  }}
                  placeholder="SITE"
                  maxLength={10}
                  autoComplete="off"
                  className="w-full pl-7 pr-4 py-2.5 text-white placeholder-gray-600 placeholder:font-bold focus:outline-none transition-all text-sm"
                  style={{ 
                    backgroundColor: '#1a1a1a',
                    border: errors.ticker ? '1px solid #ef4444' : 'none'
                  }}
                />
              </div>
              {errors.ticker && (
                <p className="text-xs text-red-400 mt-1">{errors.ticker}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) => {
                handleChange(e);
                setErrors(prev => ({ ...prev, description: '' }));
              }}
              placeholder="Describe your website project"
              maxLength={100}
              rows={3}
              className="w-full px-4 py-2.5 text-white placeholder-gray-600 placeholder:font-bold focus:outline-none transition-all resize-none text-sm leading-relaxed"
              style={{ 
                backgroundColor: '#1a1a1a',
                border: errors.description ? '1px solid #ef4444' : 'none'
              }}
            />
            {errors.description && (
              <p className="text-xs text-red-400 mt-1">{errors.description}</p>
            )}
          </div>

          {/* GitHub Username */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              GitHub Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <GithubLogo size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                name="githubUsername"
                value={formData.githubUsername}
                onChange={(e) => {
                  handleChange(e);
                  setErrors(prev => ({ ...prev, githubUsername: '', selectedRepo: '' }));
                  setFormData(prev => ({ ...prev, selectedRepo: '' }));
                }}
                placeholder="username"
                className="w-full pl-10 pr-4 py-2.5 text-white placeholder-gray-600 placeholder:font-bold focus:outline-none transition-all text-sm"
                style={{ 
                  backgroundColor: '#1a1a1a',
                  border: errors.githubUsername ? '1px solid #ef4444' : 'none'
                }}
              />
              {loadingRepos && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                </div>
              )}
            </div>
            {errors.githubUsername && (
              <p className="text-xs text-red-400 mt-1">{errors.githubUsername}</p>
            )}
            {githubError && (
              <p className="text-xs text-red-400 mt-1">{githubError}</p>
            )}
          </div>

          {/* Repository Selection */}
          {githubRepos.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Select Repository <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.selectedRepo}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, selectedRepo: e.target.value }));
                  setErrors(prev => ({ ...prev, selectedRepo: '' }));
                }}
                className="w-full px-4 py-2.5 pr-10 text-white text-sm font-bold focus:outline-none transition-all appearance-none"
                style={{ 
                  backgroundColor: '#1a1a1a',
                  border: errors.selectedRepo ? '1px solid #ef4444' : 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center'
                }}
              >
                <option value="">Select a repository</option>
                {githubRepos.map((repo) => (
                  <option key={repo.id} value={repo.html_url}>
                    {repo.name} {repo.language ? `(${repo.language})` : ''} ⭐ {repo.stargazers_count}
                  </option>
                ))}
              </select>
              {errors.selectedRepo && (
                <p className="text-xs text-red-400 mt-1">{errors.selectedRepo}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Found {githubRepos.length} public {githubRepos.length === 1 ? 'repository' : 'repositories'}
              </p>
            </div>
          )}

          {/* Advanced Options */}
          <button
            type="button"
            onClick={() => setShowOptionalFields(!showOptionalFields)}
            className="w-full text-sm text-gray-400 cursor-pointer flex items-center gap-2 hover:text-gray-300 transition-colors py-1"
          >
            <Gear size={16} weight="bold" />
            <span className="font-bold">Advanced Options</span>
            <span className="text-xs font-normal">(optional)</span>
            <CaretDown 
              size={14} 
              weight="bold"
              className={`ml-auto transition-transform ${showOptionalFields ? 'rotate-180' : ''}`}
            />
          </button>

          {showOptionalFields && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5">X / Twitter</label>
                <input
                  type="url"
                  name="xLink"
                  value={formData.xLink}
                  onChange={handleChange}
                  placeholder="https://x.com/yourproject"
                  className="w-full px-3 py-2 text-white placeholder-gray-600 placeholder:font-bold focus:outline-none text-sm"
                  style={{ backgroundColor: '#1a1a1a' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5">Website</label>
                <input
                  type="url"
                  name="websiteLink"
                  value={formData.websiteLink}
                  onChange={handleChange}
                  placeholder="https://yourproject.com"
                  className="w-full px-3 py-2 text-white placeholder-gray-600 placeholder:font-bold focus:outline-none text-sm"
                  style={{ backgroundColor: '#1a1a1a' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5">Telegram</label>
                <input
                  type="url"
                  name="telegramLink"
                  value={formData.telegramLink}
                  onChange={handleChange}
                  placeholder="https://t.me/yourproject"
                  className="w-full px-3 py-2 text-white placeholder-gray-600 placeholder:font-bold focus:outline-none text-sm"
                  style={{ backgroundColor: '#1a1a1a' }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 text-white font-bold transition-all hover:opacity-90 cursor-pointer text-sm mt-6"
            style={{ backgroundColor: '#f97316' }}
          >
            {authenticated ? 'Create IPO' : 'Sign In to Create IPO'}
          </button>
        </form>

        <Modal 
          isOpen={showModal} 
          onClose={() => !isCreating && setShowModal(false)}
          onSubmit={handleFinalSubmit}
          ticker={formData.ticker}
          isCreating={isCreating}
        >
          {isCreating ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <>
              <div className="relative">
                <input
                  type="number"
                  name="initialBuyAmount"
                  value={formData.initialBuyAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0.1"
                  max="5"
                  step="0.1"
                  autoComplete="off"
                  className="w-full px-3 py-2 pr-12 text-gray-900 font-semibold placeholder-gray-500 focus:outline-none border-0 text-sm"
                  style={{ backgroundColor: '#ffffff' }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 font-semibold text-sm">
                  SOL
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Tip: Buying a small amount helps protect your IPO from snipers
              </p>
            </>
          )}
        </Modal>
      </main>
    </div>
  );
}
