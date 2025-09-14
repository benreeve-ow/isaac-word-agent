/**
 * Strongly typed tool parameter definitions
 * Replaces the use of 'any' throughout the tool system
 */

// Base types for all tool parameters
export interface BaseToolParams {
  [key: string]: unknown;
}

// Text selection and anchoring
export interface TextAnchorParams extends BaseToolParams {
  anchor: string;
}

export interface TextRangeParams extends BaseToolParams {
  startAnchor: string;
  endAnchor?: string;
}

// Text editing operations
export interface InsertTextParams extends BaseToolParams {
  position: 'start' | 'end' | 'after' | 'before';
  anchor?: string;
  content: string;
}

export interface ReplaceTextParams extends BaseToolParams {
  anchor: string;
  content: string;
  scope: 'paragraph' | 'exact';
}

export interface DeleteTextParams extends BaseToolParams {
  anchor: string;
  scope: 'paragraph' | 'exact';
}

// Formatting operations
export interface ApplyStyleParams extends BaseToolParams {
  anchor: string;
  style: string;
  scope?: 'paragraph' | 'text';
}

export interface CreateListParams extends BaseToolParams {
  startAnchor: string;
  endAnchor: string;
  listType: 'bullet' | 'numbered';
  style?: string;
}

export interface AdjustListLevelParams extends BaseToolParams {
  startAnchor: string;
  endAnchor?: string;
  direction: 'increase' | 'decrease';
  levels?: number;
}

export interface SetAlignmentParams extends TextRangeParams {
  alignment: 'left' | 'center' | 'right' | 'justify';
}

export interface SetSpacingParams extends TextRangeParams {
  lineSpacing?: string;
  spaceBefore?: number;
  spaceAfter?: number;
}

export interface SetIndentationParams extends TextRangeParams {
  firstLine?: number;
  leftIndent?: number;
  rightIndent?: number;
  hanging?: number;
}

export interface SetFontPropertiesParams extends BaseToolParams {
  anchor: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  highlightColor?: string;
}

// Table operations
export interface InsertTableParams extends BaseToolParams {
  position: 'start' | 'end' | 'after' | 'before';
  anchor?: string;
  rows: number;
  columns: number;
  data?: string[][];
  headerRow?: boolean;
  style?: 'grid' | 'simple' | 'none';
}

export interface EditTableParams extends BaseToolParams {
  tableIndex: number;
  row: number;
  column: number;
  newValue: string;
}

// Comment operations
export interface AddCommentParams extends BaseToolParams {
  anchor: string;
  comment: string;
  type?: 'suggestion' | 'question' | 'issue' | 'praise' | 'general';
}

export interface ResolveCommentParams extends BaseToolParams {
  commentIndex: number;
  replyText?: string;
}

// Document reading
export interface ReadDocumentParams extends BaseToolParams {
  includeFormatting?: boolean;
  includeComments?: boolean;
}

export interface ReadUnifiedDocumentParams extends BaseToolParams {
  includeComments?: boolean;
  formatTables?: boolean;
}

// Break operations
export interface InsertBreakParams extends BaseToolParams {
  position: 'start' | 'end' | 'after' | 'before';
  anchor?: string;
  breakType: 'page' | 'sectionNext' | 'sectionContinuous' | 'sectionEven' | 'sectionOdd' | 'column';
}

// Footnote operations
export interface InsertFootnoteParams extends BaseToolParams {
  anchor: string;
  text: string;
  type?: 'footnote' | 'endnote';
}

// Link operations
export interface InsertLinkParams extends BaseToolParams {
  anchor: string;
  url: string;
  tooltip?: string;
}

// Type guard functions
export function isTextAnchorParams(params: unknown): params is TextAnchorParams {
  return typeof params === 'object' && params !== null && 'anchor' in params;
}

export function isTextRangeParams(params: unknown): params is TextRangeParams {
  return typeof params === 'object' && params !== null && 'startAnchor' in params;
}

export function hasRequiredParams<T extends BaseToolParams>(
  params: unknown,
  required: (keyof T)[]
): params is T {
  if (typeof params !== 'object' || params === null) {
    return false;
  }
  
  const paramObj = params as Record<string, unknown>;
  return required.every(key => key in paramObj && paramObj[key as string] !== undefined);
}

// Result types
export interface SuccessResult {
  success: true;
  message?: string;
  data?: unknown;
}

export interface ErrorResult {
  success: false;
  error: string;
  details?: unknown;
}

export type ToolExecutionResult = SuccessResult | ErrorResult;

// Validation helper
export class ParamValidator {
  static validate<T extends BaseToolParams>(
    params: unknown,
    required: (keyof T)[],
    typeName: string
  ): T {
    if (!hasRequiredParams<T>(params, required)) {
      const missing = required.filter(key => 
        !(params as any)?.[key]
      );
      throw new Error(`Missing required parameters for ${typeName}: ${missing.join(', ')}`);
    }
    return params as T;
  }
  
  static validateString(value: unknown, paramName: string): string {
    if (typeof value !== 'string') {
      throw new Error(`Parameter ${paramName} must be a string`);
    }
    return value;
  }
  
  static validateNumber(value: unknown, paramName: string): number {
    if (typeof value !== 'number') {
      throw new Error(`Parameter ${paramName} must be a number`);
    }
    return value;
  }
  
  static validateBoolean(value: unknown, paramName: string): boolean {
    if (typeof value !== 'boolean') {
      throw new Error(`Parameter ${paramName} must be a boolean`);
    }
    return value;
  }
  
  static validateEnum<T extends string>(
    value: unknown,
    validValues: readonly T[],
    paramName: string
  ): T {
    if (!validValues.includes(value as T)) {
      throw new Error(`Parameter ${paramName} must be one of: ${validValues.join(', ')}`);
    }
    return value as T;
  }
}