import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { ClassificationTable } from '@/components/classification/classification-table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Check, X, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from '@/hooks/use-translation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Season form schema
const seasonFormSchema = z.object({
  name: z.string().min(1, "Season name is required"),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date().optional(),
  description: z.string().optional()
});

type SeasonFormValues = z.infer<typeof seasonFormSchema>;

interface Season {
  id: number;
  name: string;
  teamId: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export function SeasonManagement({ teamId }: { teamId: number }) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Fetch all seasons for the team
  const { data: seasons, isLoading } = useQuery({
    queryKey: ['/api/teams', teamId, 'seasons'],
    queryFn: () => apiRequest<Season[]>(`/api/teams/${teamId}/seasons`),
  });

  // Create season form
  const form = useForm<SeasonFormValues>({
    resolver: zodResolver(seasonFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Create season mutation
  const createSeasonMutation = useMutation({
    mutationFn: (data: SeasonFormValues) => 
      apiRequest(`/api/teams/${teamId}/seasons`, {
        method: 'POST',
        data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId, 'seasons'] });
      setIsCreateDialogOpen(false);
      toast({
        titleKey: "toasts.seasonCreated",
        descriptionKey: "toasts.seasonCreatedDesc",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        titleKey: "toasts.error",
        description: `${t("toasts.actionFailed")}: ${String(error)}`,
        variant: "destructive",
      });
    }
  });

  // Finish season mutation
  const finishSeasonMutation = useMutation({
    mutationFn: (seasonId: number) => 
      apiRequest(`/api/seasons/${seasonId}/finish`, {
        method: 'POST'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId, 'seasons'] });
      toast({
        titleKey: "toasts.success",
        description: t("seasons.markAsFinished"),
      });
    },
    onError: (error) => {
      toast({
        titleKey: "toasts.error",
        description: `${t("toasts.actionFailed")}: ${String(error)}`,
        variant: "destructive",
      });
    }
  });

  // Delete season mutation
  const deleteSeasonMutation = useMutation({
    mutationFn: (seasonId: number) => 
      apiRequest(`/api/seasons/${seasonId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId, 'seasons'] });
      toast({
        titleKey: "toasts.seasonDeleted",
        descriptionKey: "toasts.seasonDeletedDesc",
      });
    },
    onError: (error) => {
      toast({
        titleKey: "toasts.error",
        description: `${t("toasts.actionFailed")}: ${String(error)}`,
        variant: "destructive",
      });
    }
  });

  // Handle form submission for creating a new season
  const onSubmit = (data: SeasonFormValues) => {
    createSeasonMutation.mutate(data);
  };

  // Update active season when seasons are loaded
  useEffect(() => {
    if (seasons && seasons.length > 0) {
      // Find an active season if any
      const active = seasons.find(s => s.isActive);
      if (active) {
        setActiveSeason(active.id);
      } else {
        // Default to the most recent season
        const mostRecent = [...seasons].sort((a, b) => 
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )[0];
        setActiveSeason(mostRecent.id);
      }
    }
  }, [seasons]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('seasons.seasons')}</h2>
          <p className="text-muted-foreground">
            {t('seasons.manageTeamSeasons')}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          {/* Show New Season button only if seasons exist and none are active */}
          {seasons && seasons.length > 0 && !seasons.some(season => season.isActive) && (
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('seasons.newSeason')}
              </Button>
            </DialogTrigger>
          )}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('seasons.createNewSeason')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('seasons.seasonName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('seasons.namePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('seasons.startDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t('seasons.pickDate')}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="h-[380px] overflow-hidden">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              className="w-full"
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('seasons.endDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t('seasons.pickDate')}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="h-[380px] overflow-hidden">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                              className="w-full"
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('seasons.description')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('seasons.descriptionPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    {t('seasons.cancel')}
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createSeasonMutation.isPending}
                  >
                    {createSeasonMutation.isPending ? t('seasons.creating') : t('seasons.createSeason')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-8 text-center">{t('seasons.loadingSeasons')}</div>
      ) : seasons && seasons.length > 0 ? (
        <Tabs 
          defaultValue={activeSeason?.toString() || ""}
          value={activeSeason?.toString() || ""}
          onValueChange={(value) => setActiveSeason(parseInt(value))}
          className="w-full"
        >
          <div className="mb-4 flex items-center justify-between">
            {(() => {
              const activeSeasonData = seasons.find(s => s.isActive);
              const inactiveSeasons = seasons
                .filter(s => !s.isActive)
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
              
              return (
                <>
                  {activeSeasonData && (
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold">{activeSeasonData.name}</h3>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        {t('seasons.active')}
                      </span>
                    </div>
                  )}
                  
                  {inactiveSeasons.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">{t('seasons.viewPrevious')}:</span>
                      <Select
                        value={activeSeason?.toString() || ""}
                        onValueChange={(value) => setActiveSeason(parseInt(value))}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder={t('seasons.selectSeason')} />
                        </SelectTrigger>
                        <SelectContent>
                          {activeSeasonData && (
                            <SelectItem value={activeSeasonData.id.toString()}>
                              {activeSeasonData.name} ({t('seasons.active')})
                            </SelectItem>
                          )}
                          {inactiveSeasons.map((season) => (
                            <SelectItem key={season.id} value={season.id.toString()}>
                              {season.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {seasons.map((season) => (
            <TabsContent key={season.id} value={season.id.toString()}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <span>{season.name}</span>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      {season.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => finishSeasonMutation.mutate(season.id)}
                          disabled={finishSeasonMutation.isPending}
                          className="flex-grow sm:flex-grow-0"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          {t('seasons.markAsFinished')}
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="flex-grow sm:flex-grow-0">
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('seasons.delete')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t('seasons.deleteSeason')}</DialogTitle>
                          </DialogHeader>
                          <p>
                            {t('seasons.deleteConfirmation')}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {t('seasons.deleteNote')}
                          </p>
                          <DialogFooter className="mt-4">
                            <Button
                              variant="outline"
                              onClick={() => {}}
                            >
                              {t('seasons.cancel')}
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => deleteSeasonMutation.mutate(season.id)}
                              disabled={deleteSeasonMutation.isPending}
                            >
                              {deleteSeasonMutation.isPending ? t('seasons.deleting') : t('seasons.deleteSeason')}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {season.description && <p>{season.description}</p>}
                    <div className="text-sm mt-2">
                      <span>{t('seasons.startDateLabel')}: {new Date(season.startDate).toLocaleDateString()}</span>
                      {season.endDate && (
                        <span className="ml-4">
                          {t('seasons.endDateLabel')}: {new Date(season.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">{t('seasons.seasonStandings')}</h3>
                  <SeasonClassifications teamId={teamId} seasonId={season.id} />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="mb-4">{t('seasons.noSeasons')}</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('seasons.createFirstSeason')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SeasonClassificationsProps {
  teamId: number;
  seasonId: number;
}

// Component to display classifications for a specific season
function SeasonClassifications({ teamId, seasonId }: SeasonClassificationsProps) {
  // Fetch team's general classifications and filter by season
  const { data: teamClassifications, isLoading } = useQuery({
    queryKey: ['/api/teams', teamId, 'classification'],
    queryFn: () => apiRequest(`/api/teams/${teamId}/classification`),
  });
  
  const { t } = useTranslation();
  
  // Filter team classifications by the current season
  const filteredClassifications = (teamClassifications || []).filter(c => c.seasonId === seasonId);
  
  return (
    <ClassificationTable 
      classifications={filteredClassifications} 
      isLoading={isLoading}
      emptyMessage={
        <div>
          {t('seasons.noStandings')}
          <div className="block text-sm text-muted-foreground mt-2">
            {t('seasons.useLeagueTab')}
          </div>
        </div>
      }
    />
  );
}