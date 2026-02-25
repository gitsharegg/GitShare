import { CopySimple } from 'phosphor-react';

interface CoinFeesProps {
  createdBy?: string;
}

export default function CoinFees({ createdBy }: CoinFeesProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3">Fees earned</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Total Fees</span>
          <span className="text-sm font-semibold text-white">$0</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Creator</span>
          <button
            onClick={() => createdBy && navigator.clipboard.writeText(createdBy)}
            className="text-xs font-mono text-gray-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            title="Click to copy creator address"
          >
            {createdBy?.slice(0, 4)}...{createdBy?.slice(-4)}
            <CopySimple size={12} weight="regular" />
          </button>
        </div>
      </div>
    </div>
  );
}
