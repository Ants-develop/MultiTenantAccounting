
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function MSSQLQueries() {
    return (
        <div className="container mx-auto p-6">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <FileText className="h-8 w-8 text-primary" />
                    <CardTitle>SQL Queries</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        This page is under construction. Future feature: Saved queries and advanced query editor.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
