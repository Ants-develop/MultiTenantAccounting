import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, Building2, DollarSign, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const companyInfoSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  code: z.string().min(1, "Company code is required").max(10, "Code must be 10 characters or less"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  taxId: z.string().optional(),
});

const financialSettingsSchema = z.object({
  fiscalYearStart: z.number().min(1).max(12),
  currency: z.string().min(3).max(3),
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
  decimalPlaces: z.number().min(0).max(4),
});

type CompanyInfoForm = z.infer<typeof companyInfoSchema>;
type FinancialSettingsForm = z.infer<typeof financialSettingsSchema>;

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const totalSteps = 3;

  const companyForm = useForm<CompanyInfoForm>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      phone: "",
      email: "",
      taxId: "",
    },
  });

  const financialForm = useForm<FinancialSettingsForm>({
    resolver: zodResolver(financialSettingsSchema),
    defaultValues: {
      fiscalYearStart: 1,
      currency: "GEL",
      dateFormat: "MM/DD/YYYY",
      decimalPlaces: 2,
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/company/setup', data);
    },
    onSuccess: () => {
      // Invalidate auth query to refresh main company data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "Setup Complete!",
        description: "Your company has been configured successfully.",
      });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to complete setup",
        variant: "destructive",
      });
    },
  });

  const handleNext = async () => {
    if (currentStep === 1) {
      const valid = await companyForm.trigger();
      if (!valid) return;
    } else if (currentStep === 2) {
      const valid = await financialForm.trigger();
      if (!valid) return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - submit
      const companyData = companyForm.getValues();
      const financialData = financialForm.getValues();
      setupMutation.mutate({
        company: companyData,
        financial: financialData,
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isLastStep = currentStep === totalSteps;
  const isFirstStep = currentStep === 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-primary/20">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-primary to-primary/60 text-white p-6 rounded-t-lg">
          <div className="flex items-center space-x-3 mb-2">
            <Building2 className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Company Setup Wizard</h1>
          </div>
          <p className="text-primary-foreground/80">Let's get your company configured in just a few steps</p>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step < currentStep
                      ? "bg-green-500 text-white"
                      : step === currentStep
                      ? "bg-primary text-white ring-4 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step < currentStep ? "✓" : step}
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded transition-all ${
                      step < currentStep ? "bg-green-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Indicator */}
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </p>
            <h2 className="text-xl font-semibold mt-1">
              {currentStep === 1 && "Company Information"}
              {currentStep === 2 && "Financial Settings"}
              {currentStep === 3 && "Review & Complete"}
            </h2>
          </div>
        </div>

        {/* Content */}
        <CardContent className="space-y-6 pb-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">Tell us about your company</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    {...companyForm.register("name")}
                    placeholder="Your Company Inc."
                  />
                  {companyForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{companyForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Company Code *</Label>
                  <Input
                    id="code"
                    {...companyForm.register("code")}
                    placeholder="YCI"
                    className="uppercase"
                  />
                  {companyForm.formState.errors.code && (
                    <p className="text-sm text-destructive">{companyForm.formState.errors.code.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  {...companyForm.register("address")}
                  placeholder="123 Business Street"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    {...companyForm.register("phone")}
                    placeholder="+995 123 456 789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...companyForm.register("email")}
                    placeholder="company@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID</Label>
                <Input
                  id="taxId"
                  {...companyForm.register("taxId")}
                  placeholder="123456789"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">Configure your financial settings</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fiscalYearStart">Fiscal Year Starts</Label>
                  <Select
                    value={financialForm.watch("fiscalYearStart")?.toString()}
                    onValueChange={(value) =>
                      financialForm.setValue("fiscalYearStart", parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {new Date(2024, month - 1).toLocaleString("default", {
                            month: "long",
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={financialForm.watch("currency")}
                    onValueChange={(value) =>
                      financialForm.setValue("currency", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GEL">GEL - Georgian Lari</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={financialForm.watch("dateFormat")}
                    onValueChange={(value: any) =>
                      financialForm.setValue("dateFormat", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="decimalPlaces">Decimal Places</Label>
                  <Select
                    value={financialForm.watch("decimalPlaces")?.toString()}
                    onValueChange={(value) =>
                      financialForm.setValue("decimalPlaces", parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-muted-foreground mb-6">Review your setup before completing</p>

              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    Company Information
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{companyForm.watch("name")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Code</p>
                      <p className="font-medium">{companyForm.watch("code")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{companyForm.watch("email") || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{companyForm.watch("phone") || "-"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Financial Settings
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Currency</p>
                      <p className="font-medium">{financialForm.watch("currency")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fiscal Year Start</p>
                      <p className="font-medium">
                        {new Date(2024, financialForm.watch("fiscalYearStart") - 1).toLocaleString("default", {
                          month: "long",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date Format</p>
                      <p className="font-medium">{financialForm.watch("dateFormat")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Decimal Places</p>
                      <p className="font-medium">{financialForm.watch("decimalPlaces")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
                <p className="text-green-900">
                  ✓ All settings are valid and ready to be saved.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer with buttons */}
        <div className="flex items-center justify-between p-6 border-t bg-muted/30 rounded-b-lg">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isFirstStep || setupMutation.isPending}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-all ${
                  i + 1 <= currentStep ? "bg-primary w-6" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={setupMutation.isPending}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {isLastStep ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Complete Setup
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

