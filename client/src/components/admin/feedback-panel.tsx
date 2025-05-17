import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

type FeedbackType = "bug" | "suggestion" | "improvement" | "other";
type FeedbackStatus = "pending" | "reviewed" | "resolved";

interface Feedback {
  id: number;
  userId: number | null;
  name: string | null;
  email: string | null;
  type: FeedbackType;
  subject: string;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

export default function FeedbackPanel() {
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Fetch all feedback
  const { data: feedbackItems, isLoading, error, refetch } = useQuery<Feedback[]>({
    queryKey: ['/api/feedback'],
    refetchOnWindowFocus: false,
  });

  const updateFeedbackStatus = async (id: number, status: FeedbackStatus) => {
    try {
      const response = await apiRequest(`/api/feedback/${id}`, {
        method: 'PATCH',
        data: { status }, // Changed from body to data to match apiRequest expectations
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response) {
        throw new Error('Failed to update status');
      }

      toast({
        title: "Status updated",
        description: `Feedback status changed to ${status}`,
      });

      // Update the cache
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });

      // If updating the currently viewed feedback, close the dialog
      if (selectedFeedback?.id === id) {
        setSelectedFeedback(prev => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error('Failed to update feedback status:', error);
      toast({
        title: "Update failed",
        description: "Could not update feedback status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to display appropriate badge for feedback type
  const renderTypeBadge = (type: FeedbackType) => {
    switch (type) {
      case 'bug':
        return <Badge variant="destructive">Bug</Badge>;
      case 'suggestion':
        return <Badge variant="secondary">Suggestion</Badge>;
      case 'improvement':
        return <Badge variant="outline">Improvement</Badge>;
      case 'other':
      default:
        return <Badge variant="default">Other</Badge>;
    }
  };

  // Function to display appropriate badge for feedback status
  const renderStatusBadge = (status: FeedbackStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'reviewed':
        return <Badge variant="secondary" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Reviewed</Badge>;
      case 'resolved':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Resolved</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleViewFeedback = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setViewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            User Feedback
          </CardTitle>
          <CardDescription>
            View and manage user-submitted feedback and feature requests
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            User Feedback
          </CardTitle>
          <CardDescription>
            View and manage user-submitted feedback and feature requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
            <h3 className="text-red-800 dark:text-red-200 text-sm font-medium">Error loading feedback</h3>
            <p className="text-red-700 dark:text-red-300 text-xs mt-1">
              Could not load feedback data. Please try again later.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            User Feedback
          </CardTitle>
          <CardDescription>
            View and manage user-submitted feedback and feature requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(!feedbackItems || feedbackItems.length === 0) ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h3 className="text-muted-foreground font-medium">No feedback yet</h3>
              <p className="text-muted-foreground text-sm mt-1">Feedback submitted by users will appear here.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbackItems.map((feedback) => (
                    <TableRow key={feedback.id}>
                      <TableCell className="font-medium truncate max-w-[200px]">
                        {feedback.subject}
                      </TableCell>
                      <TableCell>{renderTypeBadge(feedback.type)}</TableCell>
                      <TableCell>
                        {feedback.name ? feedback.name : 'Anonymous'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(feedback.createdAt).toLocaleDateString()}
                        <div className="text-xs">
                          {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>{renderStatusBadge(feedback.status)}</TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewFeedback(feedback)}
                              >
                                View
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View feedback details</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Feedback Details</DialogTitle>
            <DialogDescription asChild>
              {selectedFeedback && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 mt-2">
                    {renderTypeBadge(selectedFeedback.type)}
                    <span className="text-sm text-muted-foreground">
                      Submitted {formatDistanceToNow(new Date(selectedFeedback.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Status:</span>
                    {renderStatusBadge(selectedFeedback.status)}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="font-semibold mb-1">Subject</h3>
                <p className="text-lg">{selectedFeedback.subject}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-1">From</h3>
                <p>
                  {selectedFeedback.name || 'Anonymous'} 
                  {selectedFeedback.email && (
                    <span className="text-muted-foreground ml-1">({selectedFeedback.email})</span>
                  )}
                </p>
                {selectedFeedback.userId && (
                  <p className="text-sm text-muted-foreground">User ID: {selectedFeedback.userId}</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-1">Message</h3>
                <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
                  {selectedFeedback.message}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <h3 className="font-semibold mb-1">Update Status</h3>
                  <Select
                    value={selectedFeedback.status}
                    onValueChange={(value: FeedbackStatus) => 
                      updateFeedbackStatus(selectedFeedback.id, value)
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}