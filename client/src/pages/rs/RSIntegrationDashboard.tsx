import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RSDataGrid from "@/components/rs/RSDataGrid";
import { rsTables, getRSTableList } from "@/config/rsTables";
import { usePermissions } from "@/hooks/usePermissions";
import { useTranslation } from "react-i18next";

export default function RSIntegrationDashboard() {
  const [selectedTable, setSelectedTable] = useState<string>("seller_invoices");
  const { can } = usePermissions();
  const { t, i18n } = useTranslation();

  // Check permissions
  if (!can('RS_VIEW')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              {t('errors.noPermission')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tableList = getRSTableList();
  const currentTableConfig = rsTables[selectedTable];

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('rs.title', 'RS Integration - Revenue Service Data')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium min-w-[150px]">
                {t('rs.selectTable', 'Select Data Type:')}
              </label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger className="w-[400px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tableList.map((table) => (
                    <SelectItem key={table.value} value={table.value}>
                      {i18n.language === 'ka' ? table.labelKa : table.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {currentTableConfig && (
              <div className="text-sm text-muted-foreground">
                <p>
                  {i18n.language === 'ka' 
                    ? `ჩატვირთული: ${currentTableConfig.displayNameKa}`
                    : `Viewing: ${currentTableConfig.displayName}`
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedTable && currentTableConfig && (
        <RSDataGrid
          tableKey={selectedTable}
          tableLabel={i18n.language === "ka" ? currentTableConfig.displayNameKa : currentTableConfig.displayName}
          apiEndpoint={`/api/rs-integration/${currentTableConfig.apiEndpoint}`}
          columns={currentTableConfig.columns}
        />
      )}
    </div>
  );
}

