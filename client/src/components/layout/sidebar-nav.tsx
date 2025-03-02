
import { useLocation } from 'react-router-dom';

export function SidebarNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <div className="flex flex-col space-y-2 text-white/80">
      <div 
        onClick={() => window.location.href = '/dashboard'}
        className={`flex items-center space-x-3 px-4 py-3 cursor-pointer ${pathname === '/dashboard' ? 'bg-white/10' : 'hover:bg-white/10'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
        <span>Dashboard</span>
      </div>
      <div 
        onClick={() => window.location.href = '/team'}
        className={`flex items-center space-x-3 px-4 py-3 cursor-pointer ${pathname === '/team' ? 'bg-white/10' : 'hover:bg-white/10'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <span>Team</span>
      </div>
      <div 
        onClick={() => window.location.href = '/lineup'}
        className={`flex items-center space-x-3 px-4 py-3 cursor-pointer ${pathname === '/lineup' ? 'bg-white/10' : 'hover:bg-white/10'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="12 6, 12 18, 12 12, 6 12, 18 12" fill="none" />
          <circle cx="12" cy="12" r="2" />
        </svg>
        <span>Lineup</span>
      </div>
      <div 
        onClick={() => window.location.href = '/statistics'}
        className={`flex items-center space-x-3 px-4 py-3 cursor-pointer ${pathname === '/statistics' ? 'bg-white/10' : 'hover:bg-white/10'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        <span>Statistics</span>
      </div>
      <div 
        onClick={() => window.location.href = '/announcements'}
        className={`flex items-center space-x-3 px-4 py-3 cursor-pointer ${pathname === '/announcements' ? 'bg-white/10' : 'hover:bg-white/10'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Announcements</span>
      </div>
    </div>
  );
}
