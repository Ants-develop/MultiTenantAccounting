declare module 'multer' {
  import { Request } from 'express';
  
  export interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }
  
  export interface StorageEngine {
    _handleFile(req: Request, file: File, callback: (error?: any, info?: any) => void): void;
    _removeFile(req: Request, file: File, callback: (error: Error | null) => void): void;
  }
  
  export function diskStorage(options: {
    destination?: string | ((req: Request, file: File, cb: (error: Error | null, destination: string) => void) => void);
    filename?: (req: Request, file: File, cb: (error: Error | null, filename: string) => void) => void;
  }): StorageEngine;
  
  export function memoryStorage(): StorageEngine;
  
  export interface Multer {
    (options?: any): any;
    diskStorage: typeof diskStorage;
    memoryStorage: typeof memoryStorage;
  }
  
  const multer: Multer;
  export default multer;
}

