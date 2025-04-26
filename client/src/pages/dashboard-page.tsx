import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTeam } from '@/hooks/use-team';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Trophy, Users, BarChart, Clock, MapPin } from 'lucide-react';
import MobileNavigation from '@/components/mobile-navigation';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';

export default function DashboardPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { selectedTeam } = useTeam();

  // Format date
  const formatDate = (date: Date) => {
    return format(new Date(date), 'PP');
  };

  // Format time
  const formatTime = (date: Date) => {
    return format(new Date(date), 'p');
  };

  // Upcoming events query
  const { 
    data: upcomingEvents = [],
    isLoading: isEventsLoading 
  } = useQuery({
    queryKey: ['/api/events/upcoming', selectedTeam?.id],
    enabled: !!selectedTeam,
  });

  // Recent announcements query
  const { 
    data: announcements = [],
    isLoading: isAnnouncementsLoading 
  } = useQuery({
    queryKey: ['/api/announcements/recent', selectedTeam?.id],
    enabled: !!selectedTeam,
  });

  // Upcoming match query
  const { 
    data: nextMatch,
    isLoading: isMatchLoading 
  } = useQuery({
    queryKey: ['/api/matches/next', selectedTeam?.id],
    enabled: !!selectedTeam,
  });

  // Team players query
  const { 
    data: players = [],
    isLoading: isPlayersLoading 
  } = useQuery({
    queryKey: ['/api/teams/players', selectedTeam?.id],
    enabled: !!selectedTeam,
  });

  // Team stats
  const { 
    data: teamStats,
    isLoading: isStatsLoading 
  } = useQuery({
    queryKey: ['/api/teams/stats', selectedTeam?.id],
    enabled: !!selectedTeam,
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <Header title={t('navigation.dashboard')} />
        <main className="container mx-auto py-6 px-4 space-y-8">
          {/* Top stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('dashboard.players')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{isPlayersLoading ? '-' : players.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('dashboard.matches')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{isStatsLoading ? '-' : teamStats?.totalMatches || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('dashboard.wins')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{isStatsLoading ? '-' : teamStats?.wins || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('dashboard.goals')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <BarChart className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{isStatsLoading ? '-' : teamStats?.goalsScored || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Next match */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('dashboard.nextMatch')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isMatchLoading ? (
                  <div className="h-36 flex items-center justify-center">
                    <p className="text-muted-foreground">{t('common.loading')}</p>
                  </div>
                ) : nextMatch ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-6 py-4">
                      <div className="text-center">
                        <div className="mb-2">
                          <Avatar className="h-14 w-14 mx-auto">
                            <AvatarImage src={selectedTeam?.logo || ''} />
                            <AvatarFallback>{selectedTeam?.name?.[0] || 'T'}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="font-medium">{selectedTeam?.name}</div>
                      </div>

                      <div className="text-center">
                        <div className="text-xl font-bold text-muted-foreground">VS</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {nextMatch.isHome ? t('common.home') : t('common.away')}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="mb-2">
                          <Avatar className="h-14 w-14 mx-auto">
                            <AvatarImage src={nextMatch.opponentLogo || ''} />
                            <AvatarFallback>{nextMatch.opponentName?.[0] || 'O'}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="font-medium">{nextMatch.opponentName}</div>
                      </div>
                    </div>

                    <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-4 w-4" />
                        <span>{formatDate(nextMatch.matchDate)}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        <span>{formatTime(nextMatch.matchDate)}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="mr-1 h-4 w-4" />
                        <span>{nextMatch.location || t('common.locationNotSet')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-36 flex flex-col items-center justify-center">
                    <p className="text-muted-foreground">{t('dashboard.noNextMatch')}</p>
                    {user?.role === 'admin' || user?.role === 'coach' ? (
                      <Button variant="outline" size="sm" className="mt-2">
                        <Calendar className="mr-2 h-4 w-4" />
                        {t('dashboard.scheduleMatch')}
                      </Button>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent announcements */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{t('dashboard.recentAnnouncements')}</CardTitle>
                <Button variant="ghost" size="sm">
                  {t('common.viewAll')}
                </Button>
              </CardHeader>
              <CardContent>
                {isAnnouncementsLoading ? (
                  <div className="h-36 flex items-center justify-center">
                    <p className="text-muted-foreground">{t('common.loading')}</p>
                  </div>
                ) : announcements.length > 0 ? (
                  <div className="space-y-4">
                    {announcements.slice(0, 3).map((announcement) => (
                      <div key={announcement.id} className="border-b pb-2 last:border-0">
                        <h4 className="font-medium">{announcement.title}</h4>
                        <p className="text-sm line-clamp-2 text-muted-foreground mt-1">
                          {announcement.content}
                        </p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(announcement.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-36 flex flex-col items-center justify-center">
                    <p className="text-muted-foreground">{t('dashboard.noRecentAnnouncements')}</p>
                    {user?.role === 'admin' || user?.role === 'coach' ? (
                      <Button variant="outline" size="sm" className="mt-2">
                        {t('dashboard.addAnnouncement')}
                      </Button>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming events */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{t('dashboard.upcomingEvents')}</CardTitle>
                <Button variant="ghost" size="sm">
                  {t('common.viewAll')}
                </Button>
              </CardHeader>
              <CardContent>
                {isEventsLoading ? (
                  <div className="h-36 flex items-center justify-center">
                    <p className="text-muted-foreground">{t('common.loading')}</p>
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingEvents.slice(0, 3).map((event) => (
                      <div key={event.id} className="flex items-start space-x-4 border-b pb-4 last:border-0">
                        <div className="bg-primary/10 text-primary rounded-md p-2">
                          {event.eventType === 'match' && <Trophy className="h-5 w-5" />}
                          {event.eventType === 'training' && <Users className="h-5 w-5" />}
                          {event.eventType === 'meeting' && <Users className="h-5 w-5" />}
                          {event.eventType === 'other' && <Calendar className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{event.title}</h4>
                          <div className="flex flex-col sm:flex-row sm:space-x-4 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center">
                              <Calendar className="mr-1 h-4 w-4" />
                              <span>{formatDate(event.startTime)}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="mr-1 h-4 w-4" />
                              <span>{formatTime(event.startTime)}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center">
                                <MapPin className="mr-1 h-4 w-4" />
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-36 flex flex-col items-center justify-center">
                    <p className="text-muted-foreground">{t('dashboard.noUpcomingEvents')}</p>
                    {user?.role === 'admin' || user?.role === 'coach' ? (
                      <Button variant="outline" size="sm" className="mt-2">
                        {t('dashboard.addNewEvent')}
                      </Button>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Season stats */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.season')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-2 bg-primary/5 rounded-md">
                      <div className="text-2xl font-bold">
                        {isStatsLoading ? '-' : `${teamStats?.wins || 0}/${teamStats?.totalMatches || 0}`}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('dashboard.wins')}</div>
                    </div>
                    <div className="text-center p-2 bg-primary/5 rounded-md">
                      <div className="text-2xl font-bold">
                        {isStatsLoading ? '-' : teamStats?.goalsScored || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('dashboard.goals')}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <MobileNavigation />
      </div>
    </div>
  );
}