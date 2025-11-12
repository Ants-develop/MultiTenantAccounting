import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Save, X, Calendar, Clock, Search, Calculator, Users, FileText, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePageActions } from "@/hooks/usePageActions";

interface Vendor {
  id: number;
  name: string;
  code: string;
  currency: string;
  settlementAccount: string;
  vatAccount: string;
}

interface Employee {
  id: number;
  name: string;
  code: string;
  settlementAccount: string;
}

interface Nomenclature {
  id: number;
  name: string;
  code: string;
  unit: string;
  price: number;
  vatRate: string;
  expenseAccount: string;
  vatAccount: string;
  type: 'product' | 'service' | 'asset';
}

interface PurchaseDocument {
  id: number;
  documentNumber: string;
  date: string;
  vendorId: number;
  vendorName: string;
  currency: string;
  exchangeRate: number;
  totalAmount: number;
  vatAmount: number;
  totalWithVat: number;
  isPosted: boolean;
  createdAt: string;
  purchaseType: 'regular' | 'accountable_person';
  accountablePersonId?: number;
}

// Nomenclature selection modal
interface NomenclatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (nomenclature: Nomenclature) => void;
}

function NomenclatureModal({ isOpen, onClose, onSelect }: NomenclatureModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: nomenclature } = useQuery<Nomenclature[]>({
    queryKey: ['/api/nomenclature'],
    enabled: isOpen,
  });

  const handleSelect = (item: Nomenclature) => {
    onSelect(item);
    onClose();
  };

  const filteredItems = () => {
    if (!nomenclature) return [];
    
    return nomenclature.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Nomenclature</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search nomenclature..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Nomenclature List */}
          <div className="border rounded-lg max-h-60 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>VAT Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems().map((item) => (
                  <TableRow 
                    key={item.id} 
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleSelect(item)}
                  >
                    <TableCell className="font-mono">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.type === 'product' ? 'Product' : 
                         item.type === 'service' ? 'Service' : 'Asset'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{item.price.toFixed(2)}</TableCell>
                    <TableCell>{item.vatRate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>
              OK
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Employee selection modal
interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (employee: Employee) => void;
}

function EmployeeModal({ isOpen, onClose, onSelect }: EmployeeModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
    enabled: isOpen,
  });

  const handleSelect = (item: Employee) => {
    onSelect(item);
    onClose();
  };

  const filteredItems = () => {
    if (!employees) return [];
    
    return employees.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Accountable Person</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Employee List */}
          <div className="border rounded-lg max-h-60 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Settlement Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems().map((item) => (
                  <TableRow 
                    key={item.id} 
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleSelect(item)}
                  >
                    <TableCell className="font-mono">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="font-mono">{item.settlementAccount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>
              OK
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Tax settings modal
interface TaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taxSettings: any) => void;
  taxSettings: any;
}

function TaxModal({ isOpen, onClose, onSave, taxSettings }: TaxModalProps) {
  const [settings, setSettings] = useState(taxSettings);

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tax Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="priceIncludesVat"
              checked={settings.priceIncludesVat}
              onCheckedChange={(checked) => setSettings({...settings, priceIncludesVat: checked})}
            />
            <Label htmlFor="priceIncludesVat">Price includes VAT</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="vatRate">VAT Rate (%)</Label>
            <Input
              id="vatRate"
              type="number"
              step="0.01"
              value={settings.vatRate}
              onChange={(e) => setSettings({...settings, vatRate: parseFloat(e.target.value)})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vatAccount">VAT Account</Label>
            <Select 
              value={settings.vatAccount}
              onValueChange={(value) => setSettings({...settings, vatAccount: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select VAT account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vat-payable">VAT Payable</SelectItem>
                <SelectItem value="vat-receivable">VAT Receivable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expenseAccount">Expense Account</Label>
            <Select 
              value={settings.expenseAccount}
              onValueChange={(value) => setSettings({...settings, expenseAccount: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select expense account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="office-supplies">Office Supplies</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="professional-services">Professional Services</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const nomenclatureLineSchema = z.object({
  nomenclatureId: z.number().min(1, "Nomenclature is required"),
  name: z.string().min(1, "Name is required"),
  unit: z.string().min(1, "Unit is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  price: z.number().min(0, "Price must be non-negative"),
  vatRate: z.string().min(1, "VAT rate is required"),
  amount: z.number().min(0, "Amount must be non-negative"),
  amountWithVat: z.number().min(0, "Amount with VAT must be non-negative"),
  discountPercent: z.number().min(0).max(100).optional(),
  priceWithDiscount: z.number().min(0).optional(),
});

const serviceLineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0, "Amount must be non-negative"),
  vatRate: z.string().min(1, "VAT rate is required"),
  vatAmount: z.number().min(0, "VAT amount must be non-negative"),
  amountWithVat: z.number().min(0, "Amount with VAT must be non-negative"),
  vatAccount: z.string().min(1, "VAT account is required"),
  expenseAccount: z.string().min(1, "Expense account is required"),
});

const purchaseDocumentSchema = z.object({
  documentNumber: z.string().min(1, "Document number is required"),
  date: z.string().min(1, "Date is required"),
  vendorId: z.number().min(1, "Vendor is required"),
  currency: z.string().min(1, "Currency is required"),
  exchangeRate: z.number().min(0.0001, "Exchange rate must be greater than 0"),
  operationType: z.string().min(1, "Operation type is required"),
  purchaseType: z.enum(['regular', 'accountable_person']),
  accountablePersonId: z.number().optional(),
  nomenclatureLines: z.array(nomenclatureLineSchema).optional(),
  serviceLines: z.array(serviceLineSchema).optional(),
}).refine(
  (data) => {
    const hasNomenclature = data.nomenclatureLines && data.nomenclatureLines.length > 0;
    const hasServices = data.serviceLines && data.serviceLines.length > 0;
    return hasNomenclature || hasServices;
  },
  "At least one nomenclature or service line is required"
).refine(
  (data) => {
    if (data.purchaseType === 'accountable_person') {
      return data.accountablePersonId && data.accountablePersonId > 0;
    }
    return true;
  },
  "Accountable person is required for accountable person purchases"
);

type PurchaseDocumentForm = z.infer<typeof purchaseDocumentSchema>;

export default function Purchases() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<PurchaseDocument | null>(null);
  const [nomenclatureModal, setNomenclatureModal] = useState<{
    isOpen: boolean;
    lineIndex: number;
  }>({ isOpen: false, lineIndex: 0 });
  const [employeeModal, setEmployeeModal] = useState(false);
  const [taxModal, setTaxModal] = useState(false);
  const [activeTab, setActiveTab] = useState("nomenclature");
  const [purchaseType, setPurchaseType] = useState<'regular' | 'accountable_person'>('regular');
  
  const { mainCompany } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { registerTrigger } = usePageActions();

  // Register the action for this page
  useEffect(() => {
    registerTrigger('newPurchaseDocument', () => {
      setIsDialogOpen(true);
    });
  }, [registerTrigger]);

  const { data: purchaseDocuments, isLoading: documentsLoading } = useQuery<PurchaseDocument[]>({
    queryKey: ['/api/purchase-documents'],
    enabled: !!mainCompany,
  });

  const { data: vendors, isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
    enabled: !!mainCompany,
  });

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
    enabled: !!mainCompany,
  });

  const form = useForm<PurchaseDocumentForm>({
    resolver: zodResolver(purchaseDocumentSchema),
    defaultValues: {
      documentNumber: "",
      date: new Date().toISOString().split('T')[0],
      vendorId: 0,
      currency: "USD",
      exchangeRate: 1.0,
      operationType: "purchase",
      purchaseType: "regular",
      accountablePersonId: undefined,
      nomenclatureLines: [],
      serviceLines: [],
    },
  });

  const { fields: nomenclatureFields, append: appendNomenclature, remove: removeNomenclature } = useFieldArray({
    control: form.control,
    name: "nomenclatureLines",
  });

  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
    control: form.control,
    name: "serviceLines",
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: PurchaseDocumentForm) => {
      const response = await apiRequest('POST', '/api/purchase-documents', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-documents'] });
      setIsDialogOpen(false);
      setEditingDocument(null);
      form.reset();
      toast({
        title: "Purchase document created",
        description: "The purchase document has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase document",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PurchaseDocumentForm) => {
    createDocumentMutation.mutate(data);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDocument(null);
    form.reset();
    setPurchaseType('regular');
  };

  const addNomenclatureLine = () => {
    appendNomenclature({
      nomenclatureId: 0,
      name: "",
      unit: "",
      quantity: 1,
      price: 0,
      vatRate: "standard",
      amount: 0,
      amountWithVat: 0,
    });
  };

  const addServiceLine = () => {
    appendService({
      description: "",
      amount: 0,
      vatRate: "standard",
      vatAmount: 0,
      amountWithVat: 0,
      vatAccount: "",
      expenseAccount: "",
    });
  };

  const openNomenclatureModal = (lineIndex: number) => {
    setNomenclatureModal({ isOpen: true, lineIndex });
  };

  const handleNomenclatureSelect = (nomenclature: Nomenclature) => {
    const { lineIndex } = nomenclatureModal;
    form.setValue(`nomenclatureLines.${lineIndex}.nomenclatureId`, nomenclature.id);
    form.setValue(`nomenclatureLines.${lineIndex}.name`, nomenclature.name);
    form.setValue(`nomenclatureLines.${lineIndex}.unit`, nomenclature.unit);
    form.setValue(`nomenclatureLines.${lineIndex}.price`, nomenclature.price);
    form.setValue(`nomenclatureLines.${lineIndex}.vatRate`, nomenclature.vatRate);
    
    // Calculate amount
    const quantity = form.watch(`nomenclatureLines.${lineIndex}.quantity`);
    const amount = quantity * nomenclature.price;
    form.setValue(`nomenclatureLines.${lineIndex}.amount`, amount);
    
    setNomenclatureModal({ isOpen: false, lineIndex: 0 });
  };

  const handleEmployeeSelect = (employee: Employee) => {
    form.setValue("accountablePersonId", employee.id);
    setEmployeeModal(false);
  };

  const calculateTotals = () => {
    const nomenclatureLines = form.watch("nomenclatureLines") || [];
    const serviceLines = form.watch("serviceLines") || [];
    
    const nomenclatureTotal = nomenclatureLines.reduce((sum, line) => sum + line.amountWithVat, 0);
    const serviceTotal = serviceLines.reduce((sum, line) => sum + line.amountWithVat, 0);
    
    return {
      totalAmount: nomenclatureTotal + serviceTotal,
      nomenclatureTotal,
      serviceTotal,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!mainCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground">No Company Configured</h3>
          <p className="text-muted-foreground">Please complete company setup to manage purchases.</p>
        </div>
      </div>
    );
  }

  const { totalAmount } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchases (შესყიდვები)</h1>
          <p className="text-muted-foreground">
            Create and manage purchase documents
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            From Invoice
          </Button>
          <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            From File
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Purchase
          </Button>
        </div>
      </div>

      {/* Main Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Purchase Document (Create)</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            {/* Top Action Bar */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/50">
              <div className="flex items-center space-x-4">
                <Button type="submit" disabled={createDocumentMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Post and Close
                </Button>
                <Button type="button" variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button type="button" variant="outline">
                  Post
                </Button>
                <Button type="button" variant="outline" onClick={() => setTaxModal(true)}>
                  <Calculator className="w-4 h-4 mr-2" />
                  Taxes
                </Button>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <Input
                    type="datetime-local"
                    {...form.register("date")}
                    className="w-48"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm text-muted-foreground">Dr Cr</span>
                </div>
              </div>
            </div>

            {/* Document Header */}
            <div className="p-4 border-b space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="documentNumber">Document Number</Label>
                  <Input
                    id="documentNumber"
                    {...form.register("documentNumber")}
                    placeholder="PUR-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="operationType">Operation Type</Label>
                  <Select {...form.register("operationType")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select operation type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="asset">Asset</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendorId">Vendor</Label>
                  <Select
                    value={form.watch("vendorId").toString()}
                    onValueChange={(value) => {
                      form.setValue("vendorId", parseInt(value));
                      const vendor = vendors?.find(v => v.id === parseInt(value));
                      if (vendor) {
                        form.setValue("currency", vendor.currency);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors?.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                          {vendor.code} - {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={form.watch("currency")}
                    onValueChange={(value) => form.setValue("currency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GEL">GEL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exchangeRate">Exchange Rate</Label>
                  <Input
                    id="exchangeRate"
                    type="number"
                    step="0.0001"
                    {...form.register("exchangeRate", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseType">Purchase Type</Label>
                  <Select
                    value={purchaseType}
                    onValueChange={(value: 'regular' | 'accountable_person') => {
                      setPurchaseType(value);
                      form.setValue("purchaseType", value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular Purchase</SelectItem>
                      <SelectItem value="accountable_person">Accountable Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Accountable Person Section */}
              {purchaseType === 'accountable_person' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountablePersonId">Accountable Person</Label>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEmployeeModal(true)}
                        className="flex-1 justify-start"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        {employees?.find(e => e.id === form.watch("accountablePersonId"))?.name || "Select Employee"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeSettlementAccount">Employee Settlement Account</Label>
                    <Input
                      id="employeeSettlementAccount"
                      value={employees?.find(e => e.id === form.watch("accountablePersonId"))?.settlementAccount || ""}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="nomenclature">Nomenclature</TabsTrigger>
                  <TabsTrigger value="services">Other Assets and Services</TabsTrigger>
                </TabsList>

                <TabsContent value="nomenclature" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Nomenclature</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addNomenclatureLine}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Line
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nomenclature</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead>VAT Rate</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Amount with VAT</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nomenclatureFields.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openNomenclatureModal(index)}
                                className="w-full justify-start"
                              >
                                {form.watch(`nomenclatureLines.${index}.name`) || "Select Nomenclature"}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Input
                                {...form.register(`nomenclatureLines.${index}.unit`)}
                                placeholder="Unit"
                                readOnly
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...form.register(`nomenclatureLines.${index}.quantity`, { valueAsNumber: true })}
                                className="text-right"
                                onChange={(e) => {
                                  const quantity = parseFloat(e.target.value);
                                  const price = form.watch(`nomenclatureLines.${index}.price`);
                                  const amount = quantity * price;
                                  form.setValue(`nomenclatureLines.${index}.amount`, amount);
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...form.register(`nomenclatureLines.${index}.price`, { valueAsNumber: true })}
                                className="text-right"
                                onChange={(e) => {
                                  const price = parseFloat(e.target.value);
                                  const quantity = form.watch(`nomenclatureLines.${index}.quantity`);
                                  const amount = quantity * price;
                                  form.setValue(`nomenclatureLines.${index}.amount`, amount);
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Select {...form.register(`nomenclatureLines.${index}.vatRate`)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="zero">Zero</SelectItem>
                                  <SelectItem value="exempt">Exempt</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                {...form.register(`nomenclatureLines.${index}.amount`, { valueAsNumber: true })}
                                className="text-right"
                                readOnly
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                {...form.register(`nomenclatureLines.${index}.amountWithVat`, { valueAsNumber: true })}
                                className="text-right"
                                readOnly
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeNomenclature(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="services" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Other Assets and Services</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addServiceLine}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Line
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>VAT Rate</TableHead>
                          <TableHead className="text-right">VAT Amount</TableHead>
                          <TableHead className="text-right">Amount with VAT</TableHead>
                          <TableHead>VAT Account</TableHead>
                          <TableHead>Expense Account</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serviceFields.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <Textarea
                                {...form.register(`serviceLines.${index}.description`)}
                                placeholder="Service description"
                                rows={2}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...form.register(`serviceLines.${index}.amount`, { valueAsNumber: true })}
                                className="text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Select {...form.register(`serviceLines.${index}.vatRate`)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="zero">Zero</SelectItem>
                                  <SelectItem value="exempt">Exempt</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                {...form.register(`serviceLines.${index}.vatAmount`, { valueAsNumber: true })}
                                className="text-right"
                                readOnly
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                {...form.register(`serviceLines.${index}.amountWithVat`, { valueAsNumber: true })}
                                className="text-right"
                                readOnly
                              />
                            </TableCell>
                            <TableCell>
                              <Select {...form.register(`serviceLines.${index}.vatAccount`)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="vat-payable">VAT Payable</SelectItem>
                                  <SelectItem value="vat-receivable">VAT Receivable</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select {...form.register(`serviceLines.${index}.expenseAccount`)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="office-supplies">Office Supplies</SelectItem>
                                  <SelectItem value="utilities">Utilities</SelectItem>
                                  <SelectItem value="professional-services">Professional Services</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeService(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Total Amount */}
              <div className="flex justify-end pt-4 border-t">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <NomenclatureModal
        isOpen={nomenclatureModal.isOpen}
        onClose={() => setNomenclatureModal({ isOpen: false, lineIndex: 0 })}
        onSelect={handleNomenclatureSelect}
      />

      <EmployeeModal
        isOpen={employeeModal}
        onClose={() => setEmployeeModal(false)}
        onSelect={handleEmployeeSelect}
      />

      <TaxModal
        isOpen={taxModal}
        onClose={() => setTaxModal(false)}
        onSave={(settings) => console.log('Tax settings saved:', settings)}
        taxSettings={{
          priceIncludesVat: false,
          vatRate: 18,
          vatAccount: "vat-payable",
          expenseAccount: "office-supplies"
        }}
      />

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading documents...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Document Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseDocuments && purchaseDocuments.length > 0 ? (
                  purchaseDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>{formatDate(document.date)}</TableCell>
                      <TableCell className="font-mono">{document.documentNumber}</TableCell>
                      <TableCell>{document.vendorName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {document.purchaseType === 'regular' ? 'Regular' : 'Accountable Person'}
                        </Badge>
                      </TableCell>
                      <TableCell>{document.currency}</TableCell>
                      <TableCell>
                        <Badge variant={document.isPosted ? "default" : "secondary"}>
                          {document.isPosted ? "Posted" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(document.totalWithVat)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!document.isPosted && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No purchase documents found. Create your first document to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}