import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { 
  HomeIcon, 
  Calendar, 
  User2, 
  Users, 
  BarChart, 
  Settings, 
  LogOut,
  MessageSquare,
  ShieldAlert,
  Trophy
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import Logo from "@/components/logo";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { t } = useLanguage();
  const isMobile = useMobile();

  if (isMobile) return null;

  // Function to determine if a link is active
  const isActive = (path: string) => location.startsWith(path);

  // Get initials from user's name if available
  const getInitials = () => {
    if (!user) return "U";
    
    const nameParts = [
      user.firstName || "", 
      user.lastName || ""
    ].filter(Boolean);
    
    // If we have parts, get first letter of each
    if (nameParts.length > 0) {
      return nameParts.map(part => part.charAt(0)).join("");
    }
    
    // Fallback to first letter of username
    return user.username ? user.username.charAt(0).toUpperCase() : "U";
  };

  return (
    <div className="hidden md:flex flex-col w-64 fixed inset-y-0 bg-background border-r border-border">
      {/* Logo and header */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/dashboard">
          <div className="flex items-center cursor-pointer">
            <Logo size={30} />
            <div className="ml-2 text-lg font-semibold text-primary">TeamKick</div>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
        <Link href="/dashboard">
          <div className={`flex items-center px-3 py-2 rounded-md cursor-pointer ${
            isActive("/dashboard") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}>
            <HomeIcon className="h-5 w-5 mr-3" />
            <span>{t("navigation.dashboard")}</span>
          </div>
        </Link>

        <Link href="/matches">
          <div className={`flex items-center px-3 py-2 rounded-md cursor-pointer ${
            isActive("/matches") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}>
            <Trophy className="h-5 w-5 mr-3" />
            <span>{t("navigation.matches")}</span>
          </div>
        </Link>

        <Link href="/events">
          <div className={`flex items-center px-3 py-2 rounded-md cursor-pointer ${
            isActive("/events") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}>
            <Calendar className="h-5 w-5 mr-3" />
            <span>{t("navigation.events")}</span>
          </div>
        </Link>

        <Link href="/players">
          <div className={`flex items-center px-3 py-2 rounded-md cursor-pointer ${
            isActive("/players") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}>
            <Users className="h-5 w-5 mr-3" />
            <span>{t("navigation.players")}</span>
          </div>
        </Link>

        <Link href="/statistics">
          <div className={`flex items-center px-3 py-2 rounded-md cursor-pointer ${
            isActive("/statistics") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}>
            <BarChart className="h-5 w-5 mr-3" />
            <span>{t("navigation.statistics")}</span>
          </div>
        </Link>

        <Link href="/announcements">
          <div className={`flex items-center px-3 py-2 rounded-md cursor-pointer ${
            isActive("/announcements") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}>
            <MessageSquare className="h-5 w-5 mr-3" />
            <span>{t("navigation.announcements")}</span>
          </div>
        </Link>

        {user?.role === "admin" && (
          <Link href="/admin">
            <div className={`flex items-center px-3 py-2 rounded-md cursor-pointer ${
              isActive("/admin") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            }`}>
              <ShieldAlert className="h-5 w-5 mr-3" />
              <span>{t("navigation.admin")}</span>
            </div>
          </Link>
        )}
      </div>

      {/* User Menu and Settings */}
      <div className="p-4 border-t border-border">
        <Link href="/settings">
          <div className={`flex items-center px-3 py-2 rounded-md cursor-pointer ${
            isActive("/settings") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}>
            <Settings className="h-5 w-5 mr-3" />
            <span>{t("navigation.settings")}</span>
          </div>
        </Link>

        {user && (
          <>
            <div className="flex items-center mt-4 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center mr-3">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.username} 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="font-medium text-sm">{getInitials()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>

            <div 
              className="flex items-center px-3 py-2 mt-2 rounded-md cursor-pointer text-red-500 hover:bg-red-500/10"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span>{t("auth.logout")}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}