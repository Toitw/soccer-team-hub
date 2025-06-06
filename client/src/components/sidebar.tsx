import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { Team } from "@shared/schema";
import LanguageSelector from "./language-selector";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { t } = useLanguage();
  const isMobile = useMobile();

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  if (isMobile) return null;

  return (
    <div className="w-64 bg-primary text-white h-screen fixed left-0 top-0 z-40">
      <div className="p-4 flex items-center space-x-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
        <h1 className="text-xl font-semibold">Cancha +</h1>
      </div>

      <div className="mt-8">
        <div className="px-4 mb-8">
          <div className="flex items-center space-x-3 mb-3">
            <img 
              src={user?.profilePicture || "https://ui-avatars.com/api/?name=User&background=0D47A1&color=fff"} 
              alt="User profile" 
              className="w-10 h-10 rounded-full" 
            />
            <div>
              <p className="text-sm font-medium">{user?.fullName || "User"}</p>
              <p className="text-xs opacity-70">{user?.role || "Role"}</p>
            </div>
          </div>
          {/* Button hidden for now - future development
          <Button variant="outline" className="mt-2 w-full py-1.5 px-3 text-sm bg-white/10 text-white border-white/20 hover:bg-white/20">
            {t("common.switchTeam")}
          </Button>
          */}
        </div>

        <nav>
          <Link href="/">
            <div className={`flex items-center space-x-3 px-4 py-3 cursor-pointer ${location === '/' ? 'bg-white/10' : 'hover:bg-white/10'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>{t("navigation.dashboard")}</span>
            </div>
          </Link>
          <Link href="/team">
            <div className={`flex items-center space-x-3 px-4 py-3 cursor-pointer ${location === '/team' ? 'bg-white/10' : 'hover:bg-white/10'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>{t("navigation.team")}</span>
            </div>
          </Link>
          <Link href="/matches">
            <div className={`flex items-center space-x-3 px-4 py-3 cursor-pointer ${location === '/matches' ? 'bg-white/10' : 'hover:bg-white/10'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9V4c0-1 1-2 2-2h8c1 0 2 1 2 2v5" />
                <path d="M18 9a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3M6 9a3 3 0 0 0-3 3v1a3 3 0 0 0 3 3" />
                <path d="M12 12h0.01" />
                <path d="M12 16c2.2 0 4-1.8 4-4H8c0 2.2 1.8 4 4 4Z" />
                <path d="M15 19v3H9v-3" />
                <path d="M8 22h8" />
              </svg>
              <span>{t("navigation.matches")}</span>
            </div>
          </Link>
          <Link href="/events">
            <div className={`flex items-center space-x-3 px-4 py-3 cursor-pointer ${location === '/events' ? 'bg-white/10' : 'hover:bg-white/10'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                <line x1="4" y1="22" x2="4" y2="15"></line>
              </svg>
              <span>{t("navigation.events")}</span>
            </div>
          </Link>
          <Link href="/statistics">
            <div className={`flex items-center space-x-3 px-4 py-3 cursor-pointer ${location === '/statistics' ? 'bg-white/10' : 'hover:bg-white/10'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span>{t("navigation.statistics")}</span>
            </div>
          </Link>
          <Link href="/announcements">
            <div className={`flex items-center space-x-3 px-4 py-3 cursor-pointer ${location === '/announcements' ? 'bg-white/10' : 'hover:bg-white/10'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>{t("navigation.announcements")}</span>
            </div>
          </Link>
          {/* Admin and coach users can access settings */}
          {(user?.role === "admin" || user?.role === "coach") && (
            <Link href="/settings">
              <div className={`flex items-center space-x-3 px-4 py-3 cursor-pointer ${location === '/settings' ? 'bg-white/10' : 'hover:bg-white/10'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1 1.51V3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>{t("navigation.settings")}</span>
              </div>
            </Link>
          )}
          
          {/* Only superusers can access admin panel */}
          {user?.role === "superuser" && (
            <Link href="/admin">
              <div className={`flex items-center space-x-3 px-4 py-3 cursor-pointer ${location === '/admin' ? 'bg-white/10' : 'hover:bg-white/10'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3 6.5l7 .5l-5 4.5l2 7l-7-4l-7 4l2-7l-5-4.5l7-.5z" />
                </svg>
                <span>Admin Panel</span>
              </div>
            </Link>
          )}
          <button 
            onClick={() => logoutMutation.mutate()}
            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-white/10 text-left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>{t("common.logout")}</span>
          </button>
        </nav>
        
        <div className="mt-6 mb-4">
          <LanguageSelector variant="sidebar" />
        </div>
      </div>
    </div>
  );
}