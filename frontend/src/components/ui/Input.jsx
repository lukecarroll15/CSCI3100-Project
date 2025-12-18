export default function Input({
  label,
  className = '',
  ...props
}) {
  return (
    <div className="mb-5 text-left">
      {label && (
        <label className="block mb-2 text-sm border-2 border-gray-500 rounded-md px-3 py-1.5 bg-gray-50">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-3 border-2 border-gray-800 rounded-md text-sm bg-white focus:outline-none focus:border-gray-600 ${className}`}
        {...props}
      />
    </div>
  );
}
