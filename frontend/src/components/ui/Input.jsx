export default function Input({ label, className = '', ...props }) {
  return (
    <div className="mb-5 text-left">
      {label && (
        <label className="mb-2 block rounded-md border-2 border-gray-500 bg-gray-50 px-3 py-1.5 text-sm">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-md border-2 border-gray-800 bg-white px-3 py-3 text-sm focus:border-gray-600 focus:outline-none ${className}`}
        {...props}
      />
    </div>
  );
}
