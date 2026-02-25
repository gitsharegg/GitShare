'use client';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
  ticker?: string;
  isCreating?: boolean;
}

export default function Modal({ isOpen, onClose, onSubmit, children, ticker, isCreating }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - blurred */}
      <div 
        className="absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative z-10 w-full max-w-xs mx-4 p-5 shadow-xl"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        {/* Close button - disabled during creation */}
        {!isCreating && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <h2 className="text-base font-bold text-white mb-1">
          Do you want to prebuy {ticker || 'coin'}?
        </h2>
        <p className="text-xs text-gray-400 mb-4">Leave blank if you don't want to buy supply</p>
        
        <div className="mb-4">
          {children}
        </div>
        
        <button
          type="button"
          onClick={onSubmit}
          disabled={isCreating}
          className="w-full px-4 py-2 text-white font-semibold transition-colors text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#3b82f6' }}
        >
          {isCreating ? 'Creating...' : 'Create Coin'}
        </button>
      </div>
    </div>
  );
}
