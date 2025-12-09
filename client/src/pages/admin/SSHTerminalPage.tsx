import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Terminal, Server, Info, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Connection } from '@shared/schema';
import { SSHTerminal } from '@/components/SSHTerminal';

interface TerminalTab {
  id: string;
  connectionId: number;
  connectionName: string;
  createdAt: Date;
}

export default function SSHTerminalPage() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Fetch SSH connections
  const { data: sshConnections = [], isLoading: connectionsLoading } = useQuery<Connection[]>({
    queryKey: ['/api/mssql-explorer/connections', { type: 'ssh' }],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/mssql-explorer/connections?type=ssh');
      return res.json();
    },
  });

  /**
   * Open new terminal tab
   */
  const openNewTerminal = () => {
    if (!selectedConnectionId) return;

    const connection = sshConnections.find(c => c.id === parseInt(selectedConnectionId));
    if (!connection) return;

    const tabId = `${selectedConnectionId}-${Date.now()}`;
    const newTab: TerminalTab = {
      id: tabId,
      connectionId: connection.id,
      connectionName: connection.name || connection.server,
      createdAt: new Date(),
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);
  };

  /**
   * Close terminal tab
   */
  const closeTab = (tabId: string) => {
    setTabs((prev) => prev.filter(t => t.id !== tabId));

    if (activeTabId === tabId) {
      const remaining = tabs.filter(t => t.id !== tabId);
      setActiveTabId(remaining[0]?.id || '');
    }
  };

  /**
   * Close all tabs
   */
  const closeAllTabs = () => {
    setTabs([]);
    setActiveTabId('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Terminal className="h-8 w-8" />
            SSH Terminal
          </h1>
          <p className="text-muted-foreground mt-1">
            Interactive SSH terminal with persistent sessions
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Sessions persist across page navigation. Multiple tabs can connect to the same session.
          Sessions auto-close after 1 hour of inactivity.
        </AlertDescription>
      </Alert>

      {/* Connection Selector */}
      <Card>
        <CardHeader>
          <CardTitle>New Terminal</CardTitle>
          <CardDescription>
            Select an SSH connection and create a new terminal session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">SSH Connection</label>
              <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select SSH server..." />
                </SelectTrigger>
                <SelectContent>
                  {connectionsLoading ? (
                    <SelectItem value="__loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : sshConnections.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No SSH connections available
                    </SelectItem>
                  ) : (
                    sshConnections.map((conn) => (
                      <SelectItem key={conn.id} value={conn.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          <span>
                            {conn.name} ({conn.server}:{conn.port || 22})
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={openNewTerminal}
                disabled={!selectedConnectionId || connectionsLoading}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Terminal
              </Button>
              {tabs.length > 0 && (
                <Button
                  onClick={closeAllTabs}
                  variant="destructive"
                  size="sm"
                >
                  Close All
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terminal Tabs */}
      {tabs.length > 0 ? (
        <Card className="flex flex-col h-[calc(100vh-400px)]">
          <Tabs value={activeTabId} onValueChange={setActiveTabId} className="flex flex-col h-full">
            <CardHeader className="pb-2">
              <TabsList className="w-full justify-start overflow-x-auto">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                      activeTabId === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <Terminal className="h-4 w-4" />
                    <span className="text-sm font-medium truncate max-w-xs">
                      {tab.connectionName}
                    </span>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </TabsList>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-4">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`w-full h-full ${activeTabId === tab.id ? 'block' : 'hidden'}`}
                >
                  <SSHTerminal
                    ref={(el) => {
                      if (el) {
                        terminalRefs.current.set(tab.id, el);
                      }
                    }}
                    connectionId={tab.connectionId}
                    connectionName={tab.connectionName}
                    autoConnect={true}
                  />
                </div>
              ))}
            </CardContent>
          </Tabs>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <Terminal className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-muted-foreground">
            No terminals open
          </h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Select an SSH connection above and click "New Terminal" to start
          </p>
          <Button
            onClick={openNewTerminal}
            disabled={!selectedConnectionId}
          >
            Create First Terminal
          </Button>
        </Card>
      )}

      {/* Active Sessions Info */}
      {tabs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <div className="font-medium">{tab.connectionName}</div>
                    <div className="text-xs text-muted-foreground">
                      Session ID: {tab.id.split('-')[0]}...
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Active</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

