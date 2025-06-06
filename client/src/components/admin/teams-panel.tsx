import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  RefreshCw, 
  Users, 
  ChevronDown,
  ChevronRight,
  Shield
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { Team } from '@shared/schema';
import { TeamMemberList } from './team-member-list';
import { AddTeamForm } from './add-team-form';
import { EditTeamForm } from './edit-team-form';

export default function TeamsPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all teams
  const { data: apiResponse, isLoading, refetch, error } = useQuery({
    queryKey: ['/api/admin/teams'],
    queryFn: () => apiRequest('/api/admin/teams'),
    enabled: showSearchResults, // Only fetch when search button is clicked
  });
  
  // Handle errors from the query
  useEffect(() => {
    if (error) {
      toast({
        titleKey: 'toasts.errorLoading',
        descriptionKey: 'toasts.errorLoadingTeamsDesc',
        variant: 'destructive',
      });
      console.error('Error loading teams:', error);
    }
  }, [error, toast]);

  // Convert the API response to an array, ensuring we always have an array even if the API returns unexpected data
  const teams = Array.isArray(apiResponse) ? apiResponse : apiResponse ? [apiResponse] : [];

  // Delete team mutation
  const deleteMutation = useMutation({
    mutationFn: (teamId: number) => apiRequest(`/api/admin/teams/${teamId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        titleKey: 'toasts.teamDeleted',
        descriptionKey: 'toasts.teamDeletedDesc',
      });
      setIsDeleteDialogOpen(false);
      setExpandedTeam(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
    },
    onError: (error) => {
      toast({
        titleKey: 'toasts.error',
        descriptionKey: 'toasts.actionFailed',
        variant: 'destructive',
      });
    },
  });

  // Filter teams based on search query
  const filteredTeams = teams.filter(
    (team: Team) =>
      team?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team?.division && team.division.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (team?.joinCode && team.joinCode.toLowerCase().includes(searchQuery.toLowerCase())) || 
      false // Fallback if team is null/undefined
  );
  
  // Apply pagination
  const paginatedTeams = filteredTeams.slice(0, itemsPerPage);

  // Handle team deletion
  const handleDeleteTeam = () => {
    if (currentTeamId) {
      deleteMutation.mutate(currentTeamId);
    }
  };

  // Toggle team details expansion
  const toggleTeamExpansion = (teamId: number) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  // Open edit team modal
  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setCurrentTeamId(team.id);
    setIsEditTeamOpen(true);
  };

  // Open delete confirmation modal
  const confirmDelete = (team: Team) => {
    setSelectedTeam(team);
    setCurrentTeamId(team.id);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Teams Management</CardTitle>
            <Button onClick={() => setIsAddTeamOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Team
            </Button>
          </div>
          <CardDescription>
            Manage teams, their members, and settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 mb-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams by name, division, or join code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button variant="default" onClick={() => {
                setShowSearchResults(true);
                refetch();
              }}>
                Search
              </Button>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label htmlFor="items-per-page" className="text-sm">Show:</label>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => setItemsPerPage(parseInt(value))}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder="20" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm">entries</span>
              </div>
              
              {filteredTeams.length > itemsPerPage && (
                <Button variant="outline" size="sm" onClick={() => setItemsPerPage(prev => prev + 20)}>
                  Show More
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Join Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!showSearchResults ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Use the search button to display teams.
                    </TableCell>
                  </TableRow>
                ) : paginatedTeams.length > 0 ? (
                  paginatedTeams.map((team: Team) => (
                    <React.Fragment key={team.id}>
                      <TableRow>
                        <TableCell>
                          <div 
                            className="flex items-center space-x-2 cursor-pointer" 
                            onClick={() => toggleTeamExpansion(team.id)}
                          >
                            {expandedTeam === team.id ? 
                              <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            }
                            <div className="flex items-center space-x-2">
                              {team.logo ? (
                                <img
                                  src={team.logo}
                                  alt={team.name}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                  <Shield className="h-4 w-4" />
                                </div>
                              )}
                              <span className="font-medium">{team.name}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{team.division || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{team.joinCode || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditTeam(team)}
                              title="Edit team"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-destructive"
                              onClick={() => confirmDelete(team)}
                              title="Delete team"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedTeam === team.id && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={5} className="p-4">
                            <TeamMemberList team={team} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No teams found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="border-t p-4 text-sm text-muted-foreground">
          {showSearchResults ? 
            `Showing ${Math.min(paginatedTeams.length, itemsPerPage)} of ${filteredTeams.length} filtered teams (${teams.length} total)` : 
            "Click search to display teams"
          }
        </CardFooter>
      </Card>

      {/* Add Team Dialog */}
      <Dialog open={isAddTeamOpen} onOpenChange={setIsAddTeamOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Team</DialogTitle>
            <DialogDescription>
              Create a new team in the system. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          <AddTeamForm
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
              setIsAddTeamOpen(false);
            }}
            onCancel={() => setIsAddTeamOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      {selectedTeam && (
        <Dialog open={isEditTeamOpen} onOpenChange={setIsEditTeamOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Team</DialogTitle>
              <DialogDescription>
                Update team information for {selectedTeam.name}.
              </DialogDescription>
            </DialogHeader>
            <EditTeamForm
              team={selectedTeam}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
                setIsEditTeamOpen(false);
              }}
              onCancel={() => setIsEditTeamOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this team? This action cannot be undone and will remove all associated data including team members, matches, events, and announcements.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTeam}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}