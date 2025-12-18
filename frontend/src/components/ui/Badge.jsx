const variants = {
  high: 'border-red-600 bg-red-100 text-red-600',
  medium: 'border-orange-500 bg-orange-100 text-orange-500',
  low: 'border-green-600 bg-green-100 text-green-600',
  admin: 'border-red-600 bg-red-100 text-red-600',
  default: 'border-gray-500 bg-gray-100 text-gray-600',
};

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span
      className={`inline-block px-3 py-1 border-2 rounded-md text-xs font-bold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
