import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, XCircle } from "lucide-react";

const connectionFormSchema = z.object({
    type: z.enum(["mssql", "ssh"]),
    name: z.string().min(1, "Name is required"),
    server: z.string().min(1, "Server/Host is required"),
    database: z.string().optional(), // Required for MSSQL
    username: z.string().min(1, "Username is required"),
    password: z.string().optional(),
    privateKey: z.string().optional(),
    port: z.coerce.number().default(1433),
    encrypt: z.boolean().default(true),
    trustServerCertificate: z.boolean().default(true),
}).refine(data => {
    if (data.type === 'mssql' && !data.database) {
        return false;
    }
    return true;
}, {
    message: "Database is required for MSSQL connections",
    path: ["database"]
});

type ConnectionFormValues = z.infer<typeof connectionFormSchema>;

interface ConnectionManagerProps {
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export function ConnectionManager({ trigger, onSuccess }: ConnectionManagerProps) {
    const [open, setOpen] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; title: string; message: string } | null>(null);
    const { toast } = useToast();

    const form = useForm<ConnectionFormValues>({
        resolver: zodResolver(connectionFormSchema),
        defaultValues: {
            type: "mssql",
            name: "",
            server: "",
            database: "",
            username: "",
            password: "",
            privateKey: "",
            port: 1433,
            encrypt: true,
            trustServerCertificate: true,
        },
    });

    const watchedType = form.watch("type");

    // Update port default when type changes
    React.useEffect(() => {
        if (watchedType === 'ssh') {
            form.setValue('port', 22);
        } else {
            form.setValue('port', 1433);
        }
    }, [watchedType, form]);


    async function onSubmit(data: ConnectionFormValues) {
        try {
            await apiRequest("POST", "/api/mssql-explorer/connections", data);

            toast({
                title: "Connection saved",
                description: `${data.type.toUpperCase()} connection has been saved.`,
            });

            setOpen(false);
            form.reset();
            queryClient.invalidateQueries({ queryKey: ["/api/mssql-explorer/connections"] });
            onSuccess?.();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error saving connection",
                description: error.message,
            });
        }
    }

    async function onTestConnection() {
        const data = form.getValues();
        // Validation for required test fields
        if (!data.server || !data.username) {
            toast({
                variant: "destructive",
                title: "Missing fields",
                description: "Server and Username are required.",
            });
            return;
        }

        setIsTesting(true);
        try {
            const response = await apiRequest("POST", "/api/mssql-explorer/test", data);
            const result = await response.json();

            if (result.success) {
                setTestResult({
                    success: true,
                    title: "Connection Successful",
                    message: result.message + (result.version ? `\n${result.version}` : "")
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            setTestResult({
                success: false,
                title: "Connection Failed",
                message: error.message || "Failed to establish connection."
            });
        } finally {
            setIsTesting(false);
        }
    }

    return (
        <>
            <AlertDialog open={!!testResult} onOpenChange={(open) => !open && setTestResult(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            {testResult?.success ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                                <XCircle className="h-5 w-5 text-destructive" />
                            )}
                            {testResult?.title}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="whitespace-pre-wrap">
                            {testResult?.message}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setTestResult(null)}>
                            {testResult?.success ? "Great!" : "Close"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {trigger || (
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Connection
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add New Connection</DialogTitle>
                        <DialogDescription>
                            Configure a new database or SSH connection.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Connection Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="mssql">MSSQL Database</SelectItem>
                                                <SelectItem value="ssh">SSH Server</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Connection Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="My Connection" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="server"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Host / Server</FormLabel>
                                            <FormControl>
                                                <Input placeholder={watchedType === 'ssh' ? "192.168.1.1" : "localhost"} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="port"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Port</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {watchedType === 'mssql' && (
                                <FormField
                                    control={form.control}
                                    name="database"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Database</FormLabel>
                                            <FormControl>
                                                <Input placeholder="master" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Username</FormLabel>
                                            <FormControl>
                                                <Input placeholder={watchedType === 'ssh' ? "root" : "sa"} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="********" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {watchedType === 'ssh' && (
                                <FormField
                                    control={form.control}
                                    name="privateKey"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Private Key (Optional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="-----BEGIN RSA PRIVATE KEY-----..."
                                                    className="font-mono text-xs"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>Leave empty if using password</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {watchedType === 'mssql' && (
                                <div className="flex space-x-4">
                                    <FormField
                                        control={form.control}
                                        name="encrypt"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-2">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>Encrypt</FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="trustServerCertificate"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-2">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>Trust Cert</FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            <DialogFooter className="flex justify-between sm:justify-between">
                                <Button type="button" variant="outline" onClick={onTestConnection} disabled={isTesting}>
                                    {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Test Connection
                                </Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}
