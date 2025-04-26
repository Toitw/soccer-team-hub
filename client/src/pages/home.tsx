import { useQuery } from "@tanstack/react-query";
import { StatusReport } from "@/components/StatusReport";
import { fetchApplicationStatus } from "@/lib/statusAnalyzer";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: status, isLoading, error } = useQuery({
    queryKey: ['/api/diagnostics'],
    queryFn: fetchApplicationStatus
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-16 w-full mb-8" />
          <Skeleton className="h-64 w-full mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <Skeleton className="h-64 w-full mt-8" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow p-8 max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error Loading Status Report</h1>
          <p className="text-gray-700">
            There was a problem loading the application status. This could indicate critical issues with the server or networking.
          </p>
          <p className="text-gray-500 mt-4">
            Error details: {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <button
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return status ? <StatusReport status={status} /> : null;
}
