import dynamic from 'next/dynamic';

const DynamicLiveMap = dynamic(() => import('./LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-8 w-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4"></div>
        <p className="text-sm font-medium text-slate-500">Loading Map...</p>
      </div>
    </div>
  )
});

export default DynamicLiveMap;
