export default function TopBar({
  userName = 'John Smith',
  companyName = 'Company Name',
  onLogout,
}) {
  return (
    <header className="flex h-[70px] items-center border-b-2 border-gray-800 bg-white px-8">
      {/* User Section */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-800 bg-gray-100 text-xs">
          👤
        </div>
        <div className="rounded-md border-2 border-gray-500 bg-gray-50 px-4 py-2 text-base">
          {userName}
        </div>
      </div>

      {/* Company Branding */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center">
        <div className="mb-1 rounded-md border-2 border-gray-800 px-5 py-1 text-2xl font-bold">
          {companyName}
        </div>
        <div className="rounded border border-gray-400 bg-gray-50 px-3 py-1 text-xs text-gray-500">
          by SecureVault
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="ml-auto cursor-pointer rounded-md border-2 border-gray-800 bg-white px-5 py-2 text-base transition-colors hover:bg-gray-100"
      >
        Logout
      </button>
    </header>
  );
}
