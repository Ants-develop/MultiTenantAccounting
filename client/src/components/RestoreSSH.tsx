import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Terminal, Cloud, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { backupRestoreApi, DriveFile } from '@/api/backup-restore';

interface RestoreLog {
    timestamp: string;
    message: string;
    type: 'info' | 'error' | 'success';
}

interface RestoreSSHProps {
    onComplete?: (restoreId: number) => void;
}

export function RestoreSSH({ onComplete }: RestoreSSHProps) {
    const [fileName, setFileName] = useState('');
    const [selectedFileId, setSelectedFileId] = useState<string>('');
    const [extractedDate, setExtractedDate] = useState<string | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [logs, setLogs] = useState<RestoreLog[]>([]);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'restoring' | 'completed' | 'failed'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [restoreId, setRestoreId] = useState<number | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Fetch Google Drive files
    const { data: driveFiles = [], isLoading: filesLoading, refetch: refetchFiles } = useQuery<DriveFile[]>({
        queryKey: ["/api/backup-restore/drive-files"],
        queryFn: () => backupRestoreApi.fetchDriveFiles(),
        retry: false,
    });

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Cleanup EventSource on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
        setLogs((prev) => [
            ...prev,
            {
                timestamp: new Date().toLocaleTimeString(),
                message,
                type,
            },
        ]);
    };

    const extractDate = async () => {
        if (!fileName.trim()) {
            setError('Please enter a filename');
            return;
        }

        try {
            const response = await fetch('/api/mssql/extract-date', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: fileName.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || data.message || 'Failed to extract date');
                setExtractedDate(null);
                return;
            }

            setExtractedDate(data.extractedDate);
            setError(null);
            addLog(`Date extracted from filename: ${data.extractedDate}`, 'success');
        } catch (err: any) {
            setError(err.message || 'Failed to extract date');
            setExtractedDate(null);
        }
    };

    const handleFileSelection = async (fileId: string) => {
        setSelectedFileId(fileId);
        const selectedFile = driveFiles.find(f => f.id === fileId);

        if (selectedFile) {
            setFileName(selectedFile.name);
            setError(null);

            // Auto-extract date from selected filename
            try {
                const response = await fetch('/api/mssql/extract-date', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: selectedFile.name }),
                });

                const data = await response.json();

                if (response.ok) {
                    setExtractedDate(data.extractedDate);
                    addLog(`Selected: ${selectedFile.name}`, 'info');
                    addLog(`Date extracted: ${data.extractedDate}`, 'success');
                } else {
                    setError(data.error || 'Failed to extract date from selected file');
                    setExtractedDate(null);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to extract date');
                setExtractedDate(null);
            }
        }
    };

    const startRestore = async () => {
        if (!fileName.trim()) {
            setError('Please enter a filename');
            return;
        }

        setIsRestoring(true);
        setStatus('connecting');
        setError(null);
        setLogs([]);
        setRestoreId(null);

        addLog('Initiating restore operation...', 'info');
        addLog(`Filename: ${fileName}`, 'info');

        try {
            // Close any existing EventSource
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            // Create EventSource for Server-Sent Events
            const eventSource = new EventSource(
                `/api/mssql/restore-ssh?fileName=${encodeURIComponent(fileName.trim())}`
            );
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                addLog('Connected to restore stream', 'success');
                setStatus('restoring');
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch (data.type) {
                        case 'connected':
                            addLog(data.message, 'success');
                            if (data.extractedDate) {
                                setExtractedDate(data.extractedDate);
                                addLog(`Date extracted: ${data.extractedDate}`, 'info');
                            }
                            break;

                        case 'progress':
                            addLog(data.message, 'info');
                            if (data.status === 'completed') {
                                setStatus('completed');
                            } else if (data.status === 'failed') {
                                setStatus('failed');
                            }
                            break;

                        case 'completed':
                            addLog(data.message, 'success');
                            setStatus('completed');
                            setRestoreId(data.restoreId);
                            setIsRestoring(false);
                            eventSource.close();
                            if (onComplete && data.restoreId) {
                                onComplete(data.restoreId);
                            }
                            break;

                        case 'error':
                            addLog(`Error: ${data.message}`, 'error');
                            setStatus('failed');
                            setError(data.message);
                            setIsRestoring(false);
                            eventSource.close();
                            break;

                        default:
                            addLog(data.message || JSON.stringify(data), 'info');
                    }
                } catch (err) {
                    console.error('Error parsing SSE data:', err);
                    addLog(`Received: ${event.data}`, 'info');
                }
            };

            eventSource.onerror = (err) => {
                console.error('EventSource error:', err);
                addLog('Connection error or stream ended', 'error');
                setIsRestoring(false);

                if (status !== 'completed') {
                    setStatus('failed');
                    setError('Connection lost or restore failed');
                }

                eventSource.close();
            };
        } catch (err: any) {
            addLog(`Error: ${err.message}`, 'error');
            setError(err.message || 'Failed to start restore');
            setIsRestoring(false);
            setStatus('failed');
        }
    };

    const cancelRestore = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setIsRestoring(false);
        setStatus('idle');
        addLog('Restore cancelled by user', 'error');
    };

    const resetForm = () => {
        setFileName('');
        setSelectedFileId('');
        setExtractedDate(null);
        setLogs([]);
        setStatus('idle');
        setError(null);
        setRestoreId(null);
        setIsRestoring(false);
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'restoring':
            case 'connecting':
                return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
            case 'completed':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'failed':
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Terminal className="h-5 w-5 text-gray-500" />;
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {getStatusIcon()}
                        <CardTitle>SSH-Based Database Restore</CardTitle>
                    </div>
                    {status !== 'idle' && (
                        <span className="text-sm font-medium capitalize text-muted-foreground">
                            {status}
                        </span>
                    )}
                </div>
                <CardDescription>
                    Restore database from Google Drive backup using PowerShell scripts on remote server
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Google Drive File Selector */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="driveFileSelect">Select from Google Drive</Label>
                        <Button
                            onClick={() => refetchFiles()}
                            disabled={filesLoading || isRestoring}
                            variant="ghost"
                            size="sm"
                        >
                            <RefreshCw className={`h-4 w-4 ${filesLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    {filesLoading ? (
                        <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading files from Google Drive...
                        </div>
                    ) : driveFiles.length === 0 ? (
                        <Alert>
                            <Cloud className="h-4 w-4" />
                            <AlertDescription>
                                No .bak files found in Google Drive. Make sure files are uploaded and accessible.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Select
                            value={selectedFileId}
                            onValueChange={handleFileSelection}
                            disabled={isRestoring}
                        >
                            <SelectTrigger id="driveFileSelect">
                                <SelectValue placeholder="Select a backup file..." />
                            </SelectTrigger>
                            <SelectContent>
                                {driveFiles.map((file) => (
                                    <SelectItem key={file.id} value={file.id}>
                                        <div className="flex items-center gap-2">
                                            <Cloud className="h-3 w-3" />
                                            <span>{file.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                    </div>
                </div>

                {/* Filename Input */}
                <div className="space-y-2">
                    <Label htmlFor="fileName">Backup Filename</Label>
                    <div className="flex gap-2">
                        <Input
                            id="fileName"
                            placeholder="Ants_19.05.2025.bak"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            disabled={isRestoring}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isRestoring) {
                                    extractDate();
                                }
                            }}
                        />
                        <Button
                            onClick={extractDate}
                            disabled={isRestoring || !fileName.trim()}
                            variant="outline"
                        >
                            Extract Date
                        </Button>
                    </div>
                    {extractedDate && (
                        <p className="text-sm text-green-600">
                            ✓ Date extracted: {extractedDate}
                        </p>
                    )}
                </div>

                {/* Error Alert */}
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <Button
                        onClick={startRestore}
                        disabled={isRestoring || !fileName.trim()}
                        className="flex-1"
                    >
                        {isRestoring ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Restoring...
                            </>
                        ) : (
                            'Start Restore'
                        )}
                    </Button>
                    {isRestoring && (
                        <Button onClick={cancelRestore} variant="destructive">
                            Cancel
                        </Button>
                    )}
                    {status === 'completed' || status === 'failed' ? (
                        <Button onClick={resetForm} variant="outline">
                            Reset
                        </Button>
                    ) : null}
                </div>

                {/* Logs Display */}
                {logs.length > 0 && (
                    <div className="space-y-2">
                        <Label>Restore Logs</Label>
                        <ScrollArea className="h-[400px] w-full rounded-md border bg-slate-950 p-4">
                            <div className="space-y-1 font-mono text-xs">
                                {logs.map((log, index) => (
                                    <div
                                        key={index}
                                        className={`flex gap-2 ${log.type === 'error'
                                                ? 'text-red-400'
                                                : log.type === 'success'
                                                    ? 'text-green-400'
                                                    : 'text-slate-300'
                                            }`}
                                    >
                                        <span className="text-slate-500">[{log.timestamp}]</span>
                                        <span>{log.message}</span>
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {/* Restore ID Display */}
                {restoreId && (
                    <Alert>
                        <AlertDescription>
                            Restore completed successfully! Restore ID: {restoreId}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
