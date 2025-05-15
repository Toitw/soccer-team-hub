import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";

// Define feedback schema with validation - only type and message fields are needed
const feedbackSchema = z.object({
  type: z.enum(["bug", "suggestion", "improvement", "other"], {
    required_error: "Please select a feedback type",
  }),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000, "Message must be less than 1000 characters"),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

export default function FeedbackDialog() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with defaults
  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: undefined,
      message: "",
    },
  });

  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true);

    try {
      // Add user information from the auth context
      const feedbackData = {
        ...data,
        userId: user?.id,
        name: user?.fullName,
        email: user?.email,
      };

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedbackData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("feedback.failedToSubmit"));
      }

      toast({
        title: t("feedback.feedbackSubmitted"),
        description: t("feedback.thankYouFeedback"),
      });

      // Reset form and close dialog
      form.reset();
      setIsOpen(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: t("feedback.errorSubmitting"),
        description: error instanceof Error ? error.message : t("feedback.failedToSubmit"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Track screen size to adjust button size on mobile
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if we're on mobile device on component mount and window resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check initially
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className={`fixed ${isMobile ? 'right-4 bottom-16' : 'right-8 bottom-8 lg:right-12'} z-50 rounded-full ${isMobile ? 'w-14 h-14' : 'w-12 h-12'} p-0 shadow-xl hover:shadow-lg transition-all duration-200 border border-primary/20`}
          aria-label={t("feedback.submitFeedback")}
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(true)}
          style={{ touchAction: 'manipulation' }}
        >
          <MessageSquare className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("feedback.submitFeedback")}</DialogTitle>
          <DialogDescription>
            {t("feedback.helpUsImprove")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("feedback.feedbackType")}</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("feedback.selectFeedbackType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bug">{t("feedback.bugReport")}</SelectItem>
                      <SelectItem value="suggestion">{t("feedback.suggestion")}</SelectItem>
                      <SelectItem value="improvement">{t("feedback.improvement")}</SelectItem>
                      <SelectItem value="other">{t("feedback.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("feedback.message")}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t("feedback.describeFeedback")} 
                      className="min-h-[120px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? t("feedback.submitting") : t("feedback.submitFeedback")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}