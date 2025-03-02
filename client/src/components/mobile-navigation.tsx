import { Link, useLocation } from "wouter";
import { useMobile } from "@/hooks/use-mobile";

export default function MobileNavigation() {
  const [location] = useLocation();
  const isMobile = useMobile();

  if (!isMobile) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] p-2 z-50">
      <div className="flex justify-around">
        <div 
          onClick={() => window.location.href = '/'}
          className={`flex flex-col items-center py-1 cursor-pointer ${location === '/' ? 'text-primary' : 'text-gray-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span className="text-xs mt-1">Dashboard</span>
        </div>
        <div 
          onClick={() => window.location.href = '/team'}
          className={`flex flex-col items-center py-1 cursor-pointer ${location === '/team' ? 'text-primary' : 'text-gray-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span className="text-xs mt-1">Team</span>
        </div>
        <div 
          onClick={() => window.location.href = '/matches'}
          className={`flex flex-col items-center py-1 cursor-pointer ${location === '/matches' ? 'text-primary' : 'text-gray-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18.5 4l2 6h-13l2-6"></path>
            <path d="M3 10h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z"></path>
            <path d="M6 14v4"></path>
            <path d="M12 14v4"></path>
            <path d="M18 14v4"></path>
          </svg>
          <span className="text-xs mt-1">Matches</span>
        </div>
        <div 
          onClick={() => window.location.href = '/more'}
          className={`flex flex-col items-center py-1 cursor-pointer ${location === '/more' ? 'text-primary' : 'text-gray-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
          <span className="text-xs mt-1">More</span>
        </div>
      </div>
    </div>
  );
}
