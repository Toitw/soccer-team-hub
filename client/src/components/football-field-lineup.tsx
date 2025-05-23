import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Save, RotateCcw } from 'lucide-react';

// Formation templates with position coordinates (percentage-based for responsive design)
const FORMATIONS = {
  '4-4-2': {
    name: '4-4-2',
    positions: [
      { id: 'GK', name: 'GK', x: 50, y: 5, position: 'Goalkeeper' },
      { id: 'LB', name: 'LB', x: 15, y: 25, position: 'Left Back' },
      { id: 'CB1', name: 'CB', x: 35, y: 25, position: 'Center Back' },
      { id: 'CB2', name: 'CB', x: 65, y: 25, position: 'Center Back' },
      { id: 'RB', name: 'RB', x: 85, y: 25, position: 'Right Back' },
      { id: 'LM', name: 'LM', x: 15, y: 50, position: 'Left Midfielder' },
      { id: 'CM1', name: 'CM', x: 35, y: 50, position: 'Center Midfielder' },
      { id: 'CM2', name: 'CM', x: 65, y: 50, position: 'Center Midfielder' },
      { id: 'RM', name: 'RM', x: 85, y: 50, position: 'Right Midfielder' },
      { id: 'ST1', name: 'ST', x: 35, y: 75, position: 'Striker' },
      { id: 'ST2', name: 'ST', x: 65, y: 75, position: 'Striker' }
    ]
  },
  '4-3-3': {
    name: '4-3-3',
    positions: [
      { id: 'GK', name: 'GK', x: 50, y: 5, position: 'Goalkeeper' },
      { id: 'LB', name: 'LB', x: 15, y: 25, position: 'Left Back' },
      { id: 'CB1', name: 'CB', x: 35, y: 25, position: 'Center Back' },
      { id: 'CB2', name: 'CB', x: 65, y: 25, position: 'Center Back' },
      { id: 'RB', name: 'RB', x: 85, y: 25, position: 'Right Back' },
      { id: 'CM1', name: 'CM', x: 25, y: 50, position: 'Center Midfielder' },
      { id: 'CM2', name: 'CM', x: 50, y: 50, position: 'Center Midfielder' },
      { id: 'CM3', name: 'CM', x: 75, y: 50, position: 'Center Midfielder' },
      { id: 'LW', name: 'LW', x: 20, y: 75, position: 'Left Winger' },
      { id: 'ST', name: 'ST', x: 50, y: 75, position: 'Striker' },
      { id: 'RW', name: 'RW', x: 80, y: 75, position: 'Right Winger' }
    ]
  },
  '3-5-2': {
    name: '3-5-2',
    positions: [
      { id: 'GK', name: 'GK', x: 50, y: 5, position: 'Goalkeeper' },
      { id: 'CB1', name: 'CB', x: 25, y: 25, position: 'Center Back' },
      { id: 'CB2', name: 'CB', x: 50, y: 25, position: 'Center Back' },
      { id: 'CB3', name: 'CB', x: 75, y: 25, position: 'Center Back' },
      { id: 'LWB', name: 'LWB', x: 10, y: 50, position: 'Left Wing Back' },
      { id: 'CM1', name: 'CM', x: 30, y: 50, position: 'Center Midfielder' },
      { id: 'CM2', name: 'CM', x: 50, y: 50, position: 'Center Midfielder' },
      { id: 'CM3', name: 'CM', x: 70, y: 50, position: 'Center Midfielder' },
      { id: 'RWB', name: 'RWB', x: 90, y: 50, position: 'Right Wing Back' },
      { id: 'ST1', name: 'ST', x: 40, y: 75, position: 'Striker' },
      { id: 'ST2', name: 'ST', x: 60, y: 75, position: 'Striker' }
    ]
  }
};

interface Player {
  id: number;
  fullName: string;
}

interface FieldPosition {
  id: string;
  name: string;
  x: number;
  y: number;
  position: string;
  playerId?: number;
}

interface FootballFieldLineupProps {
  players: Player[];
  initialLineup?: {
    formation: string;
    positionMapping: Record<string, number>;
    benchPlayerIds: number[];
  };
  onSave: (lineup: {
    formation: string;
    positionMapping: Record<string, number>;
    playerIds: number[];
    benchPlayerIds: number[];
  }) => void;
  isLoading?: boolean;
}

export default function FootballFieldLineup({ 
  players, 
  initialLineup, 
  onSave, 
  isLoading = false 
}: FootballFieldLineupProps) {
  const [formation, setFormation] = useState<string>(initialLineup?.formation || '4-4-2');
  const [fieldPositions, setFieldPositions] = useState<FieldPosition[]>([]);
  const [benchPlayers, setBenchPlayers] = useState<Player[]>([]);
  const [unselectedPlayers, setUnselectedPlayers] = useState<Player[]>([]);

  // Initialize positions and player distribution
  useEffect(() => {
    const formationData = FORMATIONS[formation as keyof typeof FORMATIONS];
    if (!formationData) return;

    let newFieldPositions = formationData.positions.map(pos => ({ ...pos, playerId: undefined }));
    let newBenchPlayers: Player[] = [];
    let newUnselectedPlayers = [...players];

    // If we have initial lineup data, distribute players accordingly
    if (initialLineup) {
      // Place players on field positions
      Object.entries(initialLineup.positionMapping || {}).forEach(([positionId, playerId]) => {
        const positionIndex = newFieldPositions.findIndex(p => p.id === positionId);
        if (positionIndex !== -1) {
          newFieldPositions[positionIndex].playerId = playerId;
          newUnselectedPlayers = newUnselectedPlayers.filter(p => p.id !== playerId);
        }
      });

      // Place players on bench
      initialLineup.benchPlayerIds?.forEach(playerId => {
        const player = players.find(p => p.id === playerId);
        if (player) {
          newBenchPlayers.push(player);
          newUnselectedPlayers = newUnselectedPlayers.filter(p => p.id !== playerId);
        }
      });
    }

    setFieldPositions(newFieldPositions);
    setBenchPlayers(newBenchPlayers);
    setUnselectedPlayers(newUnselectedPlayers);
  }, [formation, players, initialLineup]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const playerId = parseInt(draggableId);
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    // Remove player from source
    if (source.droppableId.startsWith('position-')) {
      const positionId = source.droppableId.replace('position-', '');
      setFieldPositions(prev => 
        prev.map(pos => pos.id === positionId ? { ...pos, playerId: undefined } : pos)
      );
    } else if (source.droppableId === 'bench') {
      setBenchPlayers(prev => prev.filter(p => p.id !== playerId));
    } else if (source.droppableId === 'unselected') {
      setUnselectedPlayers(prev => prev.filter(p => p.id !== playerId));
    }

    // Add player to destination
    if (destination.droppableId.startsWith('position-')) {
      const positionId = destination.droppableId.replace('position-', '');
      setFieldPositions(prev => 
        prev.map(pos => {
          if (pos.id === positionId) {
            // If position was occupied, move that player to unselected
            if (pos.playerId) {
              const displacedPlayer = players.find(p => p.id === pos.playerId);
              if (displacedPlayer) {
                setUnselectedPlayers(current => [...current, displacedPlayer]);
              }
            }
            return { ...pos, playerId };
          }
          return pos;
        })
      );
    } else if (destination.droppableId === 'bench') {
      setBenchPlayers(prev => [...prev, player]);
    } else if (destination.droppableId === 'unselected') {
      setUnselectedPlayers(prev => [...prev, player]);
    }
  };

  const handleFormationChange = (newFormation: string) => {
    // Move all field players back to unselected when changing formation
    const currentFieldPlayers = fieldPositions
      .filter(pos => pos.playerId)
      .map(pos => players.find(p => p.id === pos.playerId))
      .filter(Boolean) as Player[];
    
    setUnselectedPlayers(prev => [...prev, ...currentFieldPlayers]);
    setFormation(newFormation);
  };

  const handleSave = () => {
    const positionMapping: Record<string, number> = {};
    fieldPositions.forEach(pos => {
      if (pos.playerId) {
        positionMapping[pos.id] = pos.playerId;
      }
    });

    const playerIds = fieldPositions
      .map(pos => pos.playerId)
      .filter(Boolean) as number[];

    const benchPlayerIds = benchPlayers.map(p => p.id);

    onSave({
      formation,
      positionMapping,
      playerIds,
      benchPlayerIds
    });
  };

  const handleReset = () => {
    const formationData = FORMATIONS[formation as keyof typeof FORMATIONS];
    setFieldPositions(formationData.positions.map(pos => ({ ...pos, playerId: undefined })));
    setBenchPlayers([]);
    setUnselectedPlayers([...players]);
  };

  const getPlayerName = (player: Player) => player.fullName || `Player ${player.id}`;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* Formation Selector and Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Formation:</label>
            <Select value={formation} onValueChange={handleFormationChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(FORMATIONS).map(form => (
                  <SelectItem key={form} value={form}>{form}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleReset} size="sm">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={isLoading} size="sm">
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Lineup'}
            </Button>
          </div>
        </div>

        {/* Football Field */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Field */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-4">
                <div 
                  className="relative w-full bg-green-100 border-2 border-white rounded-lg"
                  style={{ 
                    aspectRatio: '2/3',
                    backgroundImage: `
                      linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px),
                      linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }}
                >
                  {/* Field markings */}
                  <div className="absolute inset-0">
                    {/* Center circle */}
                    <div 
                      className="absolute border-2 border-white rounded-full"
                      style={{ 
                        width: '20%', 
                        height: '13%', 
                        left: '40%', 
                        top: '43.5%' 
                      }}
                    />
                    {/* Goal areas */}
                    <div 
                      className="absolute border-2 border-white"
                      style={{ 
                        width: '40%', 
                        height: '12%', 
                        left: '30%', 
                        top: '0%' 
                      }}
                    />
                    <div 
                      className="absolute border-2 border-white"
                      style={{ 
                        width: '40%', 
                        height: '12%', 
                        left: '30%', 
                        bottom: '0%' 
                      }}
                    />
                  </div>

                  {/* Player Positions */}
                  {fieldPositions.map((position) => (
                    <Droppable key={position.id} droppableId={`position-${position.id}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`absolute w-16 h-16 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center text-xs font-medium transition-colors ${
                            snapshot.isDraggingOver ? 'bg-blue-200 border-blue-400' : 'bg-white/80'
                          }`}
                          style={{
                            left: `calc(${position.x}% - 32px)`,
                            top: `calc(${position.y}% - 32px)`,
                          }}
                        >
                          {position.playerId ? (
                            <Draggable draggableId={position.playerId.toString()} index={0}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`w-full h-full rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold cursor-move ${
                                    snapshot.isDragging ? 'shadow-lg scale-105' : ''
                                  }`}
                                  title={getPlayerName(players.find(p => p.id === position.playerId)!)}
                                >
                                  {position.name}
                                </div>
                              )}
                            </Draggable>
                          ) : (
                            <span className="text-gray-500">{position.name}</span>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Player Lists */}
          <div className="space-y-4">
            {/* Bench */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Bench ({benchPlayers.length})
                </h3>
                <Droppable droppableId="bench">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-24 p-2 rounded border-2 border-dashed transition-colors ${
                        snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                      }`}
                    >
                      <div className="space-y-2">
                        {benchPlayers.map((player, index) => (
                          <Draggable key={player.id} draggableId={player.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`transition-transform ${
                                  snapshot.isDragging ? 'scale-105' : ''
                                }`}
                              >
                                <Badge variant="secondary" className="cursor-move">
                                  {getPlayerName(player)}
                                </Badge>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                      {provided.placeholder}
                      {benchPlayers.length === 0 && (
                        <p className="text-sm text-gray-500 text-center">
                          Drag players here for bench
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>

            {/* Unselected Players */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Available ({unselectedPlayers.length})
                </h3>
                <Droppable droppableId="unselected">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-32 p-2 rounded border-2 border-dashed transition-colors ${
                        snapshot.isDraggingOver ? 'border-green-400 bg-green-50' : 'border-gray-300'
                      }`}
                    >
                      <div className="space-y-2">
                        {unselectedPlayers.map((player, index) => (
                          <Draggable key={player.id} draggableId={player.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`transition-transform ${
                                  snapshot.isDragging ? 'scale-105' : ''
                                }`}
                              >
                                <Badge variant="outline" className="cursor-move">
                                  {getPlayerName(player)}
                                </Badge>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                      {provided.placeholder}
                      {unselectedPlayers.length === 0 && (
                        <p className="text-sm text-gray-500 text-center">
                          All players assigned
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-2xl font-bold text-blue-600">
              {fieldPositions.filter(pos => pos.playerId).length}/11
            </div>
            <div className="text-sm text-gray-600">On Field</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded">
            <div className="text-2xl font-bold text-yellow-600">{benchPlayers.length}</div>
            <div className="text-sm text-gray-600">On Bench</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-2xl font-bold text-gray-600">{unselectedPlayers.length}</div>
            <div className="text-sm text-gray-600">Not Selected</div>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}