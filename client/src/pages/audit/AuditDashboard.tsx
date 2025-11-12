import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompany } from "@/hooks/useCompany";
import { FileSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import AuditGrid from "@/components/audit/AuditGrid";
import { auditSections, getAuditTableById } from "@/config/auditTables";

export default function AuditDashboard() {
  const { currentCompany, currentCompanyId, companies } = useCompany();
  const { t, i18n } = useTranslation();
  const [location, setLocation] = useLocation();

  // Parse URL parameter for selected table
  const urlParams = new URLSearchParams(window.location.search);
  const tableFromUrl = urlParams.get('table');
  
  // Initialize with first table or table from URL
  const [selectedTableId, setSelectedTableId] = useState<string>(
    tableFromUrl || auditSections[0].tables[0].id
  );

  // Get current table config
  const currentTable = useMemo(() => {
    return getAuditTableById(selectedTableId);
  }, [selectedTableId]);

  // Get company name
  const companyName = useMemo(() => {
    if (!currentCompanyId) return 'Loading...';
    const company = companies.find(c => c.id === currentCompanyId);
    return company?.name || currentCompany?.name || 'Loading...';
  }, [currentCompanyId, companies, currentCompany]);

  // Handle table selection
  const handleTableChange = (tableId: string) => {
    setSelectedTableId(tableId);
    // Update URL without page reload
    const newUrl = `/audit?table=${tableId}`;
    window.history.pushState({}, '', newUrl);
  };

  // Update selected table when URL changes
  useEffect(() => {
    if (tableFromUrl && tableFromUrl !== selectedTableId) {
      const tableExists = getAuditTableById(tableFromUrl);
      if (tableExists) {
        setSelectedTableId(tableFromUrl);
      }
    }
  }, [tableFromUrl]);

  if (!currentCompany) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Please select a company to view audit analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!currentTable) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Table configuration not found.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isGeorgian = i18n.language === 'ka';

  return (
    <div className="flex flex-col h-full">
      <Card className="flex flex-col h-full flex-1 min-h-0">
        <CardHeader className="pb-3 pt-4 px-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileSearch className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  {t('audit.title')} - {isGeorgian ? currentTable.displayNameKa : currentTable.displayNameEn}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {companyName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Table Selector */}
              <Select value={selectedTableId} onValueChange={handleTableChange}>
                <SelectTrigger className="w-[300px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {auditSections.map((section) => (
                    <SelectGroup key={section.id}>
                      <SelectLabel className="font-semibold">
                        {isGeorgian ? section.displayNameKa : section.displayNameEn}
                      </SelectLabel>
                      {section.tables.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          {isGeorgian ? table.displayNameKa : table.displayNameEn}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col min-h-0">
          <AuditGrid tableConfig={currentTable} />
        </CardContent>
      </Card>
    </div>
  );
}

