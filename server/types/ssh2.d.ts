// Type declarations for ssh2 package
declare module 'ssh2' {
  import { EventEmitter } from 'events';

  export interface ConnectConfig {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
    readyTimeout?: number;
    [key: string]: any;
  }

  export interface ClientStream extends EventEmitter {
    stdout: NodeJS.ReadableStream;
    stderr: NodeJS.ReadableStream;
    on(event: 'data', listener: (data: Buffer) => void): this;
    on(event: 'close', listener: (code: number, signal?: string) => void): this;
    [key: string]: any;
  }

  export interface KeyboardInteractivePrompt {
    prompt: string;
    echo?: boolean;
  }

  export type KeyboardInteractiveFinish = (responses: string[]) => void;

  export interface SFTPStream extends EventEmitter {
    writeFile(remotePath: string, data: Buffer | string, options?: any, callback?: (err?: Error) => void): void;
    createWriteStream(remotePath: string, options?: any): NodeJS.WritableStream;
    fastPut(localPath: string, remotePath: string, options?: any, callback?: (err?: Error) => void): void;
    mkdir(path: string, attributes?: any, callback?: (err?: Error) => void): void;
    [key: string]: any;
  }

  export class Client extends EventEmitter {
    connect(config: ConnectConfig): void;
    exec(command: string, callback: (err: Error | undefined, stream: ClientStream) => void): void;
    sftp(callback: (err: Error | undefined, sftp: SFTPStream) => void): void;
    end(): void;
    connected: boolean;
    on(event: 'ready', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'keyboard-interactive', listener: (name: string, instructions: string, instructionsLang: string, prompts: KeyboardInteractivePrompt[], finish: KeyboardInteractiveFinish) => void): this;
    [key: string]: any;
  }
}

