import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useTeam } from '@/hooks/use-team';
import { useLanguage } from '@/hooks/use-language';
import Logo from '@/components/logo';
import {
  HomeIcon,
  Trophy,
  Calendar,
  Shirt,
  BarChart,
  MessageSquare,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { selectedTeam, teams, setSelectedTeam } = useTeam();
  const { t } = useLanguage();

  // Get user initials from fullName
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Nav item component
  const NavItem = ({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) => {
    const isActive = location === href;
    return (
      <Link href={href}>
        <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
          isActive 
            ? 'bg-primary/10 text-primary font-medium' 
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}>
          {icon}
          <span>{label}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="hidden border-r h-screen bg-background lg:block w-64 fixed">
      <div className="flex flex-col h-full">
        {/* Top section with logo and team selection */}
        <div className="py-4 px-6">
          <div className="flex items-center gap-2">
            <Logo className="text-primary" size={32} />
            <h1 className="text-xl font-bold">TeamKick</h1>
          </div>
          
          {/* Team selector */}
          {selectedTeam && (
            <div className="mt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="truncate">{selectedTeam.name}</span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>{t('common.teams')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {teams.map((team) => (
                    <DropdownMenuItem 
                      key={team.id}
                      onClick={() => setSelectedTeam(team)}
                      className={selectedTeam.id === team.id ? 'bg-primary/10 text-primary' : ''}
                    >
                      {team.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-auto py-2 px-3">
          <nav className="space-y-1">
            <NavItem 
              href="/" 
              icon={<HomeIcon className="h-5 w-5" />} 
              label={t('navigation.dashboard')} 
            />
            <NavItem 
              href="/matches" 
              icon={<Trophy className="h-5 w-5" />} 
              label={t('navigation.matches')} 
            />
            <NavItem 
              href="/events" 
              icon={<Calendar className="h-5 w-5" />} 
              label={t('navigation.events')} 
            />
            <NavItem 
              href="/players" 
              icon={<Shirt className="h-5 w-5" />} 
              label={t('navigation.players')} 
            />
            <NavItem 
              href="/statistics" 
              icon={<BarChart className="h-5 w-5" />} 
              label={t('navigation.statistics')} 
            />
            <NavItem 
              href="/announcements" 
              icon={<MessageSquare className="h-5 w-5" />} 
              label={t('navigation.announcements')} 
            />
            
            {/* Admin-only pages */}
            {user && (user.role === 'admin' || user.role === 'superuser') && (
              <NavItem 
                href="/settings" 
                icon={<Settings className="h-5 w-5" />} 
                label={t('navigation.settings')} 
              />
            )}
            
            {/* Superuser-only pages */}
            {user && user.role === 'superuser' && (
              <NavItem 
                href="/admin" 
                icon={<Settings className="h-5 w-5" />} 
                label={t('navigation.admin')} 
              />
            )}
          </nav>
        </div>
        
        {/* User profile at bottom */}
        <div className="border-t p-4">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profilePicture || undefined} />
                      <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{user.fullName}</span>
                      <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('auth.profile')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile">{t('auth.editProfile')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}