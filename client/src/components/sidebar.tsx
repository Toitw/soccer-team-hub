import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { Team } from "@shared/schema";

// Export the Sidebar component as both named and default export
function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isMobile = useMobile();

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json() as Promise<Team[]>;
    }
  });

  if (isMobile) return null;

  return (
    <div className="w-64 bg-primary text-white h-screen fixed">
      <div className="p-4 flex items-center space-x-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        <span className="text-xl font-bold">Team Manager</span>
      </div>

      <nav className="mt-6">
        <ul>
          <li>
            <Link href="/">
              <a className={`flex items-center px-4 py-2 ${location === "/" ? "bg-primary-dark" : "hover:bg-primary-dark"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                Dashboard
              </a>
            </Link>
          </li>
          <li>
            <Link href="/team">
              <a className={`flex items-center px-4 py-2 ${location === "/team" ? "bg-primary-dark" : "hover:bg-primary-dark"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Team
              </a>
            </Link>
          </li>
          <li>
            <Link href="/lineup">
              <a className={`flex items-center px-4 py-2 ${location === "/lineup" ? "bg-primary-dark" : "hover:bg-primary-dark"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                Lineup
              </a>
            </Link>
          </li>
          <li>
            <Link href="/statistics">
              <a className={`flex items-center px-4 py-2 ${location === "/statistics" ? "bg-primary-dark" : "hover:bg-primary-dark"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                Statistics
              </a>
            </Link>
          </li>
        </ul>
      </nav>

      {user && (
        <div className="absolute bottom-0 w-full p-4 border-t border-primary-dark">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-800 font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium">{user.username}</div>
              <div className="text-xs text-gray-300">{user.email}</div>
            </div>
          </div>
          <Button 
            variant="outline"
            className="w-full justify-start" 
            onClick={() => logoutMutation.mutate()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign Out
          </Button>
        </div>
      )}
    </div>
  );
}

// Export both as named and default export
export { Sidebar };
export default Sidebar;