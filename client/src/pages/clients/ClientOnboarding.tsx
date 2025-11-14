import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { clientManagementApi, OnboardingStatus } from "@/api/client-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, Circle, FileText, User, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import dayjs from "dayjs";

interface ClientOnboardingProps {
  clientId: number;
}

export const ClientOnboarding: React.FC<ClientOnboardingProps> = ({ clientId }) => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ["/api/clients", clientId, "onboarding", "status"],
    queryFn: () => clientManagementApi.fetchOnboardingStatus(clientId),
  });

  const completeStepMutation = useMutation({
    mutationFn: (stepId: number) => clientManagementApi.completeOnboardingStep(clientId, stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "onboarding"] });
      toast({
        title: "Step completed",
        description: "Onboarding step has been marked as complete.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete step",
        variant: "destructive",
      });
    },
  });

  const handleCompleteStep = (stepId: number) => {
    completeStepMutation.mutate(stepId);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Onboarding status not found</p>
            <Button variant="outline" onClick={() => setLocation("/clients")} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case "document_upload":
        return <FileText className="w-5 h-5" />;
      case "form_completion":
        return <User className="w-5 h-5" />;
      case "meeting":
        return <Calendar className="w-5 h-5" />;
      default:
        return <Circle className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/clients")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Client Onboarding</h1>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-500">
                  {status.completedSteps} / {status.totalSteps} steps completed
                </span>
              </div>
              <Progress value={status.progress} className="h-2" />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status.progress === 100 ? "default" : "secondary"}>
                {status.progress === 100 ? "Complete" : "In Progress"}
              </Badge>
              <span className="text-sm text-gray-500">
                {Math.round(status.progress)}% complete
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Steps</CardTitle>
        </CardHeader>
        <CardContent>
          {status.steps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No onboarding steps defined yet.</p>
              <p className="text-sm mt-2">Start onboarding to create steps.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {status.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${
                    step.isCompleted
                      ? "bg-green-50 border-green-200"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {step.isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStepIcon(step.stepType)}
                        <div>
                          <h3 className="font-medium text-gray-900">{step.stepName}</h3>
                          <p className="text-sm text-gray-500 capitalize">
                            {step.stepType.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      {!step.isCompleted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCompleteStep(step.id)}
                          disabled={completeStepMutation.isPending}
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                    {step.completedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Completed: {dayjs(step.completedAt).format("MMM D, YYYY [at] h:mm A")}
                      </p>
                    )}
                    {step.metadata && Object.keys(step.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        <details>
                          <summary className="cursor-pointer">View details</summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                            {JSON.stringify(step.metadata, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onboarding Forms */}
      {status.forms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.forms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-3 rounded border"
                >
                  <div>
                    <p className="font-medium text-sm capitalize">
                      {form.formType.replace("_", " ")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {form.completedAt
                        ? `Completed: ${dayjs(form.completedAt).format("MMM D, YYYY")}`
                        : `Status: ${form.status}`}
                    </p>
                  </div>
                  <Badge
                    variant={
                      form.status === "completed"
                        ? "default"
                        : form.status === "in_progress"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {form.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

