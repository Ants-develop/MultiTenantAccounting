import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, Building2, DollarSign, Shield, Users, Bell, 
  Calendar, Globe, Save, RotateCcw, AlertTriangle, CheckCircle,
  FileText, Archive, Database, Lock, Eye, EyeOff, BarChart3
} from "lucide-react";
import { useCompany } from "@/hooks/useCompany";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Company } from "@shared/schema";

interface CompanySettings extends Company {
  settings: {
    notifications: {
      emailNotifications: boolean;
      invoiceReminders: boolean;
      paymentAlerts: boolean;
      reportReminders: boolean;
      systemUpdates: boolean;
    };
    financial: {
      autoNumbering: boolean;
      invoicePrefix: string;
      billPrefix: string;
      journalPrefix: string;
      decimalPlaces: number;
      negativeFormat: string;
      dateFormat: string;
      timeZone: string;
    };
    security: {
      requirePasswordChange: boolean;
      passwordExpireDays: number;
      sessionTimeout: number;
      enableTwoFactor: boolean;
      allowMultipleSessions: boolean;
    };
    backup: {
      autoBackup: boolean;
      backupFrequency: string;
      retentionDays: number;
      backupLocation: string;
    };
    integration: {
      bankConnection: boolean;
      paymentGateway: boolean;
      taxService: boolean;
      reportingTools: boolean;
    };
  };
}

const companyInfoSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  code: z.string().min(1, "Company code is required").max(10, "Code must be 10 characters or less"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  taxId: z.string().optional(),
  fiscalYearStart: z.number().min(1).max(12),
  currency: z.string().min(3).max(3),
});

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  invoiceReminders: z.boolean(),
  paymentAlerts: z.boolean(),
  reportReminders: z.boolean(),
  systemUpdates: z.boolean(),
});

const financialSettingsSchema = z.object({
  autoNumbering: z.boolean(),
  invoicePrefix: z.string().max(10),
  billPrefix: z.string().max(10),
  journalPrefix: z.string().max(10),
  decimalPlaces: z.number().min(0).max(4),
  negativeFormat: z.enum(["parentheses", "minus", "color"]),
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
  timeZone: z.string(),
});

const securitySettingsSchema = z.object({
  requirePasswordChange: z.boolean(),
  passwordExpireDays: z.number().min(0).max(365),
  sessionTimeout: z.number().min(5).max(480),
  enableTwoFactor: z.boolean(),
  allowMultipleSessions: z.boolean(),
});

type CompanyInfoForm = z.infer<typeof companyInfoSchema>;
type NotificationSettingsForm = z.infer<typeof notificationSettingsSchema>;
type FinancialSettingsForm = z.infer<typeof financialSettingsSchema>;
type SecuritySettingsForm = z.infer<typeof securitySettingsSchema>;

export default function Settings() {
  const [activeTab, setActiveTab] = useState("company");
  const [showTaxId, setShowTaxId] = useState(false);
  
  const { currentCompany } = useCompany();
  const { canEditSettings, canViewSettings } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: companySettings, isLoading: settingsLoading } = useQuery<CompanySettings>({
    queryKey: ['/api/company/settings', currentCompany?.id],
    queryFn: async () => {
      const response = await fetch(`/api/company/settings/${currentCompany?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch company settings');
      }
      return response.json();
    },
    enabled: !!currentCompany && canViewSettings(),
  });

  // Forms
  const companyForm = useForm<CompanyInfoForm>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      phone: "",
      email: "",
      taxId: "",
      fiscalYearStart: 1,
      currency: "USD",
    },
  });

  const notificationForm = useForm<NotificationSettingsForm>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      invoiceReminders: true,
      paymentAlerts: true,
      reportReminders: false,
      systemUpdates: true,
    },
  });

  const financialForm = useForm<FinancialSettingsForm>({
    resolver: zodResolver(financialSettingsSchema),
    defaultValues: {
      autoNumbering: true,
      invoicePrefix: "INV",
      billPrefix: "BILL",
      journalPrefix: "JE",
      decimalPlaces: 2,
      negativeFormat: "minus",
      dateFormat: "MM/DD/YYYY",
      timeZone: "America/New_York",
    },
  });

  const securityForm = useForm<SecuritySettingsForm>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      requirePasswordChange: false,
      passwordExpireDays: 90,
      sessionTimeout: 30,
      enableTwoFactor: false,
      allowMultipleSessions: true,
    },
  });

  // Update forms when data loads
  useEffect(() => {
    if (companySettings) {
      companyForm.reset({
        name: companySettings.name,
        code: companySettings.code,
        address: companySettings.address || "",
        phone: companySettings.phone || "",
        email: companySettings.email || "",
        taxId: companySettings.taxId || "",
        fiscalYearStart: companySettings.fiscalYearStart || 1,
        currency: companySettings.currency || "USD",
      });

      if (companySettings.settings) {
        notificationForm.reset(companySettings.settings.notifications);
        financialForm.reset({
          ...companySettings.settings.financial,
          negativeFormat: companySettings.settings.financial.negativeFormat as "parentheses" | "minus" | "color",
          dateFormat: companySettings.settings.financial.dateFormat as "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD"
        });
        securityForm.reset(companySettings.settings.security);
      }
    }
  }, [companySettings, companyForm, notificationForm, financialForm, securityForm]);

  // Mutations
  const updateCompanyInfoMutation = useMutation({
    mutationFn: (data: CompanyInfoForm) => 
      apiRequest('PUT', `/api/company/settings/${currentCompany?.id}/info`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/settings', currentCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Company information updated",
        description: "Your company information has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update company information",
        variant: "destructive",
      });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: (data: NotificationSettingsForm) =>
      apiRequest('PUT', `/api/company/settings/${currentCompany?.id}/notifications`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/settings', currentCompany?.id] });
      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update notification settings",
        variant: "destructive",
      });
    },
  });

  const updateFinancialMutation = useMutation({
    mutationFn: (data: FinancialSettingsForm) =>
      apiRequest('PUT', `/api/company/settings/${currentCompany?.id}/financial`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/settings', currentCompany?.id] });
      toast({
        title: "Financial settings updated",
        description: "Your financial preferences have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update financial settings",
        variant: "destructive",
      });
    },
  });

  const updateSecurityMutation = useMutation({
    mutationFn: (data: SecuritySettingsForm) =>
      apiRequest('PUT', `/api/company/settings/${currentCompany?.id}/security`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/settings', currentCompany?.id] });
      toast({
        title: "Security settings updated",
        description: "Your security preferences have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update security settings",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onCompanyInfoSubmit = (data: CompanyInfoForm) => {
    if (!canEditSettings()) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to edit settings.",
        variant: "destructive",
      });
      return;
    }
    updateCompanyInfoMutation.mutate(data);
  };

  const onNotificationSubmit = (data: NotificationSettingsForm) => {
    if (!canEditSettings()) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to edit settings.",
        variant: "destructive",
      });
      return;
    }
    updateNotificationsMutation.mutate(data);
  };

  const onFinancialSubmit = (data: FinancialSettingsForm) => {
    if (!canEditSettings()) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to edit settings.",
        variant: "destructive",
      });
      return;
    }
    updateFinancialMutation.mutate(data);
  };

  const onSecuritySubmit = (data: SecuritySettingsForm) => {
    if (!canEditSettings()) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to edit settings.",
        variant: "destructive",
      });
      return;
    }
    updateSecurityMutation.mutate(data);
  };

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground">No Company Selected</h3>
          <p className="text-muted-foreground">Please select a company to view settings.</p>
        </div>
      </div>
    );
  }

  if (!canViewSettings()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Access Denied</h3>
          <p className="text-muted-foreground">You don't have permission to view settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <SettingsIcon className="w-6 h-6 mr-2" />
            Company Settings
          </h1>
          <p className="text-muted-foreground">
            Manage settings for {currentCompany.name}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center">
            <Building2 className="w-3 h-3 mr-1" />
            {currentCompany.code}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* Company Information Tab */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={companyForm.handleSubmit(onCompanyInfoSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      {...companyForm.register("name")}
                      placeholder="Enter company name"
                      disabled={!canEditSettings()}
                    />
                    {companyForm.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {companyForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="code">Company Code *</Label>
                    <Input
                      id="code"
                      {...companyForm.register("code")}
                      placeholder="e.g., ACME"
                      className="uppercase"
                      disabled={!canEditSettings()}
                    />
                    {companyForm.formState.errors.code && (
                      <p className="text-sm text-destructive">
                        {companyForm.formState.errors.code.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    {...companyForm.register("address")}
                    placeholder="Enter company address"
                    rows={3}
                    disabled={!canEditSettings()}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      {...companyForm.register("phone")}
                      placeholder="Enter phone number"
                      disabled={!canEditSettings()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...companyForm.register("email")}
                      placeholder="company@example.com"
                      disabled={!canEditSettings()}
                    />
                    {companyForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {companyForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxId" className="flex items-center">
                      Tax ID
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-auto p-0"
                        onClick={() => setShowTaxId(!showTaxId)}
                      >
                        {showTaxId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </Label>
                    <Input
                      id="taxId"
                      {...companyForm.register("taxId")}
                      type={showTaxId ? "text" : "password"}
                      placeholder="Enter tax ID"
                      disabled={!canEditSettings()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fiscalYearStart">Fiscal Year Start</Label>
                    <Select
                      value={companyForm.watch("fiscalYearStart")?.toString()}
                      onValueChange={(value) => companyForm.setValue("fiscalYearStart", parseInt(value))}
                      disabled={!canEditSettings()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { value: 1, label: "January" },
                          { value: 2, label: "February" },
                          { value: 3, label: "March" },
                          { value: 4, label: "April" },
                          { value: 5, label: "May" },
                          { value: 6, label: "June" },
                          { value: 7, label: "July" },
                          { value: 8, label: "August" },
                          { value: 9, label: "September" },
                          { value: 10, label: "October" },
                          { value: 11, label: "November" },
                          { value: 12, label: "December" },
                        ].map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={companyForm.watch("currency")}
                      onValueChange={(value) => companyForm.setValue("currency", value)}
                      disabled={!canEditSettings()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                        <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {canEditSettings() && (
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => companyForm.reset()}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateCompanyInfoMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateCompanyInfoMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Settings Tab */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Financial Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={financialForm.handleSubmit(onFinancialSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Document Numbering</h4>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="autoNumbering"
                      checked={financialForm.watch("autoNumbering")}
                      onCheckedChange={(checked) => financialForm.setValue("autoNumbering", checked)}
                      disabled={!canEditSettings()}
                    />
                    <Label htmlFor="autoNumbering">Enable automatic document numbering</Label>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                      <Input
                        id="invoicePrefix"
                        {...financialForm.register("invoicePrefix")}
                        placeholder="INV"
                        disabled={!canEditSettings()}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="billPrefix">Bill Prefix</Label>
                      <Input
                        id="billPrefix"
                        {...financialForm.register("billPrefix")}
                        placeholder="BILL"
                        disabled={!canEditSettings()}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="journalPrefix">Journal Entry Prefix</Label>
                      <Input
                        id="journalPrefix"
                        {...financialForm.register("journalPrefix")}
                        placeholder="JE"
                        disabled={!canEditSettings()}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Display Formats</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="decimalPlaces">Decimal Places</Label>
                      <Select
                        value={financialForm.watch("decimalPlaces")?.toString()}
                        onValueChange={(value) => financialForm.setValue("decimalPlaces", parseInt(value))}
                        disabled={!canEditSettings()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select decimal places" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 (1234)</SelectItem>
                          <SelectItem value="1">1 (1234.5)</SelectItem>
                          <SelectItem value="2">2 (1234.56)</SelectItem>
                          <SelectItem value="3">3 (1234.567)</SelectItem>
                          <SelectItem value="4">4 (1234.5678)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="negativeFormat">Negative Number Format</Label>
                      <Select
                        value={financialForm.watch("negativeFormat")}
                        onValueChange={(value) => financialForm.setValue("negativeFormat", value as any)}
                        disabled={!canEditSettings()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minus">-1,234.56</SelectItem>
                          <SelectItem value="parentheses">(1,234.56)</SelectItem>
                          <SelectItem value="color">1,234.56 (red)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Date Format</Label>
                      <Select
                        value={financialForm.watch("dateFormat")}
                        onValueChange={(value) => financialForm.setValue("dateFormat", value as any)}
                        disabled={!canEditSettings()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select date format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timeZone">Time Zone</Label>
                      <Select
                        value={financialForm.watch("timeZone")}
                        onValueChange={(value) => financialForm.setValue("timeZone", value)}
                        disabled={!canEditSettings()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select time zone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time (EST/EDT)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (CST/CDT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (MST/MDT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (PST/PDT)</SelectItem>
                          <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                          <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                          <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {canEditSettings() && (
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => financialForm.reset()}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateFinancialMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateFinancialMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive general email notifications
                      </p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={notificationForm.watch("emailNotifications")}
                      onCheckedChange={(checked) => notificationForm.setValue("emailNotifications", checked)}
                      disabled={!canEditSettings()}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="invoiceReminders">Invoice Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about overdue invoices
                      </p>
                    </div>
                    <Switch
                      id="invoiceReminders"
                      checked={notificationForm.watch("invoiceReminders")}
                      onCheckedChange={(checked) => notificationForm.setValue("invoiceReminders", checked)}
                      disabled={!canEditSettings()}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="paymentAlerts">Payment Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when payments are received
                      </p>
                    </div>
                    <Switch
                      id="paymentAlerts"
                      checked={notificationForm.watch("paymentAlerts")}
                      onCheckedChange={(checked) => notificationForm.setValue("paymentAlerts", checked)}
                      disabled={!canEditSettings()}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="reportReminders">Report Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get reminded about monthly/quarterly reports
                      </p>
                    </div>
                    <Switch
                      id="reportReminders"
                      checked={notificationForm.watch("reportReminders")}
                      onCheckedChange={(checked) => notificationForm.setValue("reportReminders", checked)}
                      disabled={!canEditSettings()}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="systemUpdates">System Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about system updates and maintenance
                      </p>
                    </div>
                    <Switch
                      id="systemUpdates"
                      checked={notificationForm.watch("systemUpdates")}
                      onCheckedChange={(checked) => notificationForm.setValue("systemUpdates", checked)}
                      disabled={!canEditSettings()}
                    />
                  </div>
                </div>

                {canEditSettings() && (
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => notificationForm.reset()}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateNotificationsMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateNotificationsMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="requirePasswordChange">Require Password Changes</Label>
                      <p className="text-sm text-muted-foreground">
                        Force users to change passwords periodically
                      </p>
                    </div>
                    <Switch
                      id="requirePasswordChange"
                      checked={securityForm.watch("requirePasswordChange")}
                      onCheckedChange={(checked) => securityForm.setValue("requirePasswordChange", checked)}
                      disabled={!canEditSettings()}
                    />
                  </div>

                  {securityForm.watch("requirePasswordChange") && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="passwordExpireDays">Password Expiry (days)</Label>
                      <Input
                        id="passwordExpireDays"
                        type="number"
                        min="1"
                        max="365"
                        {...securityForm.register("passwordExpireDays", { valueAsNumber: true })}
                        disabled={!canEditSettings()}
                      />
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      min="5"
                      max="480"
                      {...securityForm.register("sessionTimeout", { valueAsNumber: true })}
                      disabled={!canEditSettings()}
                    />
                    <p className="text-sm text-muted-foreground">
                      Users will be logged out after this period of inactivity
                    </p>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enableTwoFactor">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Require 2FA for all users in this company
                      </p>
                    </div>
                    <Switch
                      id="enableTwoFactor"
                      checked={securityForm.watch("enableTwoFactor")}
                      onCheckedChange={(checked) => securityForm.setValue("enableTwoFactor", checked)}
                      disabled={!canEditSettings()}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allowMultipleSessions">Multiple Sessions</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow users to be logged in from multiple devices
                      </p>
                    </div>
                    <Switch
                      id="allowMultipleSessions"
                      checked={securityForm.watch("allowMultipleSessions")}
                      onCheckedChange={(checked) => securityForm.setValue("allowMultipleSessions", checked)}
                      disabled={!canEditSettings()}
                    />
                  </div>
                </div>

                {canEditSettings() && (
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => securityForm.reset()}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateSecurityMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateSecurityMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                Integrations & Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Available Integrations</h4>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h5 className="font-medium">Bank Connection</h5>
                      <p className="text-sm text-muted-foreground">
                        Connect your bank accounts for automatic transaction import
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      <Database className="w-4 h-4 mr-2" />
                      Coming Soon
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h5 className="font-medium">Payment Gateway</h5>
                      <p className="text-sm text-muted-foreground">
                        Accept online payments through integrated gateways
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Coming Soon
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h5 className="font-medium">Tax Service</h5>
                      <p className="text-sm text-muted-foreground">
                        Integrate with tax preparation services
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      <FileText className="w-4 h-4 mr-2" />
                      Coming Soon
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h5 className="font-medium">Reporting Tools</h5>
                      <p className="text-sm text-muted-foreground">
                        Export data to external reporting platforms
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Coming Soon
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Data Management</h4>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h5 className="font-medium">Export Company Data</h5>
                      <p className="text-sm text-muted-foreground">
                        Export all company data for backup or migration
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/company/${currentCompany?.id}/export`, {
                            credentials: 'include'
                          });
                          if (!response.ok) {
                            throw new Error('Failed to export data');
                          }
                          
                          // Get JSON data directly instead of blob for better memory efficiency
                          const data = await response.json();
                          const jsonString = JSON.stringify(data, null, 2);
                          
                          // Create optimized blob and trigger download
                          const blob = new Blob([jsonString], { type: 'application/json' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `company-${currentCompany?.code}-export-${new Date().toISOString().split('T')[0]}.json`;
                          document.body.appendChild(a);
                          a.click();
                          
                          // Clean up immediately
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          
                          toast({
                            title: "Export successful",
                            description: "Company data has been exported successfully.",
                          });
                        } catch (error) {
                          console.error('Export error:', error);
                          toast({
                            title: "Export failed",
                            description: "Failed to export company data. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h5 className="font-medium">Archive Company</h5>
                      <p className="text-sm text-muted-foreground">
                        Archive this company (can be restored later)
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      disabled={!canEditSettings()}
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to archive this company? This will make it inactive but data will be preserved.')) {
                          try {
                            const response = await fetch(`/api/company/${currentCompany?.id}/archive`, {
                              method: 'PUT',
                            });
                            if (!response.ok) {
                              throw new Error('Failed to archive company');
                            }
                            
                            toast({
                              title: "Company archived",
                              description: "The company has been archived successfully.",
                            });
                            
                            // Refresh company data
                            queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                          } catch (error) {
                            toast({
                              title: "Archive failed",
                              description: "Failed to archive company. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Archive
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 