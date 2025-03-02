import { useState, useEffect } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TeamMember, InsertLineup, Lineup } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserNav } from "@/components/layout/user-nav";
import SoccerField from "@/components/lineup/soccer-field";
import PlayerCard from "@/components/lineup/player-card";
import { Sidebar, SidebarContent, SidebarFooter, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";

// Default formations configuration
const DEFAULT_FORMATIONS = {
  "4-4-2": {
    positions: [
      // Position configuration for 4-4-2 formation
      // These would be populated with actual data
    ]
  },
  "4-3-3": {
    positions: [
      // Position configuration for 4-3-3 formation
    ]
  },
  "3-5-2": {
    positions: [
      // Position configuration for 3-5-2 formation
    ]
  }
};

export default function LineupPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [formation, setFormation] = useState<string>("4-4-2");
  const [lineupName, setLineupName] = useState<string>("Default Lineup");
  const [selectedPlayers, setSelectedPlayers] = useState<any[]>(DEFAULT_FORMATIONS["4-4-2"].positions || []);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [selectedLineupId, setSelectedLineupId] = useState<number | null>(null);

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });
  const teamId = teams.length > 0 ? teams[0].id : null;

  const { data: teamMembers, isLoading: isLoadingMembers } = useQuery<TeamMember[]>({
    queryKey: [`/api/teams/${teamId}/members`],
    enabled: !!teamId,
  });

  const { data: lineups = [], isLoading: isLoadingLineups } = useQuery<Lineup[]>({
    queryKey: [`/api/teams/${teamId}/lineups`],
    enabled: !!teamId,
  });

  useEffect(() => {
    if (teamMembers) {
      setAvailablePlayers(teamMembers.filter(member => member.role === "player"));
    }
  }, [teamMembers]);

  useEffect(() => {
    try {
      const cachedLineupJson = localStorage.getItem('cachedLineup');
      if (cachedLineupJson) {
        const cachedLineup = JSON.parse(cachedLineupJson);

        // Load the cached lineup
        setSelectedLineupId(cachedLineup.id);
        setLineupName(cachedLineup.name);
        setFormation(cachedLineup.formation);
        setSelectedPlayers(cachedLineup.positions);
      }
    } catch (error) {
      console.error('Error loading cached lineup:', error);
    }
  }, []);

  const handleFormationChange = (newFormation: string) => {
    setFormation(newFormation);
    setSelectedPlayers(DEFAULT_FORMATIONS[newFormation].positions);
  };

  const handleDragEnd = (result: DropResult) => {
    // Implementation for drag and drop functionality
    console.log('Drag ended:', result);
  };

  const saveLineupMutation = useMutation({
    mutationFn: async (lineupData: InsertLineup) => {
      if (selectedLineupId) {
        // Update existing lineup
        const res = await apiRequest('PUT', `/api/teams/${teamId}/lineups/${selectedLineupId}`, lineupData);
        return await res.json();
      } else {
        // Create new lineup
        const res = await apiRequest('POST', `/api/teams/${teamId}/lineups`, lineupData);
        return await res.json();
      }
    },
    onSuccess: (data) => {
      setSelectedLineupId(data.id);
      // Invalidate lineups cache
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/lineups`] });

      const actionText = selectedLineupId ? "updated" : "saved";
      toast({
        title: `Lineup ${actionText}`,
        description: `${lineupName} has been ${actionText} successfully.`,
      });
    },
    onError: (error: Error) => {
      console.error('Error saving lineup:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save lineup",
        variant: "destructive",
      });
    }
  });

  const handleSaveLineup = async () => {
    if (!teamId) {
      toast({
        title: "Error",
        description: "No team selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const lineupData = {
        name: lineupName,
        formation,
        positions: selectedPlayers, // Server will handle JSON conversion
        teamId,
        createdById: 0, // Will be set by the server based on authenticated user
      };

      saveLineupMutation.mutate(lineupData as InsertLineup);
    } catch (error) {
      console.error('Error preparing lineup data:', error);
      toast({
        title: "Error",
        description: "Failed to prepare lineup data",
        variant: "destructive",
      });
    }
  };


  const handleLoadLineup = async (lineupId: number) => {
    if (!teamId) return;

    try {
      const response = await fetch(`/api/teams/${teamId}/lineups/${lineupId}`);
      if (!response.ok) {
        throw new Error('Failed to load lineup');
      }

      const lineup = await response.json();
      setSelectedLineupId(lineup.id);
      setLineupName(lineup.name);
      setFormation(lineup.formation);

      // Parse the positions from the stored JSON
      let positionsData;
      try {
        positionsData = typeof lineup.positions === 'string'
          ? JSON.parse(lineup.positions)
          : lineup.positions;
      } catch (e) {
        console.error('Error parsing positions data:', e);
        // If parsing fails, use default formation
        positionsData = DEFAULT_FORMATIONS[lineup.formation || "4-4-2"].positions;
      }

      // Reset drag and drop by creating a fresh copy with properly formatted player IDs
      const formattedPositions = [];

      // Use default positions as a template to maintain formation structure
      const defaultPositions = DEFAULT_FORMATIONS[lineup.formation || "4-4-2"].positions;

      for (const defPos of defaultPositions) {
        // Find the matching position in the loaded data
        const loadedPos = positionsData.find((p: any) => p.id === defPos.id);

        if (loadedPos) {
          formattedPositions.push({
            id: defPos.id,
            x: defPos.x,
            y: defPos.y,
            // Make sure player IDs are properly handled as numbers, not strings
            playerId: loadedPos.playerId === null || loadedPos.playerId === undefined
              ? null
              : Number(loadedPos.playerId)
          });
        } else {
          // If position not found in loaded data, use default
          formattedPositions.push({ ...defPos });
        }
      }

      // Store lineup data in localStorage before reloading
      const cachedLineup = {
        id: lineup.id,
        name: lineup.name,
        formation: lineup.formation,
        positions: formattedPositions
      };
      localStorage.setItem('cachedLineup', JSON.stringify(cachedLineup));

      // Reload the page to get a fresh drag and drop context
      window.location.reload();
    } catch (error) {
      console.error('Error loading lineup:', error);
      toast({
        title: "Error",
        description: "Failed to load lineup",
        variant: "destructive",
      });
    }
  };

  const isLoading = isLoadingMembers || isLoadingLineups;

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter>
          {/* Footer content */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex h-16 items-center px-4 border-b">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold">Team Manager</h2>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Lineup</h2>
          </div>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Card className="p-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="lineup-name">Lineup Name</Label>
                  <Input
                    id="lineup-name"
                    value={lineupName}
                    onChange={(e) => setLineupName(e.target.value)}
                    placeholder="Enter lineup name"
                  />
                </div>
                <div className="space-y-2 w-full md:w-auto">
                  <Label htmlFor="formation">Formation</Label>
                  <Select value={formation} onValueChange={handleFormationChange}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Select formation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4-4-2">4-4-2</SelectItem>
                      <SelectItem value="4-3-3">4-3-3</SelectItem>
                      <SelectItem value="3-5-2">3-5-2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SoccerField selectedPlayers={selectedPlayers} />
              <div className="flex justify-center">
                <Button onClick={handleSaveLineup} className="px-8">
                  Save Lineup
                </Button>
              </div>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4">Saved Lineups</h2>
                <div className="space-y-2">
                  {lineups && lineups.length > 0 ? (
                    lineups.map((lineup) => (
                      <div
                        key={lineup.id}
                        className={`p-3 rounded-md cursor-pointer flex justify-between items-center ${selectedLineupId === lineup.id ? 'bg-primary/10 border border-primary' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
                      >
                        <div
                          className="flex-1"
                          onClick={() => handleLoadLineup(lineup.id)}
                        >
                          <div className="font-medium">{lineup.name}</div>
                          <div className="text-sm text-gray-500">{lineup.formation}</div>
                        </div>
                        <div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete "${lineup.name}"?`)) {
                                // Delete lineup logic
                                console.log('Delete lineup:', lineup.id);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No saved lineups
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // Force a full reset by reloading the page
                      window.location.reload();
                    }}
                  >
                    Create New Lineup
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4">Available Players</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {availablePlayers.map((player) => (
                    <PlayerCard key={player.id} player={player} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </DragDropContext>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}