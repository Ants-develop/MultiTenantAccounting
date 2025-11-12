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
  ListChecks,
  ChevronLeft,
  ChevronRight,
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
  rsUserId: optionalStringSchema.optional(),
  unId: optionalStringSchema.optional(),
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

export default function RSAdmin() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, companies } = useAuth();

  const isGlobalAdmin = user?.globalRole === "global_administrator";
  
  // In single-company mode, we use the first available client as context
  // This is for reference only (e.g., for TIN validation if needed)
  const currentCompanyCode = companies?.[0]?.code;

  const [mainValidation, setMainValidation] = useState<MainUserValidationResponse | null>(null);
  const [serviceValidation, setServiceValidation] = useState<ServiceUserValidationResponse | null>(null);
  const [editingCredential, setEditingCredential] = useState<RsCredential | null>(null);
  const [credentialPendingDeletion, setCredentialPendingDeletion] = useState<RsCredential | null>(null);

  const mainForm = useForm<MainFormValues>({
    resolver: zodResolver(mainFormSchema),
    defaultValues: { username: "", password: "" },
  });

  const serviceForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: { serviceUser: "", servicePassword: "" },
  });

  const credentialForm = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialFormSchema),
    defaultValues: defaultCredentialValues,
  });

  const isEditing = Boolean(editingCredential);

  const credentialsQuery = useQuery({
    queryKey: CREDENTIALS_QUERY_KEY,
    queryFn: () => fetchRsCredentials(),
  });

  const credentials = useMemo(() => credentialsQuery.data ?? [], [credentialsQuery.data]);

  useEffect(() => {
    if (!isEditing && mainValidation?.serviceUsers?.length) {
      const firstServiceUser = mainValidation.serviceUsers[0];
      if (!serviceForm.getValues("serviceUser")) {
        serviceForm.setValue("serviceUser", firstServiceUser);
      }
      if (!credentialForm.getValues("serviceUser")) {
        credentialForm.setValue("serviceUser", firstServiceUser);
      }
    }
  }, [isEditing, mainValidation, credentialForm, serviceForm]);

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
      mainForm.reset({ username: editingCredential.mainUser ?? "", password: "" });
      serviceForm.reset({ serviceUser: editingCredential.serviceUser ?? "", servicePassword: "" });
      setMainValidation(null);
      setServiceValidation(null);
    } else {
      credentialForm.reset(defaultCredentialValues);
      mainForm.reset({ username: "", password: "" });
      serviceForm.reset({ serviceUser: "", servicePassword: "" });
    }
  }, [editingCredential, credentialForm, mainForm, serviceForm]);

  const mainValidationMutation = useMutation({
    mutationFn: validateMainUserCredentials,
    onSuccess: (data, variables) => {
      setMainValidation(data);
      if (!isEditing) {
        credentialForm.setValue("mainUser", variables.username.trim());
      }
      credentialForm.setValue("rsUserId", data.rsUserId ?? "");
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
    onSuccess: (data, variables) => {
      setServiceValidation(data);
      credentialForm.setValue("serviceUser", variables.serviceUser.trim());
      credentialForm.setValue("companyTin", data.companyTin);
      if (data.companyName) {
        credentialForm.setValue("companyName", data.companyName);
      }
      credentialForm.setValue("unId", data.unId ?? "");
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
    onSuccess: (credential) => {
      queryClient.invalidateQueries({ queryKey: CREDENTIALS_QUERY_KEY });
      setEditingCredential(credential);
      toast({
        title: t("rsAdmin.toasts.credentialsSavedTitle"),
        description: t("rsAdmin.toasts.credentialsSavedDescription"),
      });
      credentialForm.reset({
        mainUser: credential.mainUser ?? "",
        mainPassword: "",
        serviceUser: credential.serviceUser ?? "",
        servicePassword: "",
        companyTin: credential.companyTin ?? "",
        companyName: credential.companyName ?? "",
        rsUserId: credential.rsUserId ?? "",
        unId: credential.unId ?? "",
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

  const updateCredentialMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateRsCredential>[1] }) =>
      updateRsCredential(id, payload),
    onSuccess: (credential) => {
      queryClient.invalidateQueries({ queryKey: CREDENTIALS_QUERY_KEY });
      setEditingCredential(credential);
      toast({
        title: t("rsAdmin.toasts.credentialsUpdatedTitle"),
        description: t("rsAdmin.toasts.credentialsUpdatedDescription"),
      });
      credentialForm.reset({
        mainUser: credential.mainUser ?? "",
        mainPassword: "",
        serviceUser: credential.serviceUser ?? "",
        servicePassword: "",
        companyTin: credential.companyTin ?? "",
        companyName: credential.companyName ?? "",
        rsUserId: credential.rsUserId ?? "",
        unId: credential.unId ?? "",
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
      queryClient.invalidateQueries({ queryKey: CREDENTIALS_QUERY_KEY });
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

  const handleMainValidate = (values: MainFormValues) => {
    mainValidationMutation.mutate({
      username: values.username.trim(),
      password: values.password,
    });
  };

  const handleServiceValidate = (values: ServiceFormValues) => {
    serviceValidationMutation.mutate({
      serviceUser: values.serviceUser.trim(),
      servicePassword: values.servicePassword,
    });
  };

  const handleCredentialSubmit = (values: CredentialFormValues) => {
    const trimmedTin = values.companyTin.trim();
    
    // Validate that TIN matches current company code
    if (currentCompanyCode && trimmedTin !== currentCompanyCode) {
      toast({
        title: t("rsAdmin.toasts.errorTitle"),
        description: t("rsAdmin.validation.tinMismatch", { 
          rsTin: trimmedTin, 
          companyCode: currentCompanyCode 
        }),
        variant: "destructive",
      });
      return;
    }
    
    const payloadBase = {
      mainUser: values.mainUser.trim(),
      serviceUser: values.serviceUser.trim(),
      companyTin: trimmedTin,
      companyName: values.companyName.trim(),
      rsUserId: values.rsUserId?.trim() || mainValidation?.rsUserId || null,
      unId: values.unId?.trim() || serviceValidation?.unId || null,
    };

    if (!isEditing) {
      if (!values.mainPassword || !values.servicePassword) {
        toast({
          title: t("rsAdmin.toasts.errorTitle"),
          description: t("rsAdmin.validation.passwordsRequired"),
          variant: "destructive",
        });
        return;
      }

      createCredentialMutation.mutate({
        ...payloadBase,
        mainPassword: values.mainPassword,
        servicePassword: values.servicePassword,
      });
      return;
    }

    const updatePayload: Parameters<typeof updateRsCredential>[1] = {
      ...payloadBase,
    };

    if (values.mainPassword) {
      updatePayload.mainPassword = values.mainPassword;
    }

    if (values.servicePassword) {
      updatePayload.servicePassword = values.servicePassword;
    }

    updateCredentialMutation.mutate({
      id: editingCredential!.id,
      payload: updatePayload,
    });
  };

  const resetToNewCredential = () => {
    setEditingCredential(null);
    setMainValidation(null);
    setServiceValidation(null);
    credentialForm.reset(defaultCredentialValues);
    mainForm.reset({ username: "", password: "" });
    serviceForm.reset({ serviceUser: "", servicePassword: "" });
  };

  return (
    <div className="p-6 space-y-6">
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
            variant="outline"
            onClick={resetToNewCredential}
            disabled={createCredentialMutation.isPending || updateCredentialMutation.isPending}
          >
            <ListChecks className="h-4 w-4 mr-2" />
            {t("rsAdmin.actions.startNew")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("rsAdmin.steps.mainUser.title")}
          </CardTitle>
          <CardDescription>{t("rsAdmin.steps.mainUser.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={mainForm.handleSubmit(handleMainValidate)}
          >
            <div className="space-y-2">
              <Label htmlFor="main-username">{t("rsAdmin.labels.mainUsername")}</Label>
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
              <Label htmlFor="main-password">{t("rsAdmin.labels.mainPassword")}</Label>
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
            <div className="md:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={mainValidationMutation.isPending}
              >
                {mainValidationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("rsAdmin.steps.mainUser.validating")}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    {t("rsAdmin.steps.mainUser.submit")}
                  </>
                )}
              </Button>
            </div>
            {mainValidation && (
              <div className="md:col-span-2">
                <Badge variant="secondary">
                  {t("rsAdmin.steps.mainUser.serviceUsersFound", { count: mainValidation.serviceUsers.length })}
                </Badge>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {t("rsAdmin.steps.serviceUser.title")}
          </CardTitle>
          <CardDescription>{t("rsAdmin.steps.serviceUser.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={serviceForm.handleSubmit(handleServiceValidate)}
          >
            <div className="space-y-2">
              <Label>{t("rsAdmin.labels.serviceUser")}</Label>
              <Select
                value={serviceForm.watch("serviceUser")}
                onValueChange={(value) => {
                  serviceForm.setValue("serviceUser", value);
                  credentialForm.setValue("serviceUser", value);
                }}
                disabled={!mainValidation || serviceValidationMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("rsAdmin.placeholders.selectServiceUser")} />
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
              <Label htmlFor="service-password">{t("rsAdmin.labels.servicePassword")}</Label>
              <Input
                id="service-password"
                type="password"
                placeholder="••••••••"
                disabled={!mainValidation}
                {...serviceForm.register("servicePassword")}
              />
              {serviceForm.formState.errors.servicePassword && (
                <p className="text-sm text-destructive">
                  {serviceForm.formState.errors.servicePassword.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={!mainValidation || serviceValidationMutation.isPending}
              >
                {serviceValidationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("rsAdmin.steps.serviceUser.validating")}
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 mr-2" />
                    {t("rsAdmin.steps.serviceUser.submit")}
                  </>
                )}
              </Button>
            </div>
          </form>

          {serviceValidation && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {t("rsAdmin.labels.companyTin")}
                </p>
                <p className="font-medium">{serviceValidation.companyTin}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {t("rsAdmin.labels.companyName")}
                </p>
                <p className="font-medium">{serviceValidation.companyName ?? t("rsAdmin.labels.notAvailable")}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">UN ID</p>
                <p className="font-medium">{serviceValidation.unId}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RS Credential Wizard Modal */}
      {editingCredential === null && !isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl shadow-2xl overflow-hidden max-w-md w-full">
            {/* Wizard Header */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white p-8 text-center">
              <div className="flex justify-center mb-3">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{t("rsAdmin.title")}</h3>
              <p className="opacity-90 text-sm">{t("rsAdmin.steps.mainUser.title")} - 3-ნაბიჯიანი პროცესი</p>
            </div>

            <div className="bg-white p-8">
              {/* Progress Bar */}
              <div className="mb-6 bg-gray-200 rounded-full h-1 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-purple-700 h-full transition-all duration-300"
                  style={{width: `${((editingCredential ? (mainValidation && serviceValidation ? 66 : 33) : 0) + (mainValidation ? 33 : 0) + (serviceValidation ? 33 : 0))}%`}}
                />
              </div>
              <p className="text-xs text-gray-600 mb-6 font-semibold">
                {mainValidation && serviceValidation ? 'ნაბიჯი 3/3' : mainValidation ? 'ნაბიჯი 2/3' : 'ნაბიჯი 1/3'}
              </p>

              <form onSubmit={credentialForm.handleSubmit(handleCredentialSubmit)} className="space-y-4">
                {/* Step 1: Main Credentials */}
                {!mainValidation && (
                  <>
                    <div className="space-y-3">
                      <Label htmlFor="wizard-main-user" className="text-sm font-semibold text-gray-700">
                        {t("rsAdmin.labels.mainUsername")}
                      </Label>
                      <Input
                        id="wizard-main-user"
                        type="text"
                        placeholder="user@rs.ge"
                        className="rounded-xl border-2 border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 px-4 py-3"
                        {...mainForm.register("username")}
                      />
                      {mainForm.formState.errors.username && (
                        <p className="text-sm text-red-600 mt-1">
                          {mainForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="wizard-main-password" className="text-sm font-semibold text-gray-700">
                        {t("rsAdmin.labels.mainPassword")}
                      </Label>
                      <Input
                        id="wizard-main-password"
                        type="password"
                        placeholder="••••••••"
                        className="rounded-xl border-2 border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 px-4 py-3"
                        {...mainForm.register("password")}
                      />
                      {mainForm.formState.errors.password && (
                        <p className="text-sm text-red-600 mt-1">
                          {mainForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={mainForm.handleSubmit(handleMainValidate)}
                      disabled={mainValidationMutation.isPending}
                      className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-semibold py-3 rounded-xl transition-all hover:shadow-lg"
                    >
                      {mainValidationMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                          {t("rsAdmin.steps.mainUser.validating")}
                        </>
                      ) : (
                        <>
                          {t("rsAdmin.steps.mainUser.submit")} <ChevronRight className="h-4 w-4 ml-2 inline" />
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* Step 2: Service User Credentials */}
                {mainValidation && !serviceValidation && (
                  <>
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <Badge variant="secondary" className="bg-blue-200 text-blue-800">
                        {t("rsAdmin.steps.mainUser.serviceUsersFound", { count: mainValidation.serviceUsers.length })}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="wizard-service-user" className="text-sm font-semibold text-gray-700">
                        {t("rsAdmin.labels.serviceUser")}
                      </Label>
                      <Select
                        value={serviceForm.watch("serviceUser")}
                        onValueChange={(value) => {
                          serviceForm.setValue("serviceUser", value);
                          credentialForm.setValue("serviceUser", value);
                        }}
                      >
                        <SelectTrigger className="rounded-xl border-2 border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-200">
                          <SelectValue placeholder={t("rsAdmin.placeholders.selectServiceUser")} />
                        </SelectTrigger>
                        <SelectContent>
                          {(mainValidation.serviceUsers ?? []).map((user) => (
                            <SelectItem key={user} value={user}>
                              {user}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="wizard-service-password" className="text-sm font-semibold text-gray-700">
                        {t("rsAdmin.labels.servicePassword")}
                      </Label>
                      <Input
                        id="wizard-service-password"
                        type="password"
                        placeholder="••••••••"
                        className="rounded-xl border-2 border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 px-4 py-3"
                        {...serviceForm.register("servicePassword")}
                      />
                      {serviceForm.formState.errors.servicePassword && (
                        <p className="text-sm text-red-600 mt-1">
                          {serviceForm.formState.errors.servicePassword.message}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setMainValidation(null);
                          mainForm.reset({ username: "", password: "" });
                          serviceForm.reset({ serviceUser: "", servicePassword: "" });
                        }}
                        className="flex-1 rounded-xl border-2 border-gray-300 hover:bg-gray-50"
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" /> {t("rsAdmin.actions.back")}
                      </Button>
                      <Button
                        type="button"
                        onClick={serviceForm.handleSubmit(handleServiceValidate)}
                        disabled={serviceValidationMutation.isPending}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all hover:shadow-lg"
                      >
                        {serviceValidationMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                            {t("rsAdmin.steps.serviceUser.validating")}
                          </>
                        ) : (
                          <>
                            {t("rsAdmin.actions.verify")} <ChevronRight className="h-4 w-4 ml-2 inline" />
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {/* Step 3: Confirmation */}
                {mainValidation && serviceValidation && (
                  <>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200 mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3">გთხოვთ, შეამოწმოთ RS.GE-დან მიღებული მონაცემები:</p>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-gray-600 font-semibold">დასახელება:</p>
                          <p className="font-bold text-gray-900">{serviceValidation.companyName || credentialForm.watch("companyName")}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-semibold">საიდ. კოდი (TIN):</p>
                          <p className="font-bold text-gray-900">{serviceValidation.companyTin}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setServiceValidation(null);
                          serviceForm.reset({ serviceUser: "", servicePassword: "" });
                        }}
                        className="flex-1 rounded-xl border-2 border-gray-300 hover:bg-gray-50"
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" /> {t("rsAdmin.actions.back")}
                      </Button>
                      <Button
                        type="submit"
                        disabled={createCredentialMutation.isPending}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-semibold rounded-xl transition-all hover:shadow-lg"
                      >
                        {createCredentialMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                            {t("rsAdmin.actions.saving")}
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 mr-2 inline" /> {t("rsAdmin.actions.save")}
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Existing Card for Editing */}
      {isEditing && editingCredential && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              {t("rsAdmin.steps.credentials.title")} - {t("rsAdmin.actions.edit")}
            </CardTitle>
            <CardDescription>{editingCredential.companyName}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={credentialForm.handleSubmit(handleCredentialSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="final-main-user">{t("rsAdmin.labels.mainUsername")}</Label>
                  <Input
                    id="final-main-user"
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
                  <Label htmlFor="final-main-password">{t("rsAdmin.labels.mainPassword")}</Label>
                  <Input
                    id="final-main-password"
                    type="password"
                    placeholder={isEditing ? t("rsAdmin.placeholders.leaveBlank") : "••••••••"}
                    {...credentialForm.register("mainPassword")}
                  />
                  {credentialForm.formState.errors.mainPassword && (
                    <p className="text-sm text-destructive">
                      {credentialForm.formState.errors.mainPassword.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="final-service-user">{t("rsAdmin.labels.serviceUser")}</Label>
                  <Input
                    id="final-service-user"
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
                  <Label htmlFor="final-service-password">{t("rsAdmin.labels.servicePassword")}</Label>
                  <Input
                    id="final-service-password"
                    type="password"
                    placeholder={isEditing ? t("rsAdmin.placeholders.leaveBlank") : "••••••••"}
                    {...credentialForm.register("servicePassword")}
                  />
                  {credentialForm.formState.errors.servicePassword && (
                    <p className="text-sm text-destructive">
                      {credentialForm.formState.errors.servicePassword.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="final-company-tin">{t("rsAdmin.labels.companyTin")}</Label>
                  <Input
                    id="final-company-tin"
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
                  <Label htmlFor="final-company-name">{t("rsAdmin.labels.companyName")}</Label>
                  <Input
                    id="final-company-name"
                    placeholder={t("rsAdmin.placeholders.companyName") || ""}
                    {...credentialForm.register("companyName")}
                  />
                  {credentialForm.formState.errors.companyName && (
                    <p className="text-sm text-destructive">
                      {credentialForm.formState.errors.companyName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="final-rs-user-id">{t("rsAdmin.labels.rsUserId")}</Label>
                  <Input
                    id="final-rs-user-id"
                    placeholder={t("rsAdmin.placeholders.optional") || ""}
                    {...credentialForm.register("rsUserId")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="final-un-id">UN ID</Label>
                  <Input
                    id="final-un-id"
                    placeholder={t("rsAdmin.placeholders.optional") || ""}
                    {...credentialForm.register("unId")}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                {isEditing && (
                  <p className="text-sm text-muted-foreground">
                    {t("rsAdmin.hints.updatePasswords")}
                  </p>
                )}
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

      <Card>
        <CardHeader>
          <CardTitle>{t("rsAdmin.storedCredentials.title")}</CardTitle>
          <CardDescription>{t("rsAdmin.storedCredentials.description")}</CardDescription>
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

