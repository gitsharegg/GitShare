interface CoinChartProps {
  address: string;
}

export default function CoinChart({ address }: CoinChartProps) {
  return (
    <div className="w-full overflow-hidden rounded-lg" style={{ height: '400px' }}>
      <iframe
        src={`https://birdeye.so/tv-widget/${address}?chain=solana&theme=dark`}
        className="w-full rounded-lg"
        style={{ height: 'calc(100% + 30px)', marginBottom: '-30px' }}
        frameBorder="0"
        allowFullScreen
      />
    </div>
  );
}
