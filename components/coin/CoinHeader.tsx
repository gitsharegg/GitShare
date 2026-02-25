import { TelegramLogo, Globe, CopySimple } from 'phosphor-react';

interface CoinHeaderProps {
  image: string;
  name: string;
  ticker: string;
  xLink?: string;
  telegramLink?: string;
  websiteLink?: string;
  contractAddress?: string;
}

export default function CoinHeader({ 
  image, 
  name, 
  ticker, 
  xLink, 
  telegramLink, 
  websiteLink, 
  contractAddress 
}: CoinHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <img
        src={image}
        alt={name}
        className="w-16 h-16 rounded-lg object-cover"
      />
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-white">{ticker}</h1>
        <span className="text-sm text-gray-400">{name}</span>
      </div>
      {/* Social Links */}
      <div className="flex gap-2">
        {xLink && (
          <button
            onClick={() => window.open(xLink, '_blank')}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
        )}
        {telegramLink && (
          <button
            onClick={() => window.open(telegramLink, '_blank')}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <TelegramLogo size={16} weight="regular" className="text-white" />
          </button>
        )}
        {websiteLink && (
          <button
            onClick={() => window.open(websiteLink, '_blank')}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          >
            <Globe size={16} weight="regular" className="text-white" />
          </button>
        )}
        <button
          onClick={() => contractAddress && navigator.clipboard.writeText(contractAddress)}
          className="p-2 rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <CopySimple size={16} weight="regular" className="text-white" />
        </button>
      </div>
    </div>
  );
}
