import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Match, TeamMember } from "@shared/schema";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Users, UserPlus } from "lucide-react";

const lineupSchema = z.object({
  formation: z.string().min(1, "Formation is required"),
  playerIds: z.array(z.number()),
  benchPlayerIds: z.array(z.number()).optional(),
  positionMapping: z.record(z.number()).optional()
});

interface MatchDetailsProps {
  match: Match;
  teamId: number;
  onUpdate: () => void;
}

// Get available formations based on team type
const getAvailableFormations = (teamType?: string) => {
  if (teamType === "7-a-side") {
    return ["7a-2-3-1", "7a-3-2-1", "7a-2-2-2"];
  } else if (teamType === "Futsal") {
    return ["5a-1-2-1", "5a-2-1-1", "5a-1-3-0"];
  } else {
    return ["4-4-2", "4-3-3", "3-5-2", "5-3-2"];
  }
};

// Function to calculate player positions based on formation
const getPositionsByFormation = (formation: string) => {
  const positions: {
    id: string;
    label: string;
    top: number;
    left: number;
  }[] = [];
  
  const isSevenASide = formation.startsWith("7a-");
  const isFutsalOrFiveASide = formation.startsWith("5a-");
  
  if (isSevenASide) {
    const pattern = formation.substring(3);
    const [defenders, midfielders, forwards] = pattern.split("-").map(Number);
    
    positions.push({ id: "gk", label: "GK", top: 82, left: 50 });
    
    const defenderWidth = 90 / (defenders + 1);
    for (let i = 1; i <= defenders; i++) {
      positions.push({
        id: `def-${i}`,
        label: "DEF",
        top: 60,
        left: 5 + i * defenderWidth,
      });
    }
    
    const midfielderWidth = 90 / (midfielders + 1);
    for (let i = 1; i <= midfielders; i++) {
      positions.push({
        id: `mid-${i}`,
        label: "MID",
        top: 35,
        left: 5 + i * midfielderWidth,
      });
    }
    
    const forwardWidth = 90 / (forwards + 1);
    for (let i = 1; i <= forwards; i++) {
      positions.push({
        id: `fwd-${i}`,
        label: "FWD",
        top: 10,
        left: 5 + i * forwardWidth,
      });
    }
  } else if (isFutsalOrFiveASide) {
    const pattern = formation.substring(3);
    const [defenders, midfielders, forwards] = pattern.split("-").map(Number);

    positions.push({ id: "gk", label: "GK", top: 82, left: 50 });

    const defenderWidth = 90 / (defenders + 1);
    for (let i = 1; i <= defenders; i++) {
      positions.push({
        id: `def-${i}`,
        label: "DEF",
        top: 60,
        left: 5 + i * defenderWidth,
      });
    }

    const midfielderWidth = 90 / (midfielders + 1);
    for (let i = 1; i <= midfielders; i++) {
      positions.push({
        id: `mid-${i}`,
        label: "MID",
        top: 35,
        left: 5 + i * midfielderWidth,
      });
    }

    const forwardWidth = 90 / (forwards + 1);
    for (let i = 1; i <= forwards; i++) {
      positions.push({
        id: `fwd-${i}`,
        label: "FWD",
        top: 10,
        left: 5 + i * forwardWidth,
      });
    }
  } else {
    // 11-a-side formations
    const [defenders, midfielders, forwards] = formation.split("-").map(Number);
    positions.push({ id: "gk", label: "GK", top: 82, left: 50 });
    
    const defenderWidth = 90 / (defenders + 1);
    for (let i = 1; i <= defenders; i++) {
      positions.push({
        id: `def-${i}`,
        label: "DEF",
        top: 60,
        left: 5 + i * defenderWidth,
      });
    }
    
    const midfielderWidth = 80 / (midfielders + 1);
    for (let i = 1; i <= midfielders; i++) {
      positions.push({
        id: `mid-${i}`,
        label: "MID",
        top: 35,
        left: 10 + i * midfielderWidth,
      });
    }
    
    const forwardWidth = 80 / (forwards + 1);
    for (let i = 1; i <= forwards; i++) {
      positions.push({
        id: `fwd-${i}`,
        label: "FWD",
        top: 10,
        left: 10 + i * forwardWidth,
      });
    }
  }
  
  return positions;
};

export default function MatchDetails({ match, teamId, onUpdate }: MatchDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("lineup");
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [lineupPositions, setLineupPositions] = useState<{
    [position: string]: TeamMember | null;
  }>({});

  // Queries
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: [`/api/teams/${teamId}/members`],
  });

  const { data: teamData } = useQuery({
    queryKey: [`/api/teams/${teamId}`],
  });

  const { data: lineup } = useQuery({
    queryKey: [`/api/teams/${teamId}/matches/${match.id}/lineup`],
  });

  // Get default formation based on team type
  const getDefaultFormation = () => {
    if (teamData?.teamType === "7-a-side") {
      return "7a-2-3-1";
    } else if (teamData?.teamType === "Futsal") {
      return "5a-1-2-1";
    } else {
      return "4-4-2";
    }
  };

  const lineupForm = useForm<z.infer<typeof lineupSchema>>({
    resolver: zodResolver(lineupSchema),
    defaultValues: {
      formation: lineup?.formation || getDefaultFormation(),
      playerIds: lineup?.players?.map(p => p.id) || [],
      benchPlayerIds: lineup?.benchPlayers?.map(p => p.id) || []
    }
  });

  const availableFormations = getAvailableFormations(teamData?.teamType);
  const fieldPositions = getPositionsByFormation(lineupForm.watch("formation"));

  // Handle position click
  const handlePositionClick = (positionId: string) => {
    setSelectedPosition(positionId);
  };

  // Add player to position
  const addPlayerToPosition = (member: TeamMember) => {
    if (selectedPosition) {
      setLineupPositions(prev => ({
        ...prev,
        [selectedPosition]: member
      }));
      
      const currentIds = lineupForm.getValues().playerIds;
      if (!currentIds.includes(member.id)) {
        lineupForm.setValue('playerIds', [...currentIds, member.id]);
      }
      
      setSelectedPosition(null);
    }
  };

  // Remove player from position
  const removePlayerFromPosition = (positionId: string) => {
    const player = lineupPositions[positionId];
    if (player) {
      const currentIds = lineupForm.getValues().playerIds;
      lineupForm.setValue('playerIds', currentIds.filter(id => id !== player.id));
      
      setLineupPositions(prev => {
        const newPositions = { ...prev };
        delete newPositions[positionId];
        return newPositions;
      });
    }
  };

  // Add player to bench
  const addPlayerToBench = (member: TeamMember) => {
    const currentBenchIds = lineupForm.getValues().benchPlayerIds || [];
    if (!currentBenchIds.includes(member.id)) {
      lineupForm.setValue('benchPlayerIds', [...currentBenchIds, member.id]);
    }
  };

  // Remove player from bench
  const removePlayerFromBench = (member: TeamMember) => {
    const currentBenchIds = lineupForm.getValues().benchPlayerIds || [];
    lineupForm.setValue('benchPlayerIds', currentBenchIds.filter(id => id !== member.id));
  };

  // Save lineup mutation
  const saveLineup = useMutation({
    mutationFn: async (data: z.infer<typeof lineupSchema>) => {
      const positionMapping: { [key: string]: number } = {};
      Object.entries(lineupPositions).forEach(([positionId, member]) => {
        if (member) {
          positionMapping[positionId] = member.id;
        }
      });

      const response = await apiRequest(`/api/teams/${teamId}/matches/${match.id}/lineup`, {
        method: "POST",
        data: {
          ...data,
          positionMapping
        }
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/matches/${match.id}/lineup`] });
      toast({
        title: "Lineup saved",
        description: "The match lineup has been saved successfully.",
      });
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Error saving lineup",
        description: error.message || "There was an error saving the lineup.",
        variant: "destructive",
      });
    }
  });

  const handleLineupSubmit = (data: z.infer<typeof lineupSchema>) => {
    saveLineup.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Match Details</span>
          <div className="text-sm font-normal flex items-center">
            <span className="mr-2">Score:</span>
            <Badge className="bg-green-500">{match.goalsScored || 0} - {match.goalsConceded || 0}</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          {format(new Date(match.matchDate), "EEEE, MMMM d, yyyy 'at' h:mm a")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 min-h-[45px]">
            <TabsTrigger value="lineup">
              Alineación
            </TabsTrigger>
            <TabsTrigger value="substitutions">
              Sustituciones
            </TabsTrigger>
            <TabsTrigger value="goals">
              Goles
            </TabsTrigger>
            <TabsTrigger value="cards">
              Tarjetas
            </TabsTrigger>
          </TabsList>

          {/* Lineup Tab */}
          <TabsContent value="lineup" className="py-4">
            <Form {...lineupForm}>
              <form onSubmit={lineupForm.handleSubmit(handleLineupSubmit)} className="space-y-4">
                {/* Formation Selector */}
                <FormField
                  control={lineupForm.control}
                  name="formation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formación</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setLineupPositions({});
                          }}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Seleccionar formación" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFormations.map((formation) => (
                              <SelectItem key={formation} value={formation}>
                                {formation}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Soccer Field */}
                  <div className="lg:col-span-3">
                    <div className="relative bg-gradient-to-b from-green-700 to-green-900 w-full rounded-md overflow-hidden" style={{ height: '500px' }}>
                      <div className="absolute top-0 left-0 w-full h-full">
                        <div className="border-2 border-white border-b-0 mx-4 mt-4 h-full rounded-t-md relative">
                          {/* Soccer field markings based on team type */}
                          {lineupForm.watch("formation").startsWith("7a-") ? (
                            <>
                              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-16 border-2 border-t-0 border-white rounded-b-full"></div>
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-24 w-48 border-2 border-b-0 border-white"></div>
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-12 w-24 border-2 border-b-0 border-white"></div>
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-16 bg-white"></div>
                              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                7-a-side
                              </div>
                            </>
                          ) : lineupForm.watch("formation").startsWith("5a-") ? (
                            <>
                              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-28 h-14 border-2 border-t-0 border-white rounded-b-full"></div>
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-20 w-40 border-2 border-b-0 border-white"></div>
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-10 w-20 border-2 border-b-0 border-white"></div>
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-12 bg-white"></div>
                              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                Futsal
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-20 border-2 border-t-0 border-white rounded-b-full"></div>
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-32 w-64 border-2 border-b-0 border-white"></div>
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-16 w-32 border-2 border-b-0 border-white"></div>
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-2 w-20 bg-white"></div>
                              <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-white rounded-full"></div>
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
                              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                11-a-side
                              </div>
                            </>
                          )}
                          
                          {/* Player positions on field */}
                          {fieldPositions.map((position) => {
                            const player = lineupPositions[position.id];
                            return (
                              <div
                                key={position.id}
                                className={`absolute group cursor-pointer transform -translate-x-1/2 -translate-y-1/2 ${
                                  selectedPosition === position.id ? "z-10" : ""
                                }`}
                                style={{
                                  top: `${position.top}%`,
                                  left: `${position.left}%`,
                                }}
                                onClick={() => handlePositionClick(position.id)}
                              >
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg transition-all ${
                                    player
                                      ? "scale-100"
                                      : "scale-90 opacity-70"
                                  } ${
                                    position.label === "GK"
                                      ? "bg-blue-500"
                                      : position.label === "DEF"
                                        ? "bg-red-500"
                                        : position.label === "MID"
                                          ? "bg-green-500"
                                          : "bg-yellow-500"
                                  } hover:scale-110 hover:opacity-100`}
                                >
                                  {player ? (
                                    <span className="font-bold text-sm">
                                      {player.jerseyNumber || "?"}
                                    </span>
                                  ) : (
                                    <Plus className="w-4 h-4 opacity-50" />
                                  )}
                                </div>
                                
                                {/* Player tooltip */}
                                {player && (
                                  <div className="opacity-0 bg-black text-white text-xs rounded py-1 px-2 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none group-hover:opacity-100 whitespace-nowrap shadow-lg z-50">
                                    {player.fullName}
                                  </div>
                                )}
                                
                                {/* Position label tooltip */}
                                {!player && (
                                  <div className="opacity-0 bg-gray-800 text-white text-xs rounded py-1 px-2 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none group-hover:opacity-100 whitespace-nowrap shadow-lg z-50">
                                    {position.label}
                                  </div>
                                )}
                                
                                {/* Remove player button */}
                                {player && (
                                  <div
                                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removePlayerFromPosition(position.id);
                                    }}
                                  >
                                    <X className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {/* Position Legend */}
                    <div className="mt-4 flex justify-center">
                      <div className="flex space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                          <span>Portero</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                          <span>Defensa</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                          <span>Centrocampista</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                          <span>Delantero</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sidebar with bench and available players */}
                  <div className="lg:col-span-1 space-y-4">
                    {/* Bench Players Section */}
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-3 flex items-center text-gray-700">
                        <Users className="mr-2 h-4 w-4" />
                        Banquillo
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {teamMembers
                          ?.filter(m => {
                            const benchIds = lineupForm.getValues().benchPlayerIds || [];
                            return benchIds.includes(m.id);
                          })
                          .map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                            >
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium">
                                    {member.jerseyNumber || "?"}
                                  </span>
                                </div>
                                <span className="text-sm font-medium">{member.fullName}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removePlayerFromBench(member)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        {(!lineupForm.getValues().benchPlayerIds || lineupForm.getValues().benchPlayerIds.length === 0) && (
                          <div className="text-gray-500 text-sm text-center py-4">
                            Sin jugadores en el banquillo
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Available Players Section */}
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-3 flex items-center text-gray-700">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Disponibles
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {teamMembers
                          ?.filter((m) => {
                            const isInLineup = Object.values(lineupPositions).some(p => p?.id === m.id);
                            const benchIds = lineupForm.getValues().benchPlayerIds || [];
                            const isOnBench = benchIds.includes(m.id);
                            return m.role === "player" && !isInLineup && !isOnBench;
                          })
                          .map((member) => (
                            <div
                              key={member.id}
                              className={`flex items-center justify-between p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 ${
                                selectedPosition ? "border-2 border-blue-200" : ""
                              }`}
                              onClick={() => selectedPosition ? addPlayerToPosition(member) : addPlayerToBench(member)}
                            >
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium">
                                    {member.jerseyNumber || "?"}
                                  </span>
                                </div>
                                <span className="text-sm font-medium">{member.fullName}</span>
                              </div>
                              {!selectedPosition && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addPlayerToBench(member);
                                  }}
                                  className="text-blue-500 hover:text-blue-700"
                                  title="Añadir al banquillo"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        {teamMembers?.filter((m) => {
                          const isInLineup = Object.values(lineupPositions).some(p => p?.id === m.id);
                          const benchIds = lineupForm.getValues().benchPlayerIds || [];
                          const isOnBench = benchIds.includes(m.id);
                          return m.role === "player" && !isInLineup && !isOnBench;
                        }).length === 0 && (
                          <div className="text-gray-500 text-sm text-center py-4">
                            Todos los jugadores están asignados
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {selectedPosition && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-700 font-medium">
                          Selecciona un jugador para la posición: {selectedPosition}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedPosition(null)}
                          className="text-blue-500 text-xs mt-1 hover:underline"
                        >
                          Cancelar selección
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="submit" disabled={saveLineup.isPending}>
                    {saveLineup.isPending ? "Guardando..." : "Guardar Alineación"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Other tabs placeholder */}
          <TabsContent value="substitutions" className="py-4">
            <div className="text-center py-8 text-gray-500">
              <p>Funcionalidad de sustituciones próximamente</p>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="py-4">
            <div className="text-center py-8 text-gray-500">
              <p>Funcionalidad de goles próximamente</p>
            </div>
          </TabsContent>

          <TabsContent value="cards" className="py-4">
            <div className="text-center py-8 text-gray-500">
              <p>Funcionalidad de tarjetas próximamente</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}