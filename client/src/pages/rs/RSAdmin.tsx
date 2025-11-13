import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import dayjs from "dayjs";
import {
  validateMainUserCredentials,
  validateServiceUserCredentials,
  fetchRsCredentials,
  createRsCredential,
  updateRsCredential,
  deleteRsCredential,
  validateAllCredentials,
  type MainUserValidationResponse,
  type ServiceUserValidationResponse,
  type RsCredential,
} from "@/api/rs-admin";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Edit,
  Save,
  KeyRound,
  Database,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

const mainFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const serviceFormSchema = z.object({
  serviceUser: z.string().min(1, "Service user is required"),
  servicePassword: z.string().min(1, "Service password is required"),
});

const optionalPasswordSchema = z.union([
  z.literal(""),
  z.string().min(6, "Password must be at least 6 characters"),
]);

const optionalStringSchema = z.union([z.literal(""), z.string()]);

const credentialFormSchema = z.object({
  mainUser: z.string().min(1, "Main user is required"),
  mainPassword: optionalPasswordSchema,
  serviceUser: z.string().min(1, "Service user is required"),
  servicePassword: optionalPasswordSchema,
  companyTin: z.string().min(1, "Company TIN is required"),
  companyName: z.string().min(1, "Company name is required"),
  // Allow empty string, undefined, or valid string for optional fields
  rsUserId: z.union([z.string(), z.literal(""), z.undefined()]).optional(),
  unId: z.union([z.string(), z.literal(""), z.undefined()]).optional(),
});

type MainFormValues = z.infer<typeof mainFormSchema>;
type ServiceFormValues = z.infer<typeof serviceFormSchema>;
type CredentialFormValues = z.infer<typeof credentialFormSchema>;

const CREDENTIALS_QUERY_KEY = ["rs-admin", "credentials"] as const;

const defaultCredentialValues: CredentialFormValues = {
  mainUser: "",
  mainPassword: "",
  serviceUser: "",
  servicePassword: "",
  companyTin: "",
  companyName: "",
  rsUserId: "",
  unId: "",
};

const parseErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const match = error.message.match(/\{.*\}$/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed?.message) return parsed.message;
      } catch {
        // ignore parse failure
      }
    }
    return error.message;
  }
  return "An unexpected error occurred";
};

// 3-Step Authentication Component (inline on page)
function AuthenticationSection({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Persistent state across all steps
  const [authData, setAuthData] = useState({
    mainUser: "",
    mainPassword: "",
    serviceUser: "",
    servicePassword: "",
    companyName: "",
    companyTin: "",
    rsUserId: "",
    unId: "",
  });

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [mainValidation, setMainValidation] = useState<MainUserValidationResponse | null>(null);
  const [serviceValidation, setServiceValidation] = useState<ServiceUserValidationResponse | null>(null);

  const mainForm = useForm<MainFormValues>({
    resolver: zodResolver(mainFormSchema),
    defaultValues: { 
      username: authData.mainUser,
      password: authData.mainPassword,
    },
  });

  const serviceForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      serviceUser: authData.serviceUser,
      servicePassword: authData.servicePassword,
    },
  });

  const credentialForm = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialFormSchema),
    defaultValues: authData,
  });

  // Update forms when authData changes
  useEffect(() => {
    mainForm.reset({
      username: authData.mainUser,
      password: authData.mainPassword,
    });
  }, [authData.mainUser, authData.mainPassword, mainForm]);

  useEffect(() => {
    serviceForm.reset({
      serviceUser: authData.serviceUser,
      servicePassword: authData.servicePassword,
    });
  }, [authData.serviceUser, authData.servicePassword, serviceForm]);

  // Pre-fill Step 3 form when it becomes active - only reset once when step 3 is reached
  useEffect(() => {
    if (currentStep === 3 && serviceValidation) {
      // Convert rsUserId to string if it's a number
      const rsUserIdStr = authData.rsUserId 
        ? (typeof authData.rsUserId === 'string' ? authData.rsUserId : String(authData.rsUserId))
        : '';
      const unIdStr = authData.unId 
        ? (typeof authData.unId === 'string' ? authData.unId : String(authData.unId))
        : '';
      
      const formValues = {
        mainUser: authData.mainUser,
        mainPassword: authData.mainPassword, // Preserve password from authData
        serviceUser: authData.serviceUser,
        servicePassword: authData.servicePassword, // Preserve password from authData
        companyTin: serviceValidation.companyTin || authData.companyTin,
        companyName: serviceValidation.companyName || authData.companyName,
        // Use undefined instead of empty string for optional fields to pass validation
        rsUserId: rsUserIdStr && rsUserIdStr.trim() ? rsUserIdStr : undefined,
        unId: unIdStr && unIdStr.trim() ? unIdStr : undefined,
      };
      console.log("Setting form values for step 3:", { 
        ...formValues, 
        mainPassword: formValues.mainPassword ? "***" : "MISSING", 
        servicePassword: formValues.servicePassword ? "***" : "MISSING" 
      });
      credentialForm.reset(formValues);
      // Also set values explicitly to ensure they're registered and passwords are preserved
      credentialForm.setValue("mainUser", authData.mainUser, { shouldValidate: false });
      credentialForm.setValue("mainPassword", authData.mainPassword, { shouldValidate: false });
      credentialForm.setValue("serviceUser", authData.serviceUser, { shouldValidate: false });
      credentialForm.setValue("servicePassword", authData.servicePassword, { shouldValidate: false });
      credentialForm.setValue("companyTin", formValues.companyTin, { shouldValidate: false });
      credentialForm.setValue("companyName", formValues.companyName, { shouldValidate: false });
      credentialForm.setValue("rsUserId", formValues.rsUserId, { shouldValidate: false });
      credentialForm.setValue("unId", formValues.unId, { shouldValidate: false });
    }
  }, [currentStep, serviceValidation]); // Removed authData and credentialForm from deps to prevent unnecessary resets

  const mainValidationMutation = useMutation({
    mutationFn: validateMainUserCredentials,
    onSuccess: (data, variables) => {
      setMainValidation(data);
      setAuthData((prev) => ({
        ...prev,
        mainUser: variables.username.trim(),
        rsUserId: data.rsUserId ?? "",
      }));
      
      // Auto-select first service user
      if (data.serviceUsers.length > 0) {
        setAuthData((prev) => ({
          ...prev,
          serviceUser: data.serviceUsers[0],
        }));
      }
      
      setCurrentStep(2);
      toast({
        title: t("rsAdmin.toasts.mainValidatedTitle"),
        description: t("rsAdmin.toasts.mainValidatedDescription", { count: data.serviceUsers.length }),
      });
    },
    onError: (error) => {
      toast({
        title: t("rsAdmin.toasts.errorTitle"),
        description: parseErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const serviceValidationMutation = useMutation({
    mutationFn: validateServiceUserCredentials,
    onSuccess: (data) => {
      setServiceValidation(data);
      setAuthData((prev) => ({
        ...prev,
        companyTin: data.companyTin,
        companyName: data.companyName || prev.companyName,
        unId: data.unId ?? prev.unId,
      }));
      
      setCurrentStep(3);
      toast({
        title: t("rsAdmin.toasts.serviceValidatedTitle"),
        description: t("rsAdmin.toasts.serviceValidatedDescription"),
      });
    },
    onError: (error) => {
      toast({
        title: t("rsAdmin.toasts.errorTitle"),
        description: parseErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const createCredentialMutation = useMutation({
    mutationFn: createRsCredential,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CREDENTIALS_QUERY_KEY });
      toast({
        title: t("rsAdmin.toasts.credentialsSavedTitle"),
        description: t("rsAdmin.toasts.credentialsSavedDescription"),
      });
      resetModal();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: t("rsAdmin.toasts.errorTitle"),
        description: parseErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const resetModal = () => {
    setCurrentStep(1);
    setMainValidation(null);
    setServiceValidation(null);
    setAuthData({
      mainUser: "",
      mainPassword: "",
      serviceUser: "",
      servicePassword: "",
      companyName: "",
      companyTin: "",
      rsUserId: "",
      unId: "",
    });
    mainForm.reset();
    serviceForm.reset();
    credentialForm.reset();
  };

  const handleStep1Submit = (values: MainFormValues) => {
    setAuthData((prev) => ({
      ...prev,
      mainUser: values.username,
      mainPassword: values.password,
    }));
    mainValidationMutation.mutate({
      username: values.username.trim(),
      password: values.password,
    });
  };

  const handleStep2Submit = (values: ServiceFormValues) => {
    setAuthData((prev) => ({
      ...prev,
      serviceUser: values.serviceUser,
      servicePassword: values.servicePassword,
    }));
    serviceValidationMutation.mutate({
      serviceUser: values.serviceUser.trim(),
      servicePassword: values.servicePassword,
    });
  };

  const handleStep3Submit = (values: CredentialFormValues) => {
    // Always use passwords from authData, not from form values (they might be cleared)
    const mainPassword = authData.mainPassword || values.mainPassword;
    const servicePassword = authData.servicePassword || values.servicePassword;
    
    console.log("Submitting credentials:", {
      mainUser: authData.mainUser,
      mainPassword: mainPassword ? "***" : "MISSING",
      serviceUser: authData.serviceUser,
      servicePassword: servicePassword ? "***" : "MISSING",
      companyTin: values.companyTin,
      companyName: values.companyName,
      rsUserId: values.rsUserId || null,
      unId: values.unId || null,
    });
    
    if (!mainPassword || !servicePassword) {
      toast({
        title: t("rsAdmin.toasts.errorTitle"),
        description: "Passwords are required. Please go back to step 1 and 2 to re-enter them.",
        variant: "destructive",
      });
      return;
    }
    
    // Convert rsUserId and unId to strings if needed, then to null if empty
    const rsUserIdValue = values.rsUserId 
      ? (typeof values.rsUserId === 'string' ? values.rsUserId.trim() : String(values.rsUserId).trim())
      : '';
    const unIdValue = values.unId 
      ? (typeof values.unId === 'string' ? values.unId.trim() : String(values.unId).trim())
      : '';
    
    createCredentialMutation.mutate({
      mainUser: authData.mainUser,
      mainPassword: mainPassword,
      serviceUser: authData.serviceUser,
      servicePassword: servicePassword,
      companyTin: values.companyTin,
      companyName: values.companyName,
      rsUserId: rsUserIdValue ? rsUserIdValue : null,
      unId: unIdValue ? unIdValue : null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            RS Authentication
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Step 1: Validate Main User - Authenticate with your RS account"}
            {currentStep === 2 && "Step 2: Select Service User - Choose your service user"}
            {currentStep === 3 && "Step 3: Review & Save - Confirm your credentials"}
          </CardDescription>
        </div>

          {/* Progress Bar */}
          <div className="mt-6 flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    step < currentStep
                      ? "bg-green-500 text-white"
                      : step === currentStep
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step < currentStep ? <CheckCircle2 className="h-6 w-6" /> : step}
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      step < currentStep ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Main User Validation */}
          {currentStep === 1 && (
            <form onSubmit={mainForm.handleSubmit(handleStep1Submit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="main-username">RS Email</Label>
                  <Input
                    id="main-username"
                    placeholder="user@rs.ge"
                    {...mainForm.register("username")}
                  />
                  {mainForm.formState.errors.username && (
                    <p className="text-sm text-destructive">
                      {mainForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="main-password">Password</Label>
                  <Input
                    id="main-password"
                    type="password"
                    placeholder="••••••••"
                    {...mainForm.register("password")}
                  />
                  {mainForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {mainForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetModal}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={mainValidationMutation.isPending}
                >
                  {mainValidationMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      Validate & Continue
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Step 2: Service User Selection */}
          {currentStep === 2 && mainValidation && (
            <form onSubmit={serviceForm.handleSubmit(handleStep2Submit)} className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                <Badge variant="secondary" className="bg-blue-100 text-blue-900">
                  Found {mainValidation.serviceUsers.length} service user(s)
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Service User</Label>
                  <Select
                    value={serviceForm.watch("serviceUser")}
                    onValueChange={(value) => {
                      serviceForm.setValue("serviceUser", value);
                      setAuthData((prev) => ({
                        ...prev,
                        serviceUser: value,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service user" />
                    </SelectTrigger>
                    <SelectContent>
                      {(mainValidation?.serviceUsers ?? []).map((user) => (
                        <SelectItem key={user} value={user}>
                          {user}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {serviceForm.formState.errors.serviceUser && (
                    <p className="text-sm text-destructive">
                      {serviceForm.formState.errors.serviceUser.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-password">Service Password</Label>
                  <Input
                    id="service-password"
                    type="password"
                    placeholder="••••••••"
                    {...serviceForm.register("servicePassword")}
                  />
                  {serviceForm.formState.errors.servicePassword && (
                    <p className="text-sm text-destructive">
                      {serviceForm.formState.errors.servicePassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCurrentStep(1);
                    setMainValidation(null);
                  }}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={serviceValidationMutation.isPending}
                >
                  {serviceValidationMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      Validate & Continue
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Review & Save */}
          {currentStep === 3 && serviceValidation && (
            <form onSubmit={(e) => {
              e.preventDefault();
              console.log("Form submit triggered");
              console.log("Form values:", credentialForm.getValues());
              console.log("Auth data:", { ...authData, mainPassword: "***", servicePassword: "***" });
              credentialForm.handleSubmit(handleStep3Submit, (errors) => {
                console.error("Form validation errors:", errors);
                toast({
                  title: "Validation Error",
                  description: "Please check all required fields are filled.",
                  variant: "destructive",
                });
              })(e);
            }} className="space-y-4">
              {/* Hidden fields for required form validation - using setValue instead */}
              <input type="hidden" {...credentialForm.register("mainUser")} />
              <input type="hidden" {...credentialForm.register("mainPassword")} />
              <input type="hidden" {...credentialForm.register("serviceUser")} />
              <input type="hidden" {...credentialForm.register("servicePassword")} />
              <input type="hidden" {...credentialForm.register("rsUserId")} />
              <input type="hidden" {...credentialForm.register("unId")} />
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Review your RS information:
                </p>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Company Name:</span>
                    <span className="font-semibold">{serviceValidation.companyName || authData.companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">TIN:</span>
                    <span className="font-semibold">{serviceValidation.companyTin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Main User:</span>
                    <span className="font-semibold">{authData.mainUser}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service User:</span>
                    <span className="font-semibold">{authData.serviceUser}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="final-company-name">Company Name</Label>
                  <Input
                    id="final-company-name"
                    {...credentialForm.register("companyName")}
                    defaultValue={serviceValidation?.companyName || authData.companyName}
                  />
                  {credentialForm.formState.errors.companyName && (
                    <p className="text-sm text-destructive">
                      {credentialForm.formState.errors.companyName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="final-tin">TIN</Label>
                  <Input
                    id="final-tin"
                    {...credentialForm.register("companyTin")}
                    defaultValue={serviceValidation?.companyTin || authData.companyTin}
                  />
                  {credentialForm.formState.errors.companyTin && (
                    <p className="text-sm text-destructive">
                      {credentialForm.formState.errors.companyTin.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCurrentStep(2);
                    setServiceValidation(null);
                  }}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={createCredentialMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createCredentialMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Credentials
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
  );
}

export default function RSAdmin() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isGlobalAdmin = user?.globalRole === "global_administrator";
  const [showAuthSection, setShowAuthSection] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const credentialsQuery = useQuery({
    queryKey: CREDENTIALS_QUERY_KEY,
    queryFn: () => {
      console.log(`[RSAdmin] Fetching credentials with scope: all`);
      return fetchRsCredentials("all"); // RS Admin is global, so fetch all credentials
    },
  });

  const credentials = useMemo(() => {
    const creds = credentialsQuery.data ?? [];
    console.log(`[RSAdmin] credentialsQuery.data:`, credentialsQuery.data);
    console.log(`[RSAdmin] credentials length:`, creds.length);
    return creds;
  }, [credentialsQuery.data]);

  const [editingCredential, setEditingCredential] = useState<RsCredential | null>(null);
  const [credentialPendingDeletion, setCredentialPendingDeletion] = useState<RsCredential | null>(null);

  const credentialForm = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialFormSchema),
    defaultValues: defaultCredentialValues,
  });

  useEffect(() => {
    if (editingCredential) {
      credentialForm.reset({
        mainUser: editingCredential.mainUser ?? "",
        mainPassword: "",
        serviceUser: editingCredential.serviceUser ?? "",
        servicePassword: "",
        companyTin: editingCredential.companyTin ?? "",
        companyName: editingCredential.companyName ?? "",
        rsUserId: editingCredential.rsUserId ?? "",
        unId: editingCredential.unId ?? "",
      });
    } else {
      credentialForm.reset(defaultCredentialValues);
    }
  }, [editingCredential, credentialForm]);

  const updateCredentialMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateRsCredential>[1] }) =>
      updateRsCredential(id, payload),
    onSuccess: (credential) => {
      credentialsQuery.refetch();
      setEditingCredential(credential);
      toast({
        title: t("rsAdmin.toasts.credentialsUpdatedTitle"),
        description: t("rsAdmin.toasts.credentialsUpdatedDescription"),
      });
    },
    onError: (error) => {
      toast({
        title: t("rsAdmin.toasts.errorTitle"),
        description: parseErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const deleteCredentialMutation = useMutation({
    mutationFn: deleteRsCredential,
    onSuccess: () => {
      credentialsQuery.refetch();
      setEditingCredential(null);
      credentialForm.reset(defaultCredentialValues);
      toast({
        title: t("rsAdmin.toasts.credentialsDeletedTitle"),
        description: t("rsAdmin.toasts.credentialsDeletedDescription"),
      });
    },
    onError: (error) => {
      toast({
        title: t("rsAdmin.toasts.errorTitle"),
        description: parseErrorMessage(error),
        variant: "destructive",
      });
    },
    onSettled: () => setCredentialPendingDeletion(null),
  });

  const validateAllMutation = useMutation({
    mutationFn: validateAllCredentials,
    onSuccess: (data) => {
      setLastRefreshTime(new Date());
      queryClient.invalidateQueries({ queryKey: CREDENTIALS_QUERY_KEY });
      toast({
        title: "Validation Complete",
        description: `Validated ${data.total} credentials: ${data.success} successful, ${data.failed} failed.`,
      });
    },
    onError: (error) => {
      toast({
        title: t("rsAdmin.toasts.errorTitle"),
        description: parseErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  if (!isGlobalAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader className="flex flex-col items-center text-center space-y-3">
            <ShieldAlert className="h-10 w-10 text-muted-foreground" />
            <CardTitle>{t("rsAdmin.accessDenied.title")}</CardTitle>
            <CardDescription className="max-w-xl">
              {t("rsAdmin.accessDenied.description")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleUpdateCredential = (values: CredentialFormValues) => {
    if (!editingCredential) return;

    const updatePayload: Parameters<typeof updateRsCredential>[1] = {
      mainUser: values.mainUser.trim(),
      serviceUser: values.serviceUser.trim(),
      companyTin: values.companyTin.trim(),
      companyName: values.companyName.trim(),
      rsUserId: values.rsUserId?.trim() || null,
      unId: values.unId?.trim() || null,
    };

    if (values.mainPassword) {
      updatePayload.mainPassword = values.mainPassword;
    }

    if (values.servicePassword) {
      updatePayload.servicePassword = values.servicePassword;
    }

    updateCredentialMutation.mutate({
      id: editingCredential.id,
      payload: updatePayload,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            {t("rsAdmin.title")}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            {t("rsAdmin.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => credentialsQuery.refetch()}
            disabled={credentialsQuery.isLoading || credentialsQuery.isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${credentialsQuery.isFetching ? "animate-spin" : ""}`} />
            {t("rsAdmin.actions.refresh")}
          </Button>
          <Button
            onClick={() => setShowAuthSection(!showAuthSection)}
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            {showAuthSection ? "Hide Authentication" : "Add New Credential"}
          </Button>
        </div>
      </div>

      {/* Authentication Section */}
      {showAuthSection && (
        <AuthenticationSection
          onSuccess={() => {
            setShowAuthSection(false);
            credentialsQuery.refetch();
          }}
        />
      )}

      {/* Edit Credential Card */}
      {editingCredential && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              {t("rsAdmin.steps.credentials.title")} - {t("rsAdmin.actions.edit")}
            </CardTitle>
            <CardDescription>{editingCredential.companyName}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={credentialForm.handleSubmit(handleUpdateCredential)}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-main-user">{t("rsAdmin.labels.mainUsername")}</Label>
                  <Input
                    id="edit-main-user"
                    placeholder="user@rs.ge"
                    {...credentialForm.register("mainUser")}
                  />
                  {credentialForm.formState.errors.mainUser && (
                    <p className="text-sm text-destructive">
                      {credentialForm.formState.errors.mainUser.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-main-password">{t("rsAdmin.labels.mainPassword")}</Label>
                  <Input
                    id="edit-main-password"
                    type="password"
                    placeholder={t("rsAdmin.placeholders.leaveBlank")}
                    {...credentialForm.register("mainPassword")}
                  />
                  {credentialForm.formState.errors.mainPassword && (
                    <p className="text-sm text-destructive">
                      {credentialForm.formState.errors.mainPassword.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-service-user">{t("rsAdmin.labels.serviceUser")}</Label>
                  <Input
                    id="edit-service-user"
                    placeholder="service_user"
                    {...credentialForm.register("serviceUser")}
                  />
                  {credentialForm.formState.errors.serviceUser && (
                    <p className="text-sm text-destructive">
                      {credentialForm.formState.errors.serviceUser.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-service-password">{t("rsAdmin.labels.servicePassword")}</Label>
                  <Input
                    id="edit-service-password"
                    type="password"
                    placeholder={t("rsAdmin.placeholders.leaveBlank")}
                    {...credentialForm.register("servicePassword")}
                  />
                  {credentialForm.formState.errors.servicePassword && (
                    <p className="text-sm text-destructive">
                      {credentialForm.formState.errors.servicePassword.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-company-tin">{t("rsAdmin.labels.companyTin")}</Label>
                  <Input
                    id="edit-company-tin"
                    placeholder="123456789"
                    {...credentialForm.register("companyTin")}
                  />
                  {credentialForm.formState.errors.companyTin && (
                    <p className="text-sm text-destructive">
                      {credentialForm.formState.errors.companyTin.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-company-name">{t("rsAdmin.labels.companyName")}</Label>
                  <Input
                    id="edit-company-name"
                    placeholder={t("rsAdmin.placeholders.companyName") || ""}
                    {...credentialForm.register("companyName")}
                  />
                  {credentialForm.formState.errors.companyName && (
                    <p className="text-sm text-destructive">
                      {credentialForm.formState.errors.companyName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {t("rsAdmin.hints.updatePasswords")}
                </p>
                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingCredential(null)}
                  >
                    {t("rsAdmin.actions.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateCredentialMutation.isPending}
                  >
                    {updateCredentialMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("rsAdmin.actions.updating")}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {t("rsAdmin.actions.update")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Credentials List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("rsAdmin.storedCredentials.title")}</CardTitle>
              <CardDescription>
                {t("rsAdmin.storedCredentials.description")}
                {lastRefreshTime && (
                  <span className="block mt-1 text-xs text-muted-foreground">
                    Last refresh: {dayjs(lastRefreshTime).format("YYYY-MM-DD HH:mm:ss")}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => validateAllMutation.mutate()}
              disabled={validateAllMutation.isPending || credentials.length === 0}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${validateAllMutation.isPending ? "animate-spin" : ""}`} />
              {validateAllMutation.isPending ? "Validating..." : "Validate All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {credentialsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("rsAdmin.storedCredentials.loading")}
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("rsAdmin.storedCredentials.empty")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("rsAdmin.table.company")}</TableHead>
                  <TableHead>{t("rsAdmin.table.companyTin")}</TableHead>
                  <TableHead>{t("rsAdmin.table.mainUser")}</TableHead>
                  <TableHead>{t("rsAdmin.table.serviceUser")}</TableHead>
                  <TableHead>{t("rsAdmin.table.updatedAt")}</TableHead>
                  <TableHead className="text-right">{t("rsAdmin.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((credential) => (
                  <TableRow key={credential.id}>
                    <TableCell>{credential.companyName ?? t("rsAdmin.labels.notAvailable")}</TableCell>
                    <TableCell>{credential.companyTin ?? t("rsAdmin.labels.notAvailable")}</TableCell>
                    <TableCell>{credential.mainUser ?? t("rsAdmin.labels.notAvailable")}</TableCell>
                    <TableCell>{credential.serviceUser ?? t("rsAdmin.labels.notAvailable")}</TableCell>
                    <TableCell>
                      {credential.updatedAt
                        ? dayjs(credential.updatedAt).format("YYYY-MM-DD HH:mm")
                        : t("rsAdmin.labels.notAvailable")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCredential(credential)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {t("rsAdmin.actions.edit")}
                        </Button>
                        <AlertDialog
                          open={credentialPendingDeletion?.id === credential.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setCredentialPendingDeletion(credential);
                            } else if (credentialPendingDeletion?.id === credential.id) {
                              setCredentialPendingDeletion(null);
                            }
                          }}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deleteCredentialMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {t("rsAdmin.actions.delete")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("rsAdmin.deleteDialog.title")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("rsAdmin.deleteDialog.description", {
                                  company: credential.companyName ?? credential.companyTin ?? credential.id,
                                })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={deleteCredentialMutation.isPending}>
                                {t("rsAdmin.actions.cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCredentialMutation.mutate(credential.id)}
                                disabled={deleteCredentialMutation.isPending}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleteCredentialMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                {t("rsAdmin.actions.confirmDelete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
