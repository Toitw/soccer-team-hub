
import { useTranslation } from '@/hooks/use-translation';

interface Classification {
  id: number;
  position: number | null;
  externalTeamName: string;
  gamesPlayed: number | null;
  gamesWon: number | null;
  gamesDrawn: number | null;
  gamesLost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  points: number | null;
}

interface ClassificationTableProps {
  classifications: Classification[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function ClassificationTable({ 
  classifications, 
  isLoading = false,
  emptyMessage 
}: ClassificationTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="py-4 text-center">{t('seasons.loadingStandings')}</div>;
  }

  if (!classifications || classifications.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="mb-2">{emptyMessage || t('seasons.noStandings')}</p>
      </div>
    );
  }

  // Sort classifications by position
  const sortedClassifications = [...classifications].sort((a, b) => {
    if (a.position !== null && b.position !== null) {
      return a.position - b.position;
    } else if (a.position !== null) {
      return -1;
    } else if (b.position !== null) {
      return 1;
    } else {
      return (b.points || 0) - (a.points || 0);
    }
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2 text-left">Pos</th>
            <th className="px-4 py-2 text-left">Team</th>
            <th className="px-4 py-2 text-center">P</th>
            <th className="px-4 py-2 text-center">W</th>
            <th className="px-4 py-2 text-center">D</th>
            <th className="px-4 py-2 text-center">L</th>
            <th className="px-4 py-2 text-center">GF</th>
            <th className="px-4 py-2 text-center">GA</th>
            <th className="px-4 py-2 text-center">GD</th>
            <th className="px-4 py-2 text-center">Pts</th>
          </tr>
        </thead>
        <tbody>
          {sortedClassifications.map((classification) => (
            <tr key={classification.id} className="border-b hover:bg-muted/50">
              <td className="px-4 py-2 text-left font-medium">
                {classification.position || "-"}
              </td>
              <td className="px-4 py-2 text-left">
                {classification.externalTeamName}
              </td>
              <td className="px-4 py-2 text-center">
                {classification.gamesPlayed || 0}
              </td>
              <td className="px-4 py-2 text-center">
                {classification.gamesWon || 0}
              </td>
              <td className="px-4 py-2 text-center">
                {classification.gamesDrawn || 0}
              </td>
              <td className="px-4 py-2 text-center">
                {classification.gamesLost || 0}
              </td>
              <td className="px-4 py-2 text-center">
                {classification.goalsFor || 0}
              </td>
              <td className="px-4 py-2 text-center">
                {classification.goalsAgainst || 0}
              </td>
              <td className="px-4 py-2 text-center">
                {(classification.goalsFor || 0) - (classification.goalsAgainst || 0)}
              </td>
              <td className="px-4 py-2 text-center font-bold">
                {classification.points || 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
