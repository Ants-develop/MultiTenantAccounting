import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileText, Download, AlertCircle, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Expected field definitions
const EXPECTED_FIELDS = [
    { key: 'name', label: 'Name', required: true },
    { key: 'code', label: 'Code', required: true },
    { key: 'tenantCode', label: 'Tenant Code', required: false },
    { key: 'address', label: 'Address', required: false },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'taxId', label: 'Tax ID', required: false },
    { key: 'fiscalYearStart', label: 'Fiscal Year Start', required: false },
    { key: 'currency', label: 'Currency', required: false },
    { key: 'manager', label: 'Manager', required: false },
    { key: 'accountingSoftware', label: 'Accounting Software', required: false },
    { key: 'idCode', label: 'ID Code', required: false },
    { key: 'verificationStatus', label: 'Verification Status', required: false },
];

// CSV Import Preview Dialog
function CSVImportDialog({
    open,
    onOpenChange,
    onImport
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (clients: any[]) => void;
}) {
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvRows, setCsvRows] = useState<string[][]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [mappedData, setMappedData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({});
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateClient = (client: any, rowIndex: number): string[] => {
        const errors: string[] = [];

        if (!client.name || client.name.trim() === '') {
            errors.push('Name is required');
        }

        if (!client.code || client.code.trim() === '') {
            errors.push('Code is required');
        }

        if (client.email && client.email.trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(client.email)) {
                errors.push('Invalid email format');
            }
        }

        if (client.fiscalYearStart && client.fiscalYearStart !== '') {
            const fiscalYearStr = String(client.fiscalYearStart).trim();
            if (fiscalYearStr !== '') {
                const fiscalYear = parseInt(fiscalYearStr);
                if (isNaN(fiscalYear) || fiscalYear < 1 || fiscalYear > 12) {
                    errors.push('Fiscal year must be 1-12');
                }
            }
        }

        return errors;
    };

    // Robust CSV parser that handles quoted fields with commas
    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        return result;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);

        // Read file as ArrayBuffer first to handle encoding properly
        const arrayBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(arrayBuffer);

        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            alert('CSV file must have headers and at least one row');
            setIsProcessing(false);
            return;
        }

        const headers = parseCSVLine(lines[0]).map(h => h.replace(/\*/g, ''));
        const rows = lines.slice(1).map(line => parseCSVLine(line));

        // Check for column mismatch
        if (rows.length > 0 && rows[0].length > headers.length) {
            alert(`Warning: Your CSV data has ${rows[0].length} columns but only ${headers.length} headers. This usually means a header is missing (e.g. City), causing data to shift. Please check your CSV file.`);
        }

        setCsvHeaders(headers);
        setCsvRows(rows);

        // Auto-map columns with matching names (case-insensitive)
        const autoMapping: Record<string, string> = {};
        EXPECTED_FIELDS.forEach(field => {
            const matchingHeader = headers.find(h =>
                h.toLowerCase() === field.key.toLowerCase() ||
                h.toLowerCase() === field.label.toLowerCase()
            );
            if (matchingHeader) {
                autoMapping[field.key] = matchingHeader;
            }
        });

        setColumnMapping(autoMapping);
        setStep('mapping');
        setIsProcessing(false);
    };

    const handleMappingComplete = () => {
        // Check if required fields are mapped
        const requiredFields = EXPECTED_FIELDS.filter(f => f.required);
        const missingRequired = requiredFields.filter(f => !columnMapping[f.key]);

        if (missingRequired.length > 0) {
            alert(`Please map required fields: ${missingRequired.map(f => f.label).join(', ')}`);
            return;
        }

        // Map CSV rows to client objects
        const mapped = csvRows.map(row => {
            const client: any = {};
            EXPECTED_FIELDS.forEach(field => {
                const csvHeader = columnMapping[field.key];
                if (csvHeader) {
                    const headerIndex = csvHeaders.indexOf(csvHeader);
                    if (headerIndex !== -1) {
                        client[field.key] = row[headerIndex] || '';
                    }
                }
            });

            return client;
        });

        // Validate all rows
        const errors: Record<number, string[]> = {};
        mapped.forEach((row, index) => {
            const rowErrors = validateClient(row, index);
            if (rowErrors.length > 0) {
                errors[index] = rowErrors;
            }
        });

        setMappedData(mapped);
        setValidationErrors(errors);
        setStep('preview');
    };

    const handleImport = () => {
        if (Object.keys(validationErrors).length > 0) {
            alert('Please fix validation errors before importing');
            return;
        }
        onImport(mappedData);
        // Reset state
        setCsvHeaders([]);
        setCsvRows([]);
        setColumnMapping({});
        setMappedData([]);
        setValidationErrors({});
        setStep('upload');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleBack = () => {
        if (step === 'preview') {
            setStep('mapping');
        } else if (step === 'mapping') {
            setStep('upload');
            setCsvHeaders([]);
            setCsvRows([]);
            setColumnMapping({});
        }
    };

    const hasErrors = Object.keys(validationErrors).length > 0;
    const validRows = mappedData.length - Object.keys(validationErrors).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[90vw] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import Client Companies from CSV</DialogTitle>
                    <DialogDescription>
                        {step === 'upload' && 'Upload a CSV file with client data'}
                        {step === 'mapping' && 'Map your CSV columns to the expected fields'}
                        {step === 'preview' && 'Preview and validate before importing'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Step 1: Upload */}
                    {step === 'upload' && (
                        <div>
                            <label className="text-sm font-medium mb-2 block">CSV File</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                disabled={isProcessing}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Upload any CSV file. You'll be able to map columns in the next step.
                            </p>
                        </div>
                    )}

                    {/* Step 2: Column Mapping */}
                    {step === 'mapping' && (
                        <div className="space-y-4">
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Map Your Columns</AlertTitle>
                                <AlertDescription>
                                    Match your CSV columns to the expected fields. Required fields are marked with *.
                                </AlertDescription>
                            </Alert>

                            <div className="border rounded-lg p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold">Column Mapping</h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setColumnMapping({})}
                                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                    >
                                        Clear All
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                                    {EXPECTED_FIELDS.map(field => (
                                        <div key={field.key} className="grid grid-cols-[140px_auto_1fr] gap-2 items-center text-sm">
                                            <div className="flex items-center gap-1 truncate">
                                                <span className="font-medium truncate" title={field.label}>{field.label}</span>
                                                {field.required && <span className="text-destructive text-xs">*</span>}
                                            </div>
                                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                            <Select
                                                value={columnMapping[field.key] || ''}
                                                onValueChange={(value) => setColumnMapping(prev => ({
                                                    ...prev,
                                                    [field.key]: value === "__unmapped__" ? "" : value
                                                }))}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Select column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__unmapped__">-- Not mapped --</SelectItem>
                                                    {csvHeaders.map(header => (
                                                        <SelectItem key={header} value={header} className="text-xs">
                                                            {header}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border rounded-lg p-4">
                                <h4 className="font-semibold mb-2">Data Preview (Based on Mapping)</h4>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {EXPECTED_FIELDS.map(field => (
                                                    <TableHead key={field.key} className="min-w-[100px] align-top py-2">
                                                        {field.label}
                                                        {field.required && <span className="text-destructive ml-1">*</span>}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {csvRows.slice(0, 15).map((row, rowIdx) => (
                                                <TableRow key={rowIdx}>
                                                    {EXPECTED_FIELDS.map(field => {
                                                        const mappedHeader = columnMapping[field.key];
                                                        let cellValue = '-';

                                                        if (mappedHeader) {
                                                            const headerIndex = csvHeaders.indexOf(mappedHeader);
                                                            if (headerIndex !== -1) {
                                                                cellValue = row[headerIndex] || '';
                                                            }
                                                        }

                                                        return (
                                                            <TableCell key={field.key} className="text-xs whitespace-nowrap">
                                                                {cellValue || '-'}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview */}
                    {step === 'preview' && mappedData.length > 0 && (
                        <>
                            {hasErrors && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Validation Errors</AlertTitle>
                                    <AlertDescription>
                                        {Object.keys(validationErrors).length} row(s) have errors. Fix them before importing.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {!hasErrors && (
                                <Alert>
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertTitle>Ready to Import</AlertTitle>
                                    <AlertDescription>
                                        All {mappedData.length} rows validated successfully.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="border rounded-lg">
                                <div className="p-4 bg-muted flex justify-between items-center">
                                    <p className="text-sm font-medium">
                                        Preview: {mappedData.length} clients ({validRows} valid, {Object.keys(validationErrors).length} errors)
                                    </p>
                                </div>
                                <div className="max-h-[400px] overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Code</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Manager</TableHead>
                                                <TableHead>Currency</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {mappedData.map((row, idx) => {
                                                const rowErrors = validationErrors[idx];
                                                const hasError = rowErrors && rowErrors.length > 0;

                                                return (
                                                    <TableRow key={idx} className={hasError ? 'bg-destructive/10' : ''}>
                                                        <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                                                        <TableCell>{row.name || '-'}</TableCell>
                                                        <TableCell className="font-mono text-xs">{row.code || '-'}</TableCell>
                                                        <TableCell className="text-xs">{row.email || '-'}</TableCell>
                                                        <TableCell className="text-xs">{row.manager || '-'}</TableCell>
                                                        <TableCell>{row.currency || 'GEL'}</TableCell>
                                                        <TableCell>
                                                            {hasError ? (
                                                                <div className="flex items-center gap-1 text-destructive">
                                                                    <XCircle className="w-4 h-4" />
                                                                    <span className="text-xs">{rowErrors.join(', ')}</span>
                                                                </div>
                                                            ) : (
                                                                <Badge variant="outline" className="text-green-600">
                                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                    Valid
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    {step !== 'upload' && (
                        <Button variant="outline" onClick={handleBack}>
                            Back
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    {step === 'mapping' && (
                        <Button onClick={handleMappingComplete}>
                            Continue to Preview
                        </Button>
                    )}
                    {step === 'preview' && (
                        <Button
                            onClick={handleImport}
                            disabled={mappedData.length === 0 || isProcessing || hasErrors}
                        >
                            Import {validRows} Client{validRows !== 1 ? 's' : ''}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent >
        </Dialog >
    );
}

export default function ClientImport() {
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [importResults, setImportResults] = useState<any>(null);
    const { toast } = useToast();

    // Import mutation
    const importMutation = useMutation({
        mutationFn: async (clients: any[]) => {
            return await apiRequest("POST", "/api/clients/import", { clients });
        },
        onSuccess: (response: any) => {
            queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
            setImportResults(response);

            const { imported, duplicates, errors } = response;

            if (errors.length > 0) {
                toast({
                    title: "Import Completed with Errors",
                    description: `Imported: ${imported}, Duplicates: ${duplicates}, Errors: ${errors.length}`,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Import Complete",
                    description: `Successfully imported ${imported} clients. Duplicates skipped: ${duplicates}`,
                });
            }

            if (imported > 0 || duplicates > 0) {
                setIsImportDialogOpen(false);
            }
        },
        onError: (error: any) => {
            toast({
                title: "Import Failed",
                description: error.message || "Failed to import clients",
                variant: "destructive",
            });
        },
    });

    const handleImport = (clients: any[]) => {
        importMutation.mutate(clients);
    };

    const downloadTemplate = () => {
        const headers = [
            'name*',
            'code*',
            'tenantCode',
            'address',
            'phone',
            'email',
            'taxId',
            'fiscalYearStart',
            'currency',
            'manager',
            'accountingSoftware',
            'idCode',
            'verificationStatus'
        ];

        const sampleData = [
            [
                'ABC Consulting LLC',
                'ABC001',
                '1001',
                '123 Main St, Tbilisi',
                '555-0100',
                'contact@abc.ge',
                '123456789',
                '1',
                'GEL',
                'John Doe',
                'QuickBooks',
                '400123456',
                'not_registered'
            ],
            [
                'XYZ Trading Ltd',
                'XYZ002',
                '1002',
                '456 Business Ave, Batumi',
                '555-0200',
                'info@xyz.ge',
                '987654321',
                '7',
                'USD',
                'Jane Smith',
                'Xero',
                '400987654',
                'verified'
            ],
            [
                'ქართული კომპანია',
                'GEO001',
                '1003',
                'თბილისი, რუსთაველის 1',
                '555-0300',
                'info@georgian.ge',
                '405446628',
                '1',
                'GEL',
                'გიორგი ბერიძე',
                'QuickBooks',
                '405446628',
                'not_registered'
            ]
        ];

        const csvContent = [
            headers.join(','),
            ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Add UTF-8 BOM so Excel recognizes the file as UTF-8
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', 'client_import_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
            title: "Template Downloaded",
            description: "Use this template to format your client data",
        });
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Import Client Companies</h1>
                    <p className="text-muted-foreground mt-1">
                        Batch import client companies from CSV file
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={downloadTemplate}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Template
                    </Button>
                    <Button onClick={() => setIsImportDialogOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Import CSV
                    </Button>
                </div>
            </div>

            {/* Instructions Card */}
            <Card>
                <CardHeader>
                    <CardTitle>How to Import Clients</CardTitle>
                    <CardDescription>Follow these steps to batch import client companies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                                    1
                                </div>
                                <h3 className="font-semibold">Upload CSV</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Upload any CSV file with your client data. Column names don't need to match exactly.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                                    2
                                </div>
                                <h3 className="font-semibold">Map Columns</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Match your CSV columns to the expected fields. The system will auto-detect matching names.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                                    3
                                </div>
                                <h3 className="font-semibold">Preview & Import</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Review the mapped data, fix any validation errors, and confirm the import.
                            </p>
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <h4 className="font-semibold mb-2">Required Fields</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                                <Badge variant="destructive">Required</Badge>
                                <span><strong>name</strong> - Client company name</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="destructive">Required</Badge>
                                <span><strong>code</strong> - Unique client code</span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">Optional Fields</h4>
                        <p className="text-sm text-muted-foreground">
                            tenantCode, address, phone, email, taxId, fiscalYearStart (1-12), currency, manager, accountingSoftware, idCode, verificationStatus
                        </p>
                    </div>

                    <Alert>
                        <AlertCircle className="h-4 h-4" />
                        <AlertTitle>Duplicate Handling</AlertTitle>
                        <AlertDescription>
                            Clients with duplicate codes will be automatically skipped. The import will continue with valid, unique clients.
                        </AlertDescription>
                    </Alert>

                    <Alert>
                        <AlertCircle className="h-4 h-4" />
                        <AlertTitle>Non-Latin Characters (Georgian, etc.)</AlertTitle>
                        <AlertDescription>
                            When saving from Excel, use "CSV UTF-8 (Comma delimited)" format to preserve Georgian and other non-Latin characters. Regular CSV may show as question marks (???).
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Import Results */}
            {importResults && (
                <Card>
                    <CardHeader>
                        <CardTitle>Import Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center gap-2 text-green-600 mb-1">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="font-semibold">Imported</span>
                                </div>
                                <p className="text-3xl font-bold">{importResults.imported}</p>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center gap-2 text-yellow-600 mb-1">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="font-semibold">Duplicates</span>
                                </div>
                                <p className="text-3xl font-bold">{importResults.duplicates}</p>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center gap-2 text-red-600 mb-1">
                                    <XCircle className="w-5 h-5" />
                                    <span className="font-semibold">Errors</span>
                                </div>
                                <p className="text-3xl font-bold">{importResults.errors.length}</p>
                            </div>
                        </div>

                        {importResults.errors.length > 0 && (
                            <div className="border rounded-lg p-4">
                                <h4 className="font-semibold mb-2">Error Details</h4>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {importResults.errors.map((error: any, idx: number) => (
                                        <div key={idx} className="text-sm p-2 bg-destructive/10 rounded">
                                            <span className="font-mono">Row {error.row}</span> - <span className="font-semibold">{error.code}</span>: {Object.values(error.error).join(', ')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <CSVImportDialog
                open={isImportDialogOpen}
                onOpenChange={setIsImportDialogOpen}
                onImport={handleImport}
            />
        </div>
    );
}
