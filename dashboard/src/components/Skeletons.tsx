export function DashboardSkeleton() {
  return (
    <div className="flex-1 p-8 bg-gray-50/50 min-h-screen overflow-y-auto animate-pulse">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 h-32">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 p-8 h-96">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-full bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function InboxSkeleton() {
  return (
    <div className="flex h-full bg-white font-sans w-full animate-pulse">
      <div className="w-[320px] flex-shrink-0 border-r border-gray-200 flex flex-col">
        <div className="h-16 border-b border-gray-200 p-4">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="h-14 border-b border-gray-200 bg-white"></div>
        <div className="flex-1 p-4 space-y-4">
           <div className="h-10 bg-gray-200 rounded-2xl w-1/3 ml-auto"></div>
           <div className="h-10 bg-gray-200 rounded-2xl w-1/2"></div>
        </div>
      </div>
    </div>
  );
}
