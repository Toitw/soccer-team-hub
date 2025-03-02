import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PlayerStat } from "@shared/schema";

interface TopPerformersProps {
  teamId: number;
}

interface PlayerWithStats {
  userId: number;
  name: string;
  profilePicture: string;
  goals: number;
  assists: number;
}

export default function TopPerformers({ teamId }: TopPerformersProps) {
  // For a real implementation, fetch player stats from API
  // This is mocked for demonstration
  const topPerformers: PlayerWithStats[] = [
    {
      userId: 3,
      name: "Marcus Rashford",
      profilePicture: "https://ui-avatars.com/api/?name=Marcus+Rashford&background=FFC107&color=fff",
      goals: 9,
      assists: 3
    },
    {
      userId: 4,
      name: "Bruno Fernandes",
      profilePicture: "https://ui-avatars.com/api/?name=Bruno+Fernandes&background=FFC107&color=fff",
      goals: 7,
      assists: 5
    },
    {
      userId: 5,
      name: "Jadon Sancho",
      profilePicture: "https://ui-avatars.com/api/?name=Jadon+Sancho&background=FFC107&color=fff",
      goals: 4,
      assists: 6
    }
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Top Performers</h2>
          <div
            onClick={() => window.location.href = '/statistics'}
            className="text-sm text-primary cursor-pointer"
          >
            View All
          </div>
        </div>
        
        <div className="space-y-4">
          {topPerformers.map(player => (
            <div key={player.userId} className="flex items-center space-x-3">
              <div className="relative">
                <img 
                  src={player.profilePicture} 
                  alt={player.name} 
                  className="w-12 h-12 rounded-full object-cover" 
                />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs flex items-center justify-center rounded-full">
                  {player.goals}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h3 className="font-medium">{player.name}</h3>
                  <span className="text-sm font-semibold text-accent">{player.goals} Goals</span>
                </div>
                <div className="mt-1">
                  <div className="h-2 w-full bg-gray-200 rounded">
                    <div 
                      className="h-full bg-accent rounded" 
                      style={{ width: `${Math.min(100, player.goals * 10)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
