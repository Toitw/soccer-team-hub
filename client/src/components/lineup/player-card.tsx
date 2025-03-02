import { Card, CardContent } from "@/components/ui/card";
import { UserIcon } from "lucide-react";
import { TeamMember } from "@shared/schema";

interface PlayerCardProps {
  player: TeamMember & {
    position?: string | null;
    jerseyNumber?: number | null;
    user?: {
      fullName: string;
      profilePicture?: string;
    };
  };
  isSelected: boolean;
}

export default function PlayerCard({ player, isSelected }: PlayerCardProps) {
  return (
    <Card className={`transition-all duration-200 ${isSelected ? 'opacity-50' : 'opacity-100'}`}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          {player.jerseyNumber ? (
            <span className="font-semibold text-lg">{player.jerseyNumber}</span>
          ) : (
            <UserIcon className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <div className="font-medium truncate">
            {player.user?.fullName || `Player ${player.userId}`}
          </div>
          <div className="text-xs text-gray-500">
            {player.position || 'No position'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}