export default function TopBar({ userName = 'John Smith', companyName = 'Company Name', onLogout }) {
  return (
    <header className="h-[70px] bg-white border-b-2 border-gray-800 flex items-center px-8">
      {/* User Section */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 border-2 border-gray-800 rounded-full flex items-center justify-center text-xs bg-gray-100">
          👤
        </div>
        <div className="text-base border-2 border-gray-500 px-4 py-2 rounded-md bg-gray-50">
          {userName}
        </div>
      </div>

      {/* Company Branding */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center">
        <div className="text-2xl font-bold border-2 border-gray-800 px-5 py-1 rounded-md mb-1">
          {companyName}
        </div>
        <div className="text-xs text-gray-500 border border-gray-400 px-3 py-1 rounded bg-gray-50">
          by SecureVault
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="ml-auto text-base border-2 border-gray-800 px-5 py-2 rounded-md bg-white hover:bg-gray-100 transition-colors cursor-pointer"
      >
        Logout
      </button>
    </header>
  );
}
