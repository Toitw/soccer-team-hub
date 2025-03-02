import { useState, useEffect } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TeamMember, InsertLineup, Lineup } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useMobile } from "@/hooks/use-mobile";
import SoccerField from "@/components/lineup/soccer-field";
import Sidebar from "@/components/sidebar";
import MobileNavigation from "@/components/mobile-navigation";


export default function LineupPage() {
  const isMobile = useMobile();
  
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      {!isMobile && <Sidebar />}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 md:p-6 flex-1 overflow-y-auto">
          <h1 className="text-2xl font-bold mb-6">Lineup</h1>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <SoccerField />
              {/* Players will be added later */}
            </CardContent>
          </Card>
        </div>

        {/* Mobile navigation for smaller screens */}
        {isMobile && <MobileNavigation />}
      </div>
    </div>
  );
}