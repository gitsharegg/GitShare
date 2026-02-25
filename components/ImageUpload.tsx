'use client';

interface ImageUploadProps {
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ImageUpload({ imagePreview, onImageChange }: ImageUploadProps) {
  return (
    <div className="flex justify-center mb-8">
      <label htmlFor="image" className="cursor-pointer group">
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden transition-all bg-white border border-gray-200"
        >
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-gray-500 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </div>
        <input
          type="file"
          id="image"
          name="image"
          accept="image/*"
          onChange={onImageChange}
          className="hidden"
          required
        />
      </label>
    </div>
  );
}
