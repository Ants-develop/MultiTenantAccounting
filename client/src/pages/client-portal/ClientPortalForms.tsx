import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  answers: z.record(z.string(), z.any()),
});

type FormData = z.infer<typeof formSchema>;

export const ClientPortalForms: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const clientId = parseInt(sessionStorage.getItem("clientId") || "0");

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["/api/client-portal/forms", clientId],
    queryFn: async () => {
      return apiRequest(`/api/client-portal/forms?clientId=${clientId}`, {
        method: "GET",
      });
    },
    enabled: clientId > 0,
  });

  const submitFormMutation = useMutation({
    mutationFn: async (data: { formId: number; answers: Record<string, any> }) => {
      return apiRequest("/api/client-portal/forms/submit", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/forms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/dashboard"] });
      toast({
        title: "Form submitted",
        description: "Your form has been submitted successfully.",
      });
      setIsFormDialogOpen(false);
      setSelectedForm(null);
    },
    onError: (error: any) => {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit form",
        variant: "destructive",
      });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const handleFormOpen = (form: any) => {
    setSelectedForm(form);
    reset({ answers: {} });
    setIsFormDialogOpen(true);
  };

  const onSubmit = (data: FormData) => {
    if (!selectedForm) return;
    submitFormMutation.mutate({
      formId: selectedForm.id,
      answers: data.answers,
    });
  };

  const pendingForms = forms.filter((f: any) => f.status !== "completed");
  const completedForms = forms.filter((f: any) => f.status === "completed");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/client-portal/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
              <p className="text-sm text-gray-500">Complete required forms</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pending Forms */}
        {pendingForms.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pending Forms</CardTitle>
              <CardDescription>Please complete these forms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingForms.map((form: any) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <Circle className="w-6 h-6 text-gray-400" />
                      <div>
                        <p className="font-medium capitalize">
                          {form.formType?.replace("_", " ") || "Form"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Status: {form.status}
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => handleFormOpen(form)}>
                      Fill Form
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Forms */}
        <Card>
          <CardHeader>
            <CardTitle>Completed Forms</CardTitle>
            <CardDescription>Forms you have already submitted</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : completedForms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No completed forms</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedForms.map((form: any) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-green-50 border-green-200"
                  >
                    <div className="flex items-center gap-4">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="font-medium capitalize">
                          {form.formType?.replace("_", " ") || "Form"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Completed: {form.completedAt ? new Date(form.completedAt).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="default">Completed</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Form Dialog */}
      {selectedForm && (
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="capitalize">
                {selectedForm.formType?.replace("_", " ") || "Form"}
              </DialogTitle>
              <DialogDescription>
                Please fill out all required fields
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Dynamic form fields based on form type */}
              <div className="space-y-4">
                {selectedForm.formType === "tax_questionnaire" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type</Label>
                      <Input
                        id="businessType"
                        {...register("answers.businessType")}
                        placeholder="e.g., LLC, Corporation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualRevenue">Annual Revenue</Label>
                      <Input
                        id="annualRevenue"
                        type="number"
                        {...register("answers.annualRevenue")}
                        placeholder="Enter annual revenue"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employees">Number of Employees</Label>
                      <Input
                        id="employees"
                        type="number"
                        {...register("answers.employees")}
                        placeholder="Enter number of employees"
                      />
                    </div>
                  </>
                )}
                {selectedForm.formType === "payroll_input" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="payrollPeriod">Payroll Period</Label>
                      <Input
                        id="payrollPeriod"
                        {...register("answers.payrollPeriod")}
                        placeholder="e.g., Monthly, Bi-weekly"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employeeCount">Employee Count</Label>
                      <Input
                        id="employeeCount"
                        type="number"
                        {...register("answers.employeeCount")}
                        placeholder="Enter employee count"
                      />
                    </div>
                  </>
                )}
                {selectedForm.formType === "business_info_update" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="address">Business Address</Label>
                      <Input
                        id="address"
                        {...register("answers.address")}
                        placeholder="Enter business address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        {...register("answers.phone")}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        {...register("answers.notes")}
                        rows={4}
                        placeholder="Any additional information..."
                      />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitFormMutation.isPending}>
                  {submitFormMutation.isPending ? "Submitting..." : "Submit Form"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

