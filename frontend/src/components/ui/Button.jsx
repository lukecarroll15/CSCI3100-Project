const variants = {
  primary: 'bg-gray-800 text-white border-gray-800 hover:bg-gray-700',
  secondary: 'bg-white text-gray-800 border-gray-800 hover:bg-gray-100',
  outline: 'bg-white text-gray-600 border-gray-500 hover:bg-gray-100',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg',
};

export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}) {
  return (
    <button
      className={`border-2 rounded-lg font-bold cursor-pointer transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
