'use client';

interface FormInputProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
}

export default function FormInput({ 
  name, 
  value, 
  onChange, 
  placeholder, 
  required = false,
  type = 'text',
  min,
  max,
  step
}: FormInputProps) {
  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      min={min}
      max={max}
      step={step}
      autoComplete="off"
      className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 font-semibold placeholder-gray-400 focus:outline-none border border-gray-200"
      placeholder={placeholder}
    />
  );
}
