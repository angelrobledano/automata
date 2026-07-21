export function DashboardSkeleton() {
  return (
    <div className="flex-1 p-8 bg-background/50 min-h-screen overflow-y-auto animate-pulse">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card p-6 rounded-lg border border-gray-100 h-32">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
        <div className="bg-card rounded-lg border border-gray-100 p-8 h-96">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-full bg-card rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function InboxSkeleton() {
  return (
    <div className="flex h-full bg-card font-sans w-full animate-pulse">
      <div className="w-[320px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="h-16 border-b border-border p-4">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-card rounded-lg"></div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-background">
        <div className="h-14 border-b border-border bg-card"></div>
        <div className="flex-1 p-4 space-y-4">
           <div className="h-10 bg-gray-200 rounded-lg w-1/3 ml-auto"></div>
           <div className="h-10 bg-gray-200 rounded-lg w-1/2"></div>
        </div>
      </div>
    </div>
  );
}
