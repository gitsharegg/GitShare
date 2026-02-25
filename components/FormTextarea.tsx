'use client';

interface FormTextareaProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  required?: boolean;
  rows?: number;
}

export default function FormTextarea({ 
  name, 
  value, 
  onChange, 
  placeholder, 
  required = false,
  rows = 4
}: FormTextareaProps) {
  return (
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      rows={rows}
      autoComplete="off"
      className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 font-semibold placeholder-gray-400 focus:outline-none resize-none border border-gray-200"
      placeholder={placeholder}
    />
  );
}
