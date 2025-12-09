
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function MSSQLSettings() {
    return (
        <div className="container mx-auto p-6">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Settings className="h-8 w-8 text-primary" />
                    <CardTitle>Database Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        This page is under construction. Future feature: Global settings for MSSQL connections and defaults.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
