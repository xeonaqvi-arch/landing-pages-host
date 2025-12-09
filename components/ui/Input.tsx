import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
      {label}
    </label>
    <input
      className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none ${className}`}
      {...props}
    />
  </div>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
      {label}
    </label>
    <textarea
      className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none min-h-[80px] resize-y ${className}`}
      {...props}
    />
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
      {label}
    </label>
    <div className="relative">
      <select
        className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 appearance-none transition-all outline-none ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);