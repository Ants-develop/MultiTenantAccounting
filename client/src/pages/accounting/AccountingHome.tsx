import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { List, Book, File, Receipt, University } from "lucide-react";

export default function AccountingHome() {
  const { t } = useTranslation();

  const tiles = [
    { title: t('navigation.chartOfAccounts'), href: '/chart-of-accounts', icon: List, color: 'bg-blue-100 text-blue-600' },
    { title: t('navigation.generalLedger'), href: '/general-ledger', icon: Book, color: 'bg-emerald-100 text-emerald-600' },
    { title: t('navigation.accountsReceivable'), href: '/accounts-receivable', icon: File, color: 'bg-purple-100 text-purple-600' },
    { title: t('navigation.accountsPayable'), href: '/accounts-payable', icon: Receipt, color: 'bg-amber-100 text-amber-600' },
    { title: t('navigation.bankReconciliation'), href: '/bank-reconciliation', icon: University, color: 'bg-rose-100 text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('sidebar.accounting')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiles.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button variant="outline" className="flex items-center justify-start h-20 w-full">
                    <div className={`w-10 h-10 rounded-md mr-3 flex items-center justify-center ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium">{item.title}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


