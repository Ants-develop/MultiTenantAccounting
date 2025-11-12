import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Download } from "lucide-react";
import { usePageActions } from "@/hooks/usePageActions";

export default function BankStatementUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { registerTrigger } = usePageActions();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      // TODO: Implement file upload logic
      console.log('Uploading file:', selectedFile.name);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Statement Upload (ბანკის ამონაწერების შეტვირთვა)</h1>
          <p className="text-muted-foreground">
            Upload and process bank statements for reconciliation
          </p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Upload Bank Statement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bank-statement-file">Select Bank Statement File</Label>
            <Input
              id="bank-statement-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground">
              Supported formats: CSV, Excel (.xlsx, .xls)
            </p>
          </div>

          {selectedFile && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">{selectedFile.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button onClick={handleUpload} disabled={!selectedFile}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">File Format Requirements:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Date column (YYYY-MM-DD format)</li>
              <li>Description column</li>
              <li>Debit amount column</li>
              <li>Credit amount column</li>
              <li>Balance column (optional)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No recent uploads found.</p>
            <p className="text-sm">Upload your first bank statement to get started.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
