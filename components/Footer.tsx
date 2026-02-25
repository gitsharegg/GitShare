'use client';

export default function Footer() {
  return (
    <footer className="w-full py-2 fixed bottom-0 left-0 right-0 z-40" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="px-6">
        <div className="flex items-center justify-center relative">
          {/* Centered - Copyright */}
          <div className="text-xs text-gray-400">
            © {new Date().getFullYear()} GitShare. All rights reserved.
          </div>
          
          {/* Right - Social Links (absolute positioning) */}
          <div className="absolute right-0 flex items-center gap-4">
            <a
              href="https://x.com/gitsharegg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Follow us on X"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
