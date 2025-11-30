import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, Database, Server, User, Lock, Clock, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ConnectionStatus {
  connected: boolean;
  config: {
    server: string;
    database: string;
    username: string;
    port: number;
    encrypt: boolean;
    trustServerCertificate: boolean;
    password: string;
  };
  connectionTime: number | null;
  databases: string[];
  error: {
    message: string;
    code: string;
    type: string;
  } | null;
  timestamp: string;
}

export default function MSSQLConnection() {
  const [lastTestTime, setLastTestTime] = useState<Date | null>(null);

  const { data: connectionStatus, isLoading, error, refetch } = useQuery<ConnectionStatus>({
    queryKey: ["/api/mssql/connection-status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/mssql/connection-status");
      const data = await response.json();
      setLastTestTime(new Date());
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const handleTestConnection = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <Database className="w-6 h-6 mr-2" />
            MSSQL Connection Status
          </h1>
          <p className="text-muted-foreground">
            Test and monitor MSSQL Server connection
          </p>
        </div>
        <Button onClick={handleTestConnection} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? "Testing..." : "Test Connection"}
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {isLoading ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : connectionStatus?.connected ? (
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 mr-2 text-red-600" />
            )}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Testing connection...</p>
            </div>
          ) : connectionStatus ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  {connectionStatus.connected ? (
                    <Badge className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Disconnected
                    </Badge>
                  )}
                </div>
                {connectionStatus.connectionTime !== null && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Connection time: {connectionStatus.connectionTime}ms</span>
                  </div>
                )}
              </div>

              {connectionStatus.error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                        Connection Error
                      </p>
                      <p className="text-xs text-red-800 dark:text-red-200 mb-2">
                        {connectionStatus.error.message}
                      </p>
                      <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                        <p><strong>Error Code:</strong> {connectionStatus.error.code}</p>
                        <p><strong>Error Type:</strong> {connectionStatus.error.type}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {lastTestTime && (
                <p className="text-xs text-muted-foreground">
                  Last tested: {lastTestTime.toLocaleString()}
                </p>
              )}
            </>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <XCircle className="w-8 h-8 mx-auto mb-4" />
              <p>Failed to test connection</p>
              <p className="text-sm mt-2">{error instanceof Error ? error.message : "Unknown error"}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Connection Configuration */}
      {connectionStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Server</p>
                  <p className="font-medium">{connectionStatus.config.server}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Database</p>
                  <p className="font-medium">{connectionStatus.config.database}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Username</p>
                  <p className="font-medium">{connectionStatus.config.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Password</p>
                  <p className="font-medium">{connectionStatus.config.password}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Port</p>
                <p className="font-medium">{connectionStatus.config.port}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Encrypt</p>
                <Badge variant={connectionStatus.config.encrypt ? "default" : "outline"}>
                  {connectionStatus.config.encrypt ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trust Certificate</p>
                <Badge variant={connectionStatus.config.trustServerCertificate ? "default" : "outline"}>
                  {connectionStatus.config.trustServerCertificate ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Databases */}
      {connectionStatus?.connected && connectionStatus.databases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Databases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {connectionStatus.databases.map((db) => (
                <Badge key={db} variant="outline" className="justify-center py-2">
                  {db}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting Tips */}
      {connectionStatus && !connectionStatus.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
              Troubleshooting Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {connectionStatus.error?.code === 'ELOGIN' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                    Login Failed
                  </p>
                  <ul className="list-disc list-inside text-amber-800 dark:text-amber-200 space-y-1">
                    <li>Verify the username and password in your .env file</li>
                    <li>Check if SQL Server authentication is enabled</li>
                    <li>Ensure the user has permission to access the database</li>
                  </ul>
                </div>
              )}
              {connectionStatus.error?.code === 'ESOCKET' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                    Network Error
                  </p>
                  <ul className="list-disc list-inside text-amber-800 dark:text-amber-200 space-y-1">
                    <li>Check if the MSSQL server is running</li>
                    <li>Verify the server address and port</li>
                    <li>Check firewall settings</li>
                    <li>Ensure SQL Server allows remote connections</li>
                  </ul>
                </div>
              )}
              {connectionStatus.error?.code === 'ETIMEOUT' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                    Connection Timeout
                  </p>
                  <ul className="list-disc list-inside text-amber-800 dark:text-amber-200 space-y-1">
                    <li>The server may be down or unreachable</li>
                    <li>Check network connectivity</li>
                    <li>Verify the server address is correct</li>
                  </ul>
                </div>
              )}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Environment Variables
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Make sure these are set in your .env file:
                </p>
                <ul className="list-disc list-inside text-blue-800 dark:text-blue-200 space-y-1 mt-2 font-mono text-xs">
                  <li>MSSQL_SERVER</li>
                  <li>MSSQL_DATABASE</li>
                  <li>MSSQL_USERNAME or MSSQL_USER</li>
                  <li>MSSQL_PASSWORD</li>
                  <li>MSSQL_PORT (optional, defaults to 1433)</li>
                  <li>MSSQL_ENCRYPT (optional, defaults to true)</li>
                  <li>MSSQL_TRUST_SERVER_CERTIFICATE (optional, defaults to true)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

