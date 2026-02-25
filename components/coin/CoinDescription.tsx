interface CoinDescriptionProps {
  description: string;
}

export default function CoinDescription({ description }: CoinDescriptionProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
      <p className="text-sm text-gray-400 leading-relaxed break-words">
        {description}
      </p>
    </div>
  );
}
