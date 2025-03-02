import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-primary">{title}</h1>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" className="text-sm text-primary hover:text-primary/80 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs bg-accent text-white rounded-full">3</span>
          </Button>
          <div className="md:block hidden">
            <img 
              src={user?.profilePicture || "https://ui-avatars.com/api/?name=User&background=0D47A1&color=fff"} 
              alt="User profile" 
              className="w-10 h-10 rounded-full border-2 border-primary" 
            />
          </div>
        </div>
      </div>
    </header>
  );
}
