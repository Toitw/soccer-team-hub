import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Team, TeamMember } from "@shared/schema";
import { MemberClaimButton } from "@/components/team/MemberClaimButton";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search, FileEdit, Trash2, ClipboardCheck, Mail, Phone, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TeamMemberWithUser extends TeamMember {
  user: {
    id: number;
    username: string;
    fullName?: string;
    profilePicture?: string | null;
    position?: string;
    jerseyNumber?: number;
    email?: string;
    phoneNumber?: string;
  };
}

export default function TeamRosterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { id } = useParams();
  const teamId = parseInt(id || "0");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Check if user is admin
  const isAdmin = user?.role === "admin" || user?.role === "superuser" || user?.role === "coach";

  // Get team details
  const { data: team, isLoading: teamLoading } = useQuery<Team>({
    queryKey: [`/api/teams/${teamId}`],
    enabled: !!teamId,
  });

  // Get team members
  const { data: teamMembers, isLoading: teamMembersLoading } = useQuery<TeamMemberWithUser[]>({
    queryKey: [`/api/teams/${teamId}/members`],
    enabled: !!teamId,
  });

  // Filter team members based on search and role
  const filteredTeamMembers = teamMembers?.filter(member => {
    const roleMatch = roleFilter === "all" || member.role === roleFilter;
    const searchMatch = searchQuery === "" || 
      member.user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user.position?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return roleMatch && searchMatch;
  }) || [];

  if (teamLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-0 md:ml-64 overflow-y-auto z-30">
        <Header title={t("team.title")} />
        <div className="px-4 sm:px-6 lg:px-8 py-6 pb-16">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {team?.name || "Team"}
              </h1>
              <p className="text-gray-500">
                {team?.division || "No division set"}
              </p>
            </div>
            {isAdmin && (
              <div className="flex items-center space-x-3">
                <Link to={`/teams/${teamId}/claims`}>
                  <Button variant="outline">
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    {t("team.claims.manage") || "Manage Claims"}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <Card className="mb-8">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <CardTitle className="text-xl">
                {t("team.teamMembers") || "Team Members"}
              </CardTitle>

              <div className="flex flex-col sm:flex-row w-full sm:w-auto items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="relative w-full sm:w-[180px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("team.search") || "Search..."}
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select
                  defaultValue={roleFilter}
                  onValueChange={(value) => setRoleFilter(value)}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder={t("team.filterByRole") || "Filter by role"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("team.allRoles") || "All roles"}</SelectItem>
                    <SelectItem value="coach">{t("team.coach") || "Coach"}</SelectItem>
                    <SelectItem value="player">{t("team.player") || "Player"}</SelectItem>
                    <SelectItem value="colaborador">{t("team.colaborador") || "Colaborador"}</SelectItem>
                  </SelectContent>
                </Select>
                {(roleFilter !== "all" || searchQuery) && (
                  <Badge variant="outline" className="px-3 py-1">
                    {filteredTeamMembers.length}{" "}
                    {filteredTeamMembers.length === 1 ? "result" : "results"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("team.table.name") || "Name"}</TableHead>
                    <TableHead>{t("team.table.role") || "Role"}</TableHead>
                    <TableHead>{t("team.table.position") || "Position"}</TableHead>
                    <TableHead>{t("team.table.jerseyNumber") || "#"}</TableHead>
                    <TableHead>{t("team.table.contact") || "Contact"}</TableHead>
                    <TableHead>{t("team.table.actions") || "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredTeamMembers.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8"
                      >
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mb-2" />
                          <div className="text-lg font-medium">
                            {t("team.noTeamMembersFound") || "No team members found"}
                          </div>
                          {searchQuery || roleFilter !== "all" ? (
                            <p>{t("team.filters.tryAdjusting") || "Try adjusting your filters"}</p>
                          ) : (
                            <p>{t("team.filters.addToStart") || "Add members to get started"}</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredTeamMembers.map((member) => {
                    if (!member || !member.user) return null;
                    return (
                      <TableRow key={member.id} className="hover:bg-accent/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10 mr-3 border border-primary/30">
                              <AvatarImage
                                src={
                                  member.user.profilePicture ||
                                  "/default-avatar.png"
                                }
                                alt={member.user.fullName || ""}
                              />
                              <AvatarFallback>
                                {member.user.fullName?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold">
                                {member.user.fullName || member.user.username}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {member.user.username}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              member.role === "coach"
                                ? "secondary"
                                : member.role === "player"
                                ? "outline"
                                : "default"
                            }
                          >
                            {member.role === "coach"
                              ? t("team.coach") || "Coach"
                              : member.role === "player"
                              ? t("team.player") || "Player"
                              : t("team.colaborador") || "Colaborador"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.user.position || "-"}
                        </TableCell>
                        <TableCell>
                          {member.user.jerseyNumber ? (
                            <Badge variant="outline">
                              #{member.user.jerseyNumber}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            {member.user.email && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Mail className="h-3 w-3 mr-1" />
                                <span>{member.user.email}</span>
                              </div>
                            )}
                            {member.user.phoneNumber && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 mr-1" />
                                <span>{member.user.phoneNumber}</span>
                              </div>
                            )}
                            {!member.user.email &&
                              !member.user.phoneNumber &&
                              "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {isAdmin ? (
                              <>
                                <Button variant="ghost" size="icon">
                                  <FileEdit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            ) : (
                              <MemberClaimButton 
                                member={{
                                  id: member.id,
                                  fullName: member.user.fullName || member.user.username,
                                  teamId: member.teamId
                                }} 
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}