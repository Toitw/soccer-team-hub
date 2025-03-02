import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import SoccerField from "@/components/lineup/soccer-field";
import PlayerCard from "@/components/lineup/player-card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TeamMember, InsertLineup, Lineup } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

type PlayerPosition = {
  id: string;
  x: number;
  y: number;
  playerId: number | null;
};

type PlayerWithPosition = TeamMember & {
  position?: string | null;
  jerseyNumber?: number | null;
  user?: {
    fullName: string;
    profilePicture?: string;
  };
};

type Formation = {
  name: string;
  positions: PlayerPosition[];
};

const DEFAULT_FORMATIONS: Record<string, Formation> = {
  "4-4-2": {
    name: "4-4-2",
    positions: [
      // Goalkeeper
      { id: "gk", x: 50, y: 90, playerId: null },
      // Defenders
      { id: "lb", x: 20, y: 70, playerId: null },
      { id: "lcb", x: 40, y: 70, playerId: null },
      { id: "rcb", x: 60, y: 70, playerId: null },
      { id: "rb", x: 80, y: 70, playerId: null },
      // Midfielders
      { id: "lm", x: 20, y: 50, playerId: null },
      { id: "lcm", x: 40, y: 50, playerId: null },
      { id: "rcm", x: 60, y: 50, playerId: null },
      { id: "rm", x: 80, y: 50, playerId: null },
      // Forwards
      { id: "ls", x: 35, y: 30, playerId: null },
      { id: "rs", x: 65, y: 30, playerId: null },
    ]
  },
  "4-3-3": {
    name: "4-3-3",
    positions: [
      // Goalkeeper
      { id: "gk", x: 50, y: 90, playerId: null },
      // Defenders
      { id: "lb", x: 20, y: 70, playerId: null },
      { id: "lcb", x: 40, y: 70, playerId: null },
      { id: "rcb", x: 60, y: 70, playerId: null },
      { id: "rb", x: 80, y: 70, playerId: null },
      // Midfielders
      { id: "cdm", x: 50, y: 55, playerId: null },
      { id: "lcm", x: 35, y: 45, playerId: null },
      { id: "rcm", x: 65, y: 45, playerId: null },
      // Forwards
      { id: "lw", x: 20, y: 30, playerId: null },
      { id: "st", x: 50, y: 25, playerId: null },
      { id: "rw", x: 80, y: 30, playerId: null },
    ]
  },
  "3-5-2": {
    name: "3-5-2",
    positions: [
      // Goalkeeper
      { id: "gk", x: 50, y: 90, playerId: null },
      // Defenders
      { id: "lcb", x: 30, y: 70, playerId: null },
      { id: "cb", x: 50, y: 75, playerId: null },
      { id: "rcb", x: 70, y: 70, playerId: null },
      // Midfielders
      { id: "lwb", x: 15, y: 60, playerId: null },
      { id: "lcm", x: 35, y: 50, playerId: null },
      { id: "cm", x: 50, y: 55, playerId: null },
      { id: "rcm", x: 65, y: 50, playerId: null },
      { id: "rwb", x: 85, y: 60, playerId: null },
      // Forwards
      { id: "ls", x: 35, y: 30, playerId: null },
      { id: "rs", x: 65, y: 30, playerId: null },
    ]
  }
};

export default function LineupPage() {
  const { toast } = useToast();
  const [formation, setFormation] = useState<string>("4-4-2");
  const [lineupName, setLineupName] = useState<string>("Default Lineup");
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerPosition[]>(DEFAULT_FORMATIONS["4-4-2"].positions);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerWithPosition[]>([]);
  const [selectedLineupId, setSelectedLineupId] = useState<number | null>(null);

  // Get the first team from the list
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  const teamId = teams.length > 0 ? teams[0].id : null;

  // Get team members
  const { data: teamMembers, isLoading: isLoadingMembers } = useQuery<TeamMember[]>({
    queryKey: [`/api/teams/${teamId}/members`],
    enabled: !!teamId,
  });
  
  // Get lineups
  const { data: lineups = [], isLoading: isLoadingLineups } = useQuery<Lineup[]>({
    queryKey: [`/api/teams/${teamId}/lineups`],
    enabled: !!teamId,
  });

  useEffect(() => {
    if (teamMembers) {
      setAvailablePlayers(teamMembers.filter(member => member.role === "player") as PlayerWithPosition[]);
    }
  }, [teamMembers]);

  const handleFormationChange = (value: string) => {
    setFormation(value);
    setSelectedPlayers(DEFAULT_FORMATIONS[value].positions);
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    if (source.droppableId === 'available-players' && destination.droppableId.startsWith('position-')) {
      // Player moved from bench to field
      const playerId = parseInt(result.draggableId.split('-')[1]);
      const positionId = destination.droppableId.split('-')[1];
      
      // Update the player's position on the field
      setSelectedPlayers(prevPositions => 
        prevPositions.map(pos => 
          pos.id === positionId 
            ? { ...pos, playerId } 
            : pos.playerId === playerId // Remove player from previous position if they were already on the field
              ? { ...pos, playerId: null }
              : pos
        )
      );
    } else if (source.droppableId.startsWith('position-') && destination.droppableId === 'available-players') {
      // Player removed from field and returned to bench
      const positionId = source.droppableId.split('-')[1];
      
      setSelectedPlayers(prevPositions => 
        prevPositions.map(pos => 
          pos.id === positionId ? { ...pos, playerId: null } : pos
        )
      );
    } else if (source.droppableId.startsWith('position-') && destination.droppableId.startsWith('position-')) {
      // Player swapped positions on the field
      const sourcePositionId = source.droppableId.split('-')[1];
      const destPositionId = destination.droppableId.split('-')[1];
      
      setSelectedPlayers(prevPositions => {
        const updatedPositions = [...prevPositions];
        const sourcePos = updatedPositions.find(pos => pos.id === sourcePositionId);
        const destPos = updatedPositions.find(pos => pos.id === destPositionId);
        
        if (sourcePos && destPos) {
          const tempPlayerId = sourcePos.playerId;
          sourcePos.playerId = destPos.playerId;
          destPos.playerId = tempPlayerId;
        }
        
        return updatedPositions;
      });
    }
  };

  // Create the save lineup mutation
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

  const getPlayerById = (id: number | null) => {
    if (id === null) return null;
    return teamMembers?.find(player => player.userId === id) || null;
  };

  const getPositionLabel = (id: string) => {
    switch(id) {
      case 'gk': return 'GK';
      case 'lb': return 'LB';
      case 'lcb': return 'LCB';
      case 'cb': return 'CB';
      case 'rcb': return 'RCB';
      case 'rb': return 'RB';
      case 'lwb': return 'LWB';
      case 'rwb': return 'RWB';
      case 'cdm': return 'CDM';
      case 'lm': return 'LM';
      case 'lcm': return 'LCM';
      case 'cm': return 'CM';
      case 'rcm': return 'RCM';
      case 'rm': return 'RM';
      case 'cam': return 'CAM';
      case 'lw': return 'LW';
      case 'rw': return 'RW';
      case 'ls': return 'LS';
      case 'st': return 'ST';
      case 'rs': return 'RS';
      default: return id.toUpperCase();
    }
  };

  // Add load lineup function
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
      const positionsData = typeof lineup.positions === 'string' 
        ? JSON.parse(lineup.positions) 
        : lineup.positions;
        
      // Make sure player IDs are properly handled as numbers, not strings
      const formattedPositions = positionsData.map((pos: any) => ({
        ...pos,
        playerId: pos.playerId === null ? null : Number(pos.playerId)
      }));
      
      setSelectedPlayers(formattedPositions);
      
      toast({
        title: "Lineup Loaded",
        description: `${lineup.name} has been loaded successfully.`,
      });
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
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="container p-4 md:p-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left panel - Field */}
          <div className="flex-1 md:w-2/3">
            <Card className="mb-6">
              <CardContent className="p-4">
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
                
                <div className="relative w-full mt-4 mb-6">
                  <SoccerField>
                    {selectedPlayers.map((position) => (
                      <div 
                        key={position.id}
                        className="absolute"
                        style={{
                          left: `${position.x}%`,
                          top: `${position.y}%`,
                          transform: 'translate(-50%, -50%)',
                          width: '60px',
                          height: '60px',
                          zIndex: 10
                        }}
                      >
                        {/* Position label (always visible) */}
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 font-bold text-xs bg-white/70 px-1 rounded z-20">
                          {getPositionLabel(position.id)}
                        </div>
                        
                        {/* Droppable area */}
                        <Droppable
                          droppableId={`position-${position.id}`}
                          isDropDisabled={false}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`absolute inset-0 rounded-full flex items-center justify-center 
                                ${snapshot.isDraggingOver ? "bg-primary/20 border-2 border-primary" : ""}
                              `}
                              style={{ zIndex: snapshot.isDraggingOver ? 20 : 10 }}
                            >
                              {position.playerId !== null ? (
                                <Draggable
                                  draggableId={`player-${position.playerId}`}
                                  index={0}
                                >
                                  {(provided, snapshot) => {
                                    const player = getPlayerById(position.playerId);
                                    return (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="z-30"
                                        style={{
                                          ...provided.draggableProps.style,
                                          width: '54px',
                                          height: '54px'
                                        }}
                                      >
                                        <div className="w-[54px] h-[54px] bg-accent rounded-full flex items-center justify-center text-white border-2 border-white shadow-md">
                                          <div className="flex flex-col items-center">
                                            <span className="text-xs font-bold">
                                              {player?.jerseyNumber || "?"}
                                            </span>
                                            <span className="text-[10px] leading-tight max-w-[50px] truncate">
                                              {player ? 
                                                player.user?.fullName?.split(" ")[1] || player.user?.fullName || `Player ${player.userId}` :
                                                "Empty"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }}
                                </Draggable>
                              ) : (
                                <div className="w-[54px] h-[54px] bg-white/30 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                                  <div className="text-xs font-bold text-gray-500">
                                    {getPositionLabel(position.id)}
                                  </div>
                                </div>
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    ))}
                  </SoccerField>
                </div>
                
                <div className="flex justify-center">
                  <Button onClick={handleSaveLineup} className="px-8">
                    Save Lineup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right panel - Available Players */}
          <div className="md:w-1/3">
            <div className="space-y-4">
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
                            <div className="text-xs text-gray-500">{lineup.formation} formation</div>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleLoadLineup(lineup.id)}
                            >
                              Load
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive" 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete "${lineup.name}"?`)) {
                                  fetch(`/api/teams/${teamId}/lineups/${lineup.id}`, {
                                    method: 'DELETE',
                                  })
                                  .then(response => {
                                    if (response.ok) {
                                      if (selectedLineupId === lineup.id) {
                                        setSelectedLineupId(null);
                                        setLineupName("New Lineup");
                                        setFormation("4-4-2");
                                        // Create a deep copy of the default positions to ensure clean state
                                        const freshPositions = JSON.parse(JSON.stringify(DEFAULT_FORMATIONS["4-4-2"].positions));
                                        setSelectedPlayers(freshPositions);
                                      }
                                      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/lineups`] });
                                      toast({
                                        title: "Lineup Deleted",
                                        description: `${lineup.name} has been deleted.`,
                                      });
                                    } else {
                                      throw new Error('Failed to delete lineup');
                                    }
                                  })
                                  .catch(error => {
                                    console.error('Error deleting lineup:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to delete lineup",
                                      variant: "destructive",
                                    });
                                  });
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
                        setSelectedLineupId(null);
                        setLineupName("New Lineup");
                        setFormation("4-4-2");
                        // Create a deep copy of the default positions to ensure clean state
                        const freshPositions = JSON.parse(JSON.stringify(DEFAULT_FORMATIONS["4-4-2"].positions));
                        setSelectedPlayers(freshPositions);
                        
                        // Tell the user that a new lineup has been created
                        toast({
                          title: "New Lineup",
                          description: "Started a new lineup with 4-4-2 formation."
                        });
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
                  
                  <Droppable droppableId="available-players">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 max-h-[400px] overflow-y-auto pr-2"
                      >
                        {availablePlayers.map((player, index) => (
                          <Draggable
                            key={player.userId}
                            draggableId={`player-${player.userId}`}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <PlayerCard
                                  player={player}
                                  isSelected={selectedPlayers.some(pos => pos.playerId === player.userId)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {availablePlayers.length === 0 && (
                          <div className="text-center py-4 text-gray-500">
                            No players available
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}
