import { Link, useLocation } from "wouter";
import { useMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { 
  HomeIcon, 
  Calendar, Shirt, 
  BarChart, 
  MessageSquare,
  Trophy,
  Menu
} from "lucide-react";

export default function MobileNavigation() {
  const [location] = useLocation();
  const isMobile = useMobile();
  const { t } = useLanguage();

  if (!isMobile) return null;

  // Function to create navigation item component
  const NavItem = ({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) => (
    <Link href={href}>
      <div className={`flex flex-col items-center py-1 ${location === href ? 'text-primary' : 'text-gray-500'}`}>
        {icon}
        <span className="text-xs mt-1">{label}</span>
      </div>
    </Link>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="grid grid-cols-5 py-2">
        <NavItem 
          href="/dashboard" 
          icon={<HomeIcon className="w-5 h-5" />} 
          label={t("navigation.dashboard")} 
        />
        <NavItem 
          href="/matches" 
          icon={<Trophy className="w-5 h-5" />} 
          label={t("navigation.matches")} 
        />
        <NavItem 
          href="/events" 
          icon={<Calendar className="w-5 h-5" />} 
          label={t("navigation.events")} 
        />
        <NavItem 
          href="/players" 
          icon={<Shirt className="w-5 h-5" />} 
          label={t("navigation.players")} 
        />
        
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center py-1 text-gray-500">
              <Menu className="w-5 h-5" />
              <span className="text-xs mt-1">{t("common.more")}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[300px] py-6">
            <div className="grid grid-cols-3 gap-4">
              <NavItem 
                href="/statistics" 
                icon={<BarChart className="w-6 h-6" />} 
                label={t("navigation.statistics")} 
              />
              <NavItem 
                href="/announcements" 
                icon={<MessageSquare className="w-6 h-6" />} 
                label={t("navigation.announcements")} 
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}