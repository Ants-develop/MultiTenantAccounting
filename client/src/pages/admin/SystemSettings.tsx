import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Loader, CheckCircle, AlertCircle, Wifi, Database } from 'lucide-react';

interface Settings {
  id: number | null;
  name: string;
  sshHost: string;
  sshPort: number;
  sshUser: string;
  sshConfigured: boolean;
  mssqlServer: string;
  mssqlPort: number;
  mssqlUser: string;
  mssqlDatabase: string;
  mssqlConfigured: boolean;
}

interface ConnectionStatus {
  status: 'disconnected' | 'connected' | 'configured' | 'error' | 'checking';
  message?: string;
  error?: string;
  details?: string;
  host?: string;
  port?: number;
  version?: string;
  user?: string;
}

export default function SystemSettings() {
  const queryClient = useQueryClient();
  const [sshTab, setSshTab] = useState('config');
  const [mssqlTab, setMssqlTab] = useState('config');

  // SSH form state
  const [sshHost, setSshHost] = useState('');
  const [sshPort, setSshPort] = useState(22);
  const [sshUser, setSshUser] = useState('');
  const [sshKeyContent, setSshKeyContent] = useState('');

  // MSSQL form state
  const [mssqlServer, setMssqlServer] = useState('');
  const [mssqlPort, setMssqlPort] = useState(1433);
  const [mssqlUser, setMssqlUser] = useState('');
  const [mssqlPassword, setMssqlPassword] = useState('');
  const [mssqlDatabase, setMssqlDatabase] = useState('master');
  const [mssqlEncrypt, setMssqlEncrypt] = useState(true);
  const [mssqlTrustServerCert, setMssqlTrustServerCert] = useState(false);

  // Status states
  const [sshStatus, setSshStatus] = useState<ConnectionStatus>({ status: 'checking' });
  const [mssqlStatus, setMssqlStatus] = useState<ConnectionStatus>({ status: 'checking' });
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/settings');
      return response.json();
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      if (settings.sshHost) {
        setSshHost(settings.sshHost);
        setSshPort(settings.sshPort || 22);
        setSshUser(settings.sshUser || '');
      }
      if (settings.mssqlServer) {
        setMssqlServer(settings.mssqlServer);
        setMssqlPort(settings.mssqlPort || 1433);
        setMssqlUser(settings.mssqlUser || '');
        setMssqlDatabase(settings.mssqlDatabase || 'master');
      }
    }
  }, [settings]);

  // Check SSH status
  const checkSshStatus = async () => {
    setSshStatus({ status: 'checking' });
    try {
      const response = await apiRequest('GET', '/api/settings/ssh/status');
      const data = await response.json();
      setSshStatus(data);
    } catch (error: any) {
      setSshStatus({ status: 'error', error: 'Failed to check SSH status' });
    }
  };

  // Check MSSQL status
  const checkMssqlStatus = async () => {
    setMssqlStatus({ status: 'checking' });
    try {
      const response = await apiRequest('GET', '/api/settings/mssql/status');
      const data = await response.json();
      setMssqlStatus(data);
    } catch (error: any) {
      setMssqlStatus({ status: 'error', error: 'Failed to check MSSQL status' });
    }
  };

  // Update SSH settings mutation
  const updateSshMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', '/api/settings/ssh', {
        sshHost,
        sshPort,
        sshUser,
        sshKeyContent: sshKeyContent || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage('SSH settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      setTimeout(() => {
        setSuccessMessage('');
        checkSshStatus();
      }, 2000);
    },
  });

  // Update MSSQL settings mutation
  const updateMssqlMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', '/api/settings/mssql', {
        mssqlServer,
        mssqlPort,
        mssqlUser,
        mssqlPassword,
        mssqlDatabase,
        mssqlEncrypt,
        mssqlTrustServerCertificate: mssqlTrustServerCert,
      });
      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage('MSSQL settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      setTimeout(() => {
        setSuccessMessage('');
        checkMssqlStatus();
      }, 2000);
    },
  });

  // Check status on mount
  useEffect(() => {
    checkSshStatus();
    checkMssqlStatus();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'configured':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'disconnected':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'checking':
        return <Loader className="w-5 h-5 text-yellow-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-gray-600 mt-2">Configure SSH and MSSQL connection credentials</p>
      </div>

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* SSH Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              <div>
                <CardTitle>SSH Configuration</CardTitle>
                <CardDescription>Configure SSH connection for remote backup operations</CardDescription>
              </div>
            </div>
            {getStatusIcon(sshStatus.status)}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={sshTab} onValueChange={setSshTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sshHost">SSH Host</Label>
                  <Input
                    id="sshHost"
                    placeholder="ssh.example.com"
                    value={sshHost}
                    onChange={(e) => setSshHost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sshPort">SSH Port</Label>
                  <Input
                    id="sshPort"
                    type="number"
                    value={sshPort}
                    onChange={(e) => setSshPort(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sshUser">SSH Username</Label>
                <Input
                  id="sshUser"
                  placeholder="backup"
                  value={sshUser}
                  onChange={(e) => setSshUser(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sshKey">SSH Private Key (optional)</Label>
                <textarea
                  id="sshKey"
                  placeholder="Paste your SSH private key content here"
                  value={sshKeyContent}
                  onChange={(e) => setSshKeyContent(e.target.value)}
                  className="w-full p-2 border rounded font-mono text-sm"
                  rows={6}
                />
              </div>

              <Button
                onClick={() => updateSshMutation.mutate()}
                disabled={!sshHost || !sshUser || updateSshMutation.isPending}
              >
                {updateSshMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save SSH Settings'
                )}
              </Button>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Connection Status</span>
                  {getStatusIcon(sshStatus.status)}
                </div>
                <p className="text-sm">
                  {sshStatus.status === 'connected' || sshStatus.status === 'configured'
                    ? '✓ SSH is configured and ready'
                    : sshStatus.status === 'checking'
                    ? 'Checking SSH status...'
                    : sshStatus.error}
                </p>
                {sshStatus.message && <p className="text-sm text-gray-600">{sshStatus.message}</p>}
                {sshStatus.host && <p className="text-sm">Host: {sshStatus.host}:{sshStatus.port || 22}</p>}
              </div>
              <Button onClick={checkSshStatus} variant="outline">
                Refresh Status
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* MSSQL Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              <div>
                <CardTitle>MSSQL Database Configuration</CardTitle>
                <CardDescription>Configure MSSQL connection for backup/restore operations</CardDescription>
              </div>
            </div>
            {getStatusIcon(mssqlStatus.status)}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={mssqlTab} onValueChange={setMssqlTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mssqlServer">MSSQL Server</Label>
                  <Input
                    id="mssqlServer"
                    placeholder="localhost"
                    value={mssqlServer}
                    onChange={(e) => setMssqlServer(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mssqlPort">Port</Label>
                  <Input
                    id="mssqlPort"
                    type="number"
                    value={mssqlPort}
                    onChange={(e) => setMssqlPort(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mssqlUser">Username</Label>
                  <Input
                    id="mssqlUser"
                    placeholder="sa"
                    value={mssqlUser}
                    onChange={(e) => setMssqlUser(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mssqlPassword">Password</Label>
                  <Input
                    id="mssqlPassword"
                    type="password"
                    placeholder="••••••••"
                    value={mssqlPassword}
                    onChange={(e) => setMssqlPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mssqlDatabase">Default Database</Label>
                <Input
                  id="mssqlDatabase"
                  placeholder="master"
                  value={mssqlDatabase}
                  onChange={(e) => setMssqlDatabase(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mssqlEncrypt"
                    checked={mssqlEncrypt}
                    onChange={(e) => setMssqlEncrypt(e.target.checked)}
                  />
                  <Label htmlFor="mssqlEncrypt" className="font-normal">
                    Encrypt connection
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mssqlTrustCert"
                    checked={mssqlTrustServerCert}
                    onChange={(e) => setMssqlTrustServerCert(e.target.checked)}
                  />
                  <Label htmlFor="mssqlTrustCert" className="font-normal">
                    Trust self-signed certificate
                  </Label>
                </div>
              </div>

              <Button
                onClick={() => updateMssqlMutation.mutate()}
                disabled={!mssqlServer || !mssqlUser || !mssqlPassword || updateMssqlMutation.isPending}
              >
                {updateMssqlMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save MSSQL Settings'
                )}
              </Button>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Connection Status</span>
                  {getStatusIcon(mssqlStatus.status)}
                </div>
                <p className="text-sm">
                  {mssqlStatus.status === 'connected'
                    ? '✓ Successfully connected to MSSQL'
                    : mssqlStatus.status === 'checking'
                    ? 'Checking MSSQL status...'
                    : mssqlStatus.error}
                </p>
                {mssqlStatus.details && <p className="text-sm text-gray-600">{mssqlStatus.details}</p>}
                {mssqlStatus.version && <p className="text-sm">Version: {mssqlStatus.version}</p>}
              </div>
              <Button onClick={checkMssqlStatus} variant="outline">
                Refresh Status
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
