import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface AttendanceTrackerProps {
  teamId: number;
}

interface AttendanceRecord {
  userId: number;
  user: {
    fullName: string;
    profilePicture: string;
  };
  rate: number;
  status: string;
}

export default function AttendanceTracker({ teamId }: AttendanceTrackerProps) {
  // For a real implementation, fetch attendance data from API
  // This is mocked for demonstration
  const attendanceRecords: AttendanceRecord[] = [
    {
      userId: 3,
      user: {
        fullName: "Marcus Rashford",
        profilePicture: "https://ui-avatars.com/api/?name=Marcus+Rashford&background=FFC107&color=fff"
      },
      rate: 90,
      status: "active"
    },
    {
      userId: 4,
      user: {
        fullName: "Bruno Fernandes",
        profilePicture: "https://ui-avatars.com/api/?name=Bruno+Fernandes&background=FFC107&color=fff"
      },
      rate: 100,
      status: "active"
    },
    {
      userId: 5,
      user: {
        fullName: "Jadon Sancho",
        profilePicture: "https://ui-avatars.com/api/?name=Jadon+Sancho&background=FFC107&color=fff"
      },
      rate: 80,
      status: "active"
    }
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case "active":
        return "bg-secondary";
      case "warning":
        return "bg-yellow-500";
      case "inactive":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Attendance</h2>
          <span className="text-sm text-gray-500">Last 5 events</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2 font-medium">Player</th>
                <th className="text-center pb-2 font-medium">Rate</th>
                <th className="text-center pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map(record => (
                <tr key={record.userId} className="border-b">
                  <td className="py-2">
                    <div className="flex items-center">
                      <img 
                        src={record.user.profilePicture} 
                        alt={record.user.fullName} 
                        className="w-8 h-8 rounded-full mr-2" 
                      />
                      <span>{record.user.fullName}</span>
                    </div>
                  </td>
                  <td className="py-2 text-center">
                    <span>{record.rate}%</span>
                  </td>
                  <td className="py-2 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${getStatusColor(record.status)}`}></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <Button variant="outline" className="w-full mt-3 py-1.5 text-sm text-primary border border-primary rounded-md hover:bg-primary/5">
          View Full Attendance Report
        </Button>
      </CardContent>
    </Card>
  );
}
