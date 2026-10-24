export type InputFormat = 'auto' | 'hex' | 'binary' | 'decimal' | 'text' | 'base64';

export type WorkbenchTab =
  | 'byte-detective'
  | 'hash-detective'
  | 'conversion-lab'
  | 'bitwise-lab'
  | 'reverse-eng'
  | 'networking'
  | 'calculator';

/** A one-shot instruction that loads data into a lab without remounting it. */
export interface WorkbenchLoad {
  id: number;
  tab: WorkbenchTab;
  payload: Record<string, string>;
}

export interface ByteInfo {
  offset: number;
  hex: string;
  bin: string;
  dec: number;
  signedDec: number;
  ascii: string;
  isPrintable: boolean;
  highNibble: string;
  lowNibble: string;
}

export interface SignatureMatch {
  name: string;
  extension: string;
  mime: string;
  offset: number;
  confidence: 'exact' | 'partial';
  matchedHex: string;
  description: string;
  disclaimer: string;
}

export interface DetectedPattern {
  type: 'null_padding' | 'repeated_bytes' | 'ascii_strings' | 'high_entropy' | 'low_entropy' | 'base64_candidate';
  title: string;
  description: string;
  offsetRange?: [number, number];
  details?: string;
}

export interface ByteAnalysisResult {
  bytes: Uint8Array;
  totalBytes: number;
  hexString: string;
  binaryString: string;
  decimalList: number[];
  asciiString: string;
  utf8String: string;
  isValidUtf8: boolean;
  entropy: number;
  signatures: SignatureMatch[];
  patterns: DetectedPattern[];
  byteDetails: ByteInfo[];
  detectedFormat: InputFormat;
  parseWarning?: string;
}

export interface HashPrediction {
  name: string;
  category: 'Standard Cryptographic' | 'Password Hash' | 'Checksum / Non-crypto' | 'Legacy / Broken' | 'Database Hash';
  confidence: number;
  bitLength: number;
  charLength: number;
  charset: string;
  description: string;
  securityStatus: 'Secure' | 'Legacy' | 'Broken' | 'Informational';
  hashcatMode?: string;
  johnFormat?: string;
  sampleUse: string;
}

export interface TraceHistoryItem {
  id: string;
  timestamp: number;
  tool: 'Byte Detective' | 'Hash Detective' | 'Conversion Lab' | 'Bitwise Operations' | 'Reverse Engineering' | 'Networking' | 'Standard Calculator';
  operation: string;
  inputSummary: string;
  params?: string;
  resultSummary: string;
  /** Lab to open when this row is reloaded. */
  restoreTab?: WorkbenchTab;
  /** Field values handed to that lab. The summary above can stay short. */
  restore?: Record<string, string>;
}

export type HistoryEntry = Omit<TraceHistoryItem, 'id' | 'timestamp'>;
