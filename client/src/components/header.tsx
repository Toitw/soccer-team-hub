import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logged out",
          description: "You have been successfully logged out.",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to log out",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-primary">{title}</h1>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" className="text-sm text-primary hover:text-primary/80 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs bg-accent text-white rounded-full">3</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="md:block hidden cursor-pointer">
                <img 
                  src={user?.profilePicture || "https://ui-avatars.com/api/?name=User&background=0D47A1&color=fff"} 
                  alt="User profile" 
                  className="w-10 h-10 rounded-full border-2 border-primary" 
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.fullName || "User"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-500 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Mobile logout button */}
          <Button 
            variant="ghost" 
            onClick={handleLogout} 
            className="md:hidden text-sm text-red-500 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
