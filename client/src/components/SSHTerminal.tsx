import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Copy, Download, Trash2 } from 'lucide-react';

interface SSHTerminalProps {
  connectionId: number;
  connectionName?: string;
  onSessionReady?: (sessionId: string) => void;
  className?: string;
  autoConnect?: boolean;
}

export const SSHTerminal = React.forwardRef<HTMLDivElement, SSHTerminalProps>(
  ({ connectionId, connectionName, onSessionReady, className, autoConnect = true }, ref) => {
    const termRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectCountRef = useRef(0);
    const isConnectingRef = useRef(false); // Prevent concurrent connect attempts

    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [lastCloseCode, setLastCloseCode] = useState<number | null>(null); // Track close code for smarter reconnect

    const STORAGE_KEY = `ssh-session-${connectionId}`;
    const MAX_RECONNECT_ATTEMPTS = 3; // Reduced from 5
    const RECONNECT_DELAY = 2000; // 2 seconds

    /**
     * Initialize terminal emulator
     */
    const initializeTerminal = useCallback(() => {
      if (terminalRef.current) return; // Already initialized

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 14,
        fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
        } as any,
        rows: 24,
        cols: 80,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      if (termRef.current) {
        term.open(termRef.current);
        fitAddon.fit();
      }

      terminalRef.current = term;
      fitAddonRef.current = fitAddon;

      // Handle terminal input
      term.onData((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(data);
        }
      });

      // Handle terminal resize
      term.onResize(({ cols, rows }) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'resize',
            cols,
            rows,
          }));
        }
      });

      // Handle window resize
      const handleWindowResize = () => {
        try {
          fitAddon.fit();
        } catch (err) {
          console.error('Fit error:', err);
        }
      };

      window.addEventListener('resize', handleWindowResize);

      return () => {
        window.removeEventListener('resize', handleWindowResize);
        term.dispose();
      };
    }, []);

    /**
     * Connect to WebSocket
     */
    const connect = useCallback((existingSessionId?: string) => {
      // Guard: don't open multiple sockets
      if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('[SSH Terminal] Already connecting or connected, skipping...');
        return;
      }

      isConnectingRef.current = true;
      setStatus('connecting');
      setError(null);

      try {
        // Initialize terminal if needed
        initializeTerminal();

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const baseUrl = `${protocol}//${window.location.host}`;

        let wsUrl = `${baseUrl}/ssh-terminal`;
        if (existingSessionId) {
          wsUrl += `?session=${encodeURIComponent(existingSessionId)}`;
        } else {
          wsUrl += `?connectionId=${connectionId}`;
        }

        console.log('[SSH Terminal] Connecting to:', wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[SSH Terminal] WebSocket connected');
          isConnectingRef.current = false;
          reconnectCountRef.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            // Try to parse as JSON first
            const data = JSON.parse(event.data);

            if (data.type === 'session') {
              // Save session ID
              setSessionId(data.id);
              localStorage.setItem(STORAGE_KEY, data.id);
              setStatus('connected');
              if (onSessionReady) {
                onSessionReady(data.id);
              }
              const msg = data.message || 'Connected to SSH server';
              terminalRef.current?.writeln(`\r\n✓ ${msg}\r\n`);
              setLogs((prev) => [...prev, msg]);
            } else if (data.type === 'error') {
              setError(data.message);
              setStatus('error');
              terminalRef.current?.writeln(`\r\n✗ Error: ${data.message}\r\n`);
              setLogs((prev) => [...prev, `Error: ${data.message}`]);
            } else if (data.type === 'ready') {
              setStatus('connected');
            }
          } catch {
            // Not JSON, treat as terminal output
            if (terminalRef.current) {
              terminalRef.current.write(event.data);
            }
          }
        };

        ws.onerror = (event) => {
          console.error('[SSH Terminal] WebSocket error:', event);
          isConnectingRef.current = false;
          setStatus('error');
          setError('WebSocket connection error');
          terminalRef.current?.writeln('\r\n✗ Connection error\r\n');
        };

        ws.onclose = (event) => {
          console.log('[SSH Terminal] WebSocket closed:', event.code, event.reason);
          isConnectingRef.current = false;
          setStatus('disconnected');
          setLastCloseCode(event.code);

          // Only auto-reconnect on certain close codes:
          // 1000 = clean close, 1006 = abnormal close (network), 1001 = going away
          // DON'T auto-reconnect on: 1008 (policy violation), 1011 (server error), 1002/1003 (protocol/unsupported)
          const shouldAutoReconnect = event.code === 1000 || event.code === 1006 || event.code === 1001;

          if (shouldAutoReconnect && reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectCountRef.current += 1;
            const delay = RECONNECT_DELAY * Math.pow(2, reconnectCountRef.current - 1);
            console.log(`[SSH Terminal] Auto-reconnecting attempt ${reconnectCountRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
            terminalRef.current?.writeln(`\r\n⟳ Reconnecting in ${delay}ms...\r\n`);

            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }

            reconnectTimeoutRef.current = setTimeout(() => {
              const savedSessionId = localStorage.getItem(STORAGE_KEY);
              connect(savedSessionId || undefined);
            }, delay);
          } else if (!shouldAutoReconnect && event.code !== 1000) {
            // Fatal error - don't retry
            const reason = event.reason || `Close code: ${event.code}`;
            setError(`Connection failed: ${reason}. Click Reconnect to try again.`);
            terminalRef.current?.writeln(`\r\n✗ Connection failed: ${reason}\r\n`);
            localStorage.removeItem(STORAGE_KEY); // Clear bad session
          }
        };
      } catch (err: any) {
        console.error('[SSH Terminal] Connection error:', err);
        isConnectingRef.current = false;
        setError(err.message || 'Failed to connect');
        setStatus('error');
      }
    }, [connectionId, initializeTerminal, onSessionReady]);

    /**
     * Disconnect from WebSocket
     */
    const disconnect = useCallback(() => {
      isConnectingRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        console.log('[SSH Terminal] Disconnecting...');
        wsRef.current.close(1000, 'User disconnected');
        wsRef.current = null;
      }

      // Clear session and error state
      localStorage.removeItem(STORAGE_KEY);
      setSessionId(null);
      setStatus('disconnected');
      setError(null);
      reconnectCountRef.current = 0;
      console.log('[SSH Terminal] Disconnected');
    }, [STORAGE_KEY]);

    /**
     * Clear terminal
     */
    const clearTerminal = useCallback(() => {
      if (terminalRef.current) {
        terminalRef.current.clear();
        setLogs([]);
      }
    }, []);

    /**
     * Download terminal logs
     */
    const downloadLogs = useCallback(() => {
      if (!terminalRef.current) return;

      const content = terminalRef.current.buffer.active.getLine(0)?.translateToString(true, 0, 80) || '';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ssh-terminal-${connectionId}-${Date.now()}.log`;
      a.click();
      URL.revokeObjectURL(url);
    }, [connectionId]);

    /**
     * Copy terminal content to clipboard
     */
    const copyTerminal = useCallback(() => {
      if (!terminalRef.current) return;

      const content = terminalRef.current.buffer.active.getLine(0)?.translateToString(true, 0, 80) || '';
      navigator.clipboard.writeText(content).then(() => {
        alert('Terminal content copied to clipboard');
      }).catch((err) => {
        console.error('Copy failed:', err);
      });
    }, []);

    /**
     * Auto-connect on mount
     */
    useEffect(() => {
      if (!autoConnect) return;

      // Only attempt to recover if we haven't had a fatal error on this connection
      // Check if we should recover: only if lastCloseCode is null (never failed) or 1000/1006 (clean/network)
      if (lastCloseCode && lastCloseCode !== 1000 && lastCloseCode !== 1006 && lastCloseCode !== 1001) {
        console.log('[SSH Terminal] Not auto-connecting due to previous fatal error (code:', lastCloseCode, ')');
        return;
      }

      // Try to recover existing session
      const savedSessionId = localStorage.getItem(STORAGE_KEY);
      if (savedSessionId) {
        console.log('[SSH Terminal] Recovering previous session:', savedSessionId.substring(0, 8));
      }
      connect(savedSessionId || undefined);

      return () => {
        // Cleanup on unmount - but DON'T disconnect, to preserve session
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };
    }, [autoConnect, STORAGE_KEY, connect, lastCloseCode]);

    return (
      <div ref={ref} className={className || ''}>
        <Card className="w-full h-full flex flex-col">
          <CardHeader>
              <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      status === 'connected'
                        ? 'bg-green-500'
                        : status === 'connecting'
                        ? 'bg-yellow-500 animate-pulse'
                        : status === 'error'
                        ? 'bg-red-500'
                        : 'bg-gray-500'
                    }`}
                  />
                  SSH Terminal
                </CardTitle>
                <CardDescription>
                  {connectionName || `Connection ${connectionId}`}
                  {sessionId && ` • Session: ${sessionId.substring(0, 8)}...`}
                  {status === 'connecting' && ` • Connecting...`}
                  {status === 'error' && lastCloseCode && ` • Error (${lastCloseCode})`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyTerminal}
                  disabled={status !== 'connected'}
                  title="Copy terminal content"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadLogs}
                  disabled={status !== 'connected'}
                  title="Download logs"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearTerminal}
                  disabled={status !== 'connected'}
                  title="Clear terminal"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {status === 'connected' ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={disconnect}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      reconnectCountRef.current = 0;
                      setLastCloseCode(null); // Clear error state
                      connect();
                    }}
                    disabled={status === 'connecting'}
                  >
                    {status === 'connecting' ? 'Connecting...' : 'Connect'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {error && (
            <div className="px-6 pb-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  {status !== 'connected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        reconnectCountRef.current = 0;
                        setLastCloseCode(null);
                        connect();
                      }}
                    >
                      Retry
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}

          <CardContent className="flex-1 overflow-hidden p-0">
            <div
              ref={termRef}
              className="w-full h-full bg-slate-950 rounded-b-lg overflow-hidden"
              style={{ minHeight: '400px' }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }
);

SSHTerminal.displayName = 'SSHTerminal';
