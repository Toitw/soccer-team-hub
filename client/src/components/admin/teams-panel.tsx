import { useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Eye, Pencil, Trash2, Search, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { TeamMemberList } from './team-member-list';
import { AddTeamForm } from './add-team-form';
import { EditTeamForm } from './edit-team-form';
import { Team } from '@shared/schema';

export default function AdminTeamsPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewMembersOpen, setIsViewMembersOpen] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all teams
  const { data: teams = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/teams'],
    queryFn: () => apiRequest<Team[]>('/api/admin/teams'),
  });

  // Delete team mutation
  const deleteMutation = useMutation({
    mutationFn: (teamId: number) => apiRequest(`/api/admin/teams/${teamId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: 'Team deleted',
        description: 'The team has been deleted successfully.',
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete team. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Filter teams based on search query
  const filteredTeams = teams.filter((team) =>
    team?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle team deletion
  const handleDeleteTeam = () => {
    if (currentTeamId) {
      deleteMutation.mutate(currentTeamId);
    }
  };

  // Open team members modal
  const handleViewMembers = (team: any) => {
    setSelectedTeam(team);
    setCurrentTeamId(team.id);
    setIsViewMembersOpen(true);
  };

  // Open edit team modal
  const handleEditTeam = (team: any) => {
    setSelectedTeam(team);
    setCurrentTeamId(team.id);
    setIsEditTeamOpen(true);
  };

  // Open delete confirmation modal
  const confirmDelete = (team: any) => {
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
            Manage all teams in the system. You can add, edit, or remove teams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Join Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.length > 0 ? (
                  filteredTeams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.id}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          {team.logo && (
                            <img
                              src={team.logo}
                              alt={team.name}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          )}
                          <span>{team.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{team.division || 'N/A'}</TableCell>
                      <TableCell>{team.seasonYear || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{team.joinCode || 'None'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleViewMembers(team)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditTeam(team)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-destructive"
                            onClick={() => confirmDelete(team)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No teams found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="border-t p-4 text-sm text-muted-foreground">
          Showing {filteredTeams.length} of {teams.length} teams
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
              Are you sure you want to delete this team? This action cannot be undone.
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

      {/* View Team Members Dialog */}
      {selectedTeam && (
        <Dialog open={isViewMembersOpen} onOpenChange={setIsViewMembersOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Team Members - {selectedTeam.name}</DialogTitle>
              <DialogDescription>
                Manage team members, roles, and permissions.
              </DialogDescription>
            </DialogHeader>
            <TeamMemberList
              teamId={selectedTeam.id}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}