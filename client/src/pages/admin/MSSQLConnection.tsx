import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, CheckCircle, XCircle, Database, Server, User, Lock, Clock, AlertTriangle, Terminal } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SSHTerminal } from "@/components/SSHTerminal";

interface MSSQLConnectionStatus {
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

interface SSHConnectionStatus {
  connected: boolean;
  config: {
    host: string;
    port: number;
    username: string;
    authMethod: string;
    password: string;
    keyPath: string;
  };
  connectionTime: number | null;
  testCommandResult: string | null;
  error: {
    message: string;
    code: string;
    type: string;
  } | null;
  timestamp: string;
}

export default function Connections() {
  const [lastMSSQLTestTime, setLastMSSQLTestTime] = useState<Date | null>(null);
  const [lastSSHTestTime, setLastSSHTestTime] = useState<Date | null>(null);

  const { data: mssqlStatus, isLoading: mssqlLoading, error: mssqlError, refetch: refetchMSSQL } = useQuery<MSSQLConnectionStatus>({
    queryKey: ["/api/connections/mssql-status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/connections/mssql-status");
      const data = await response.json();
      setLastMSSQLTestTime(new Date());
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: sshStatus, isLoading: sshLoading, error: sshError, refetch: refetchSSH } = useQuery<SSHConnectionStatus>({
    queryKey: ["/api/connections/ssh-status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/connections/ssh-status");
      const data = await response.json();
      setLastSSHTestTime(new Date());
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const handleTestMSSQL = () => {
    refetchMSSQL();
  };

  const handleTestSSH = () => {
    refetchSSH();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <Server className="w-6 h-6 mr-2" />
            Connections
          </h1>
          <p className="text-muted-foreground">
            Test and monitor MSSQL Server and SSH connections
          </p>
        </div>
      </div>

      <Tabs defaultValue="mssql" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mssql" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            MSSQL Connection
          </TabsTrigger>
          <TabsTrigger value="ssh" className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            SSH Connection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mssql" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button onClick={handleTestMSSQL} disabled={mssqlLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${mssqlLoading ? 'animate-spin' : ''}`} />
              {mssqlLoading ? "Testing..." : "Test MSSQL Connection"}
            </Button>
          </div>

          {/* MSSQL Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {mssqlLoading ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : mssqlStatus?.connected ? (
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 mr-2 text-red-600" />
                )}
                MSSQL Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mssqlLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-muted-foreground">Testing connection...</p>
                </div>
              ) : mssqlStatus ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      {mssqlStatus.connected ? (
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
                    {mssqlStatus.connectionTime !== null && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Connection time: {mssqlStatus.connectionTime}ms</span>
                      </div>
                    )}
                  </div>

                  {mssqlStatus.error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                            Connection Error
                          </p>
                          <p className="text-xs text-red-800 dark:text-red-200 mb-2">
                            {mssqlStatus.error.message}
                          </p>
                          <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                            <p><strong>Error Code:</strong> {mssqlStatus.error.code}</p>
                            <p><strong>Error Type:</strong> {mssqlStatus.error.type}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {lastMSSQLTestTime && (
                    <p className="text-xs text-muted-foreground">
                      Last tested: {lastMSSQLTestTime.toLocaleString()}
                    </p>
                  )}
                </>
              ) : mssqlError ? (
                <div className="text-center py-8 text-destructive">
                  <XCircle className="w-8 h-8 mx-auto mb-4" />
                  <p>Failed to test connection</p>
                  <p className="text-sm mt-2">{mssqlError instanceof Error ? mssqlError.message : "Unknown error"}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* MSSQL Connection Configuration */}
          {mssqlStatus && (
            <Card>
              <CardHeader>
                <CardTitle>MSSQL Connection Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Server</p>
                      <p className="font-medium">{mssqlStatus.config.server}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Database</p>
                      <p className="font-medium">{mssqlStatus.config.database}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Username</p>
                      <p className="font-medium">{mssqlStatus.config.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Password</p>
                      <p className="font-medium">{mssqlStatus.config.password}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Port</p>
                    <p className="font-medium">{mssqlStatus.config.port}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Encrypt</p>
                    <Badge variant={mssqlStatus.config.encrypt ? "default" : "outline"}>
                      {mssqlStatus.config.encrypt ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trust Certificate</p>
                    <Badge variant={mssqlStatus.config.trustServerCertificate ? "default" : "outline"}>
                      {mssqlStatus.config.trustServerCertificate ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Databases */}
          {mssqlStatus?.connected && mssqlStatus.databases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Available Databases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {mssqlStatus.databases.map((db) => (
                    <Badge key={db} variant="outline" className="justify-center py-2">
                      {db}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* MSSQL Troubleshooting Tips */}
          {mssqlStatus && !mssqlStatus.connected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
                  Troubleshooting Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {mssqlStatus.error?.code === 'ELOGIN' && (
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
                  {mssqlStatus.error?.code === 'ESOCKET' && (
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
                  {mssqlStatus.error?.code === 'ETIMEOUT' && (
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
        </TabsContent>

        <TabsContent value="ssh" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button onClick={handleTestSSH} disabled={sshLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${sshLoading ? 'animate-spin' : ''}`} />
              {sshLoading ? "Testing..." : "Test SSH Connection"}
            </Button>
          </div>

          {/* SSH Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {sshLoading ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : sshStatus?.connected ? (
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 mr-2 text-red-600" />
                )}
                SSH Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sshLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-muted-foreground">Testing SSH connection...</p>
                </div>
              ) : sshStatus ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      {sshStatus.connected ? (
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
                    {sshStatus.connectionTime !== null && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Connection time: {sshStatus.connectionTime}ms</span>
                      </div>
                    )}
                  </div>

                  {sshStatus.testCommandResult && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                      <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">
                        Test Command Result:
                      </p>
                      <p className="text-xs text-green-800 dark:text-green-200 font-mono">
                        {sshStatus.testCommandResult}
                      </p>
                    </div>
                  )}

                  {sshStatus.error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                            Connection Error
                          </p>
                          <p className="text-xs text-red-800 dark:text-red-200 mb-2">
                            {sshStatus.error.message}
                          </p>
                          <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                            <p><strong>Error Code:</strong> {sshStatus.error.code}</p>
                            <p><strong>Error Type:</strong> {sshStatus.error.type}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {lastSSHTestTime && (
                    <p className="text-xs text-muted-foreground">
                      Last tested: {lastSSHTestTime.toLocaleString()}
                    </p>
                  )}
                </>
              ) : sshError ? (
                <div className="text-center py-8 text-destructive">
                  <XCircle className="w-8 h-8 mx-auto mb-4" />
                  <p>Failed to test connection</p>
                  <p className="text-sm mt-2">{sshError instanceof Error ? sshError.message : "Unknown error"}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* SSH Connection Configuration */}
          {sshStatus && (
            <Card>
              <CardHeader>
                <CardTitle>SSH Connection Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Host</p>
                      <p className="font-medium">{sshStatus.config.host}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Port</p>
                    <p className="font-medium">{sshStatus.config.port}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Username</p>
                      <p className="font-medium">{sshStatus.config.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Authentication Method</p>
                      <Badge variant="outline">{sshStatus.config.authMethod}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Password</p>
                    <p className="font-medium">{sshStatus.config.password}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Private Key Path</p>
                    <p className="font-medium">{sshStatus.config.keyPath}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SSH Terminal */}
          {sshStatus && sshStatus.connected && (
            <SSHTerminal />
          )}

          {/* SSH Troubleshooting Tips */}
          {sshStatus && !sshStatus.connected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
                  Troubleshooting Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                      SSH Connection Failed
                    </p>
                    <ul className="list-disc list-inside text-amber-800 dark:text-amber-200 space-y-1">
                      <li>Verify SSH server is running and accessible</li>
                      <li>Check if SSH port (22) is open in firewall</li>
                      <li>Ensure Windows OpenSSH Server is installed and running</li>
                      <li>Verify username and password/key are correct</li>
                      <li>Test SSH connection manually: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">ssh username@host</code></li>
                    </ul>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Environment Variables
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Make sure these are set in your .env file:
                    </p>
                    <ul className="list-disc list-inside text-blue-800 dark:text-blue-200 space-y-1 mt-2 font-mono text-xs">
                      <li>MSSQL_SSH_HOST (or MSSQL_SERVER)</li>
                      <li>MSSQL_SSH_USER</li>
                      <li>MSSQL_SSH_PASSWORD (or MSSQL_SSH_KEY_PATH)</li>
                      <li>MSSQL_SSH_PORT (optional, defaults to 22)</li>
                      <li>MSSQL_SSH_KEY_PASSPHRASE (optional, if using key)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

