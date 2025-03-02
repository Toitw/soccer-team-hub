import { TeamMember } from "@shared/schema";

interface PlayerCardProps {
  player: TeamMember & {
    position?: string | null;
    jerseyNumber?: number | null;
  };
  isSelected: boolean;
}

export default function PlayerCard({ player, isSelected }: PlayerCardProps) {
  const firstName = player.fullName?.split(" ")[0] || "";
  const lastName = player.fullName?.split(" ").slice(1).join(" ") || "";
  
  return (
    <div 
      className={`p-3 border rounded-lg mb-2 flex items-center 
        ${isSelected ? "border-primary bg-primary/5" : "border-gray-200 bg-white"}
        ${isSelected ? "opacity-50" : "opacity-100"}
      `}
    >
      <div className="flex items-center space-x-3 flex-1">
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-accent text-white border-2 border-white">
            {player.jerseyNumber || "?"}
          </div>
          {player.position && (
            <div className="absolute -bottom-1 -right-1 text-xs bg-gray-100 px-1 rounded border border-gray-300">
              {player.position}
            </div>
          )}
        </div>
        <div>
          <p className="font-medium text-sm">{firstName} <span className="font-bold">{lastName}</span></p>
          <p className="text-xs text-gray-500">{player.position || "No position"}</p>
        </div>
      </div>
      {isSelected ? (
        <span className="text-xs text-primary font-medium">On field</span>
      ) : (
        <span className="text-xs text-gray-400">Drag to field</span>
      )}
    </div>
  );
}