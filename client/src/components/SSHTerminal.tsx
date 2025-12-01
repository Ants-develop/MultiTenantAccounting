import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Terminal, Play, Square, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TerminalLine {
  type: 'output' | 'error' | 'system' | 'command';
  content: string;
  timestamp: Date;
}

export function SSHTerminal() {
  const [output, setOutput] = useState<TerminalLine[]>([]);
  const [command, setCommand] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [output]);

  const addLine = (type: TerminalLine['type'], content: string) => {
    setOutput((prev) => [
      ...prev,
      { type, content, timestamp: new Date() }
    ]);
  };

  const executeCommand = async () => {
    if (!command.trim() || isExecuting) return;

    const cmd = command.trim();
    setCommand("");
    addLine('command', `$ ${cmd}`);
    setIsExecuting(true);

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Use fetch with POST for SSE
      const response = await fetch('/api/connections/ssh-execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: cmd }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
            continue;
          }
          
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            if (!data) continue;
            
            try {
              const parsed = JSON.parse(data);
              
              if (currentEvent === 'output' || currentEvent === 'error-output') {
                if (parsed.data) {
                  addLine(currentEvent === 'error-output' ? 'error' : 'output', parsed.data);
                }
              } else if (parsed.message) {
                addLine('system', parsed.message);
              }
            } catch (e) {
              // If not JSON, treat as plain text
              if (data) {
                addLine('output', data);
              }
            }
            currentEvent = '';
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
            continue;
          }
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            if (data) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.data) {
                  addLine(currentEvent === 'error-output' ? 'error' : 'output', parsed.data);
                } else if (parsed.message) {
                  addLine('system', parsed.message);
                }
              } catch (e) {
                if (data) {
                  addLine('output', data);
                }
              }
            }
            currentEvent = '';
          }
        }
      }

      setIsExecuting(false);
      setAbortController(null);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        addLine('system', 'Command cancelled');
      } else {
        addLine('error', `Error: ${error.message}`);
      }
      setIsExecuting(false);
      setAbortController(null);
    }
  };

  const stopCommand = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsExecuting(false);
    addLine('system', 'Command stopped');
  };

  const clearOutput = () => {
    setOutput([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Terminal className="h-5 w-5" />
            SSH Terminal
          </CardTitle>
          <div className="flex gap-2">
            {isExecuting && (
              <Button
                variant="outline"
                size="sm"
                onClick={stopCommand}
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={clearOutput}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Terminal Output */}
        <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-md h-96 overflow-y-auto">
          {output.length === 0 ? (
            <div className="text-gray-500">
              <p>SSH Terminal Ready</p>
              <p className="text-xs mt-2">Type a PowerShell command and press Enter to execute</p>
            </div>
          ) : (
            <>
              {output.map((line, index) => (
                <div
                  key={index}
                  className={`${
                    line.type === 'error'
                      ? 'text-red-400'
                      : line.type === 'command'
                      ? 'text-yellow-400'
                      : line.type === 'system'
                      ? 'text-blue-400'
                      : 'text-green-400'
                  }`}
                >
                  {line.content}
                </div>
              ))}
              <div ref={outputEndRef} />
            </>
          )}
        </div>

        {/* Command Input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter PowerShell command (e.g., Get-Date, Get-Process, ls, pwd)"
            disabled={isExecuting}
            className="font-mono"
          />
          <Button
            onClick={executeCommand}
            disabled={!command.trim() || isExecuting}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Execute
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Commands are executed on the remote Windows MSSQL server via SSH
        </p>
      </CardContent>
    </Card>
  );
}

