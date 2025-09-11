/**
 * Advanced Formula Engine for Clay.com-style spreadsheet
 * Provides comprehensive expression parsing and built-in function library
 */

import { Lead, ColumnDefinition } from '../types/spreadsheet';

// Formula Types
export interface FormulaAST {
  type: 'function' | 'column' | 'literal' | 'operator' | 'condition';
  name?: string;
  value?: any;
  operator?: string;
  args?: FormulaAST[];
  left?: FormulaAST;
  right?: FormulaAST;
  condition?: FormulaAST;
  trueExpr?: FormulaAST;
  falseExpr?: FormulaAST;
}

export interface FormulaContext {
  lead: Lead;
  columns: ColumnDefinition[];
  allLeads?: Lead[]; // For lookup functions
  externalData?: Record<string, any>; // For external references
}

export class FormulaError extends Error {
  public type: 'syntax' | 'reference' | 'circular' | 'type' | 'division_by_zero' | 'function_not_found';
  public position?: { start: number; end: number };
  public column?: string;

  constructor(config: {
    type: 'syntax' | 'reference' | 'circular' | 'type' | 'division_by_zero' | 'function_not_found';
    message: string;
    position?: { start: number; end: number };
    column?: string;
  }) {
    super(config.message);
    this.name = 'FormulaError';
    this.type = config.type;
    this.position = config.position;
    this.column = config.column;
  }
}

export interface FormulaDependency {
  columnId: string;
  type: 'direct' | 'indirect';
  path: string[];
}

export interface FunctionDefinition {
  name: string;
  category: 'text' | 'math' | 'logic' | 'date' | 'lookup' | 'validation' | 'custom';
  description: string;
  syntax: string;
  minArgs: number;
  maxArgs: number;
  returnType: string;
  examples: string[];
  execute: (args: any[], context: FormulaContext) => any;
}

// Built-in Functions Registry
export class FunctionRegistry {
  private static functions = new Map<string, FunctionDefinition>();

  static register(func: FunctionDefinition): void {
    this.functions.set(func.name.toUpperCase(), func);
  }

  static get(name: string): FunctionDefinition | undefined {
    return this.functions.get(name.toUpperCase());
  }

  static getAll(): FunctionDefinition[] {
    return Array.from(this.functions.values());
  }

  static getByCategory(category: string): FunctionDefinition[] {
    return Array.from(this.functions.values()).filter(f => f.category === category);
  }
}

// Formula Parser
export class FormulaParser {
  private tokens: string[] = [];
  private position = 0;

  parse(expression: string): FormulaAST {
    this.tokens = this.tokenize(expression);
    this.position = 0;
    
    if (this.tokens.length === 0) {
      throw new FormulaError({
        type: 'syntax',
        message: 'Empty expression'
      });
    }

    return this.parseExpression();
  }

  private tokenize(expression: string): string[] {
    const tokens: string[] = [];
    const regex = /([A-Z_][A-Z0-9_]*(?:\([^)]*\))?|"[^"]*"|'[^']*'|[0-9]+\.?[0-9]*|[+\-*\/()=<>&|!,]|\s+)/gi;
    let match;

    while ((match = regex.exec(expression)) !== null) {
      const token = match[0];
      if (!/^\s+$/.test(token)) {
        tokens.push(token);
      }
    }

    return tokens;
  }

  private parseExpression(): FormulaAST {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): FormulaAST {
    let left = this.parseLogicalAnd();

    while (this.current() === 'OR' || this.current() === '||') {
      const operator = this.consume();
      const right = this.parseLogicalAnd();
      left = {
        type: 'operator',
        operator: 'OR',
        left,
        right
      };
    }

    return left;
  }

  private parseLogicalAnd(): FormulaAST {
    let left = this.parseEquality();

    while (this.current() === 'AND' || this.current() === '&&') {
      const operator = this.consume();
      const right = this.parseEquality();
      left = {
        type: 'operator',
        operator: 'AND',
        left,
        right
      };
    }

    return left;
  }

  private parseEquality(): FormulaAST {
    let left = this.parseComparison();

    while (this.current() === '=' || this.current() === '!=' || this.current() === '<>') {
      const operator = this.consume();
      const right = this.parseComparison();
      left = {
        type: 'operator',
        operator: operator === '=' ? 'EQUALS' : 'NOT_EQUALS',
        left,
        right
      };
    }

    return left;
  }

  private parseComparison(): FormulaAST {
    let left = this.parseAddition();

    while (['<', '>', '<=', '>='].includes(this.current())) {
      const operator = this.consume();
      const right = this.parseAddition();
      left = {
        type: 'operator',
        operator: operator.toUpperCase(),
        left,
        right
      };
    }

    return left;
  }

  private parseAddition(): FormulaAST {
    let left = this.parseMultiplication();

    while (['+', '-'].includes(this.current())) {
      const operator = this.consume();
      const right = this.parseMultiplication();
      left = {
        type: 'operator',
        operator: operator === '+' ? 'ADD' : 'SUBTRACT',
        left,
        right
      };
    }

    return left;
  }

  private parseMultiplication(): FormulaAST {
    let left = this.parseUnary();

    while (['*', '/'].includes(this.current())) {
      const operator = this.consume();
      const right = this.parseUnary();
      left = {
        type: 'operator',
        operator: operator === '*' ? 'MULTIPLY' : 'DIVIDE',
        left,
        right
      };
    }

    return left;
  }

  private parseUnary(): FormulaAST {
    if (this.current() === '-') {
      this.consume();
      return {
        type: 'operator',
        operator: 'NEGATE',
        left: this.parseUnary()
      };
    }

    if (this.current() === 'NOT' || this.current() === '!') {
      this.consume();
      return {
        type: 'operator',
        operator: 'NOT',
        left: this.parseUnary()
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): FormulaAST {
    const token = this.current();

    // Parentheses
    if (token === '(') {
      this.consume();
      const expr = this.parseExpression();
      if (this.current() !== ')') {
        throw new FormulaError({
          type: 'syntax',
          message: 'Missing closing parenthesis'
        });
      }
      this.consume();
      return expr;
    }

    // String literal
    if ((token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'"))) {
      this.consume();
      return {
        type: 'literal',
        value: token.slice(1, -1)
      };
    }

    // Number literal
    if (/^\d+\.?\d*$/.test(token)) {
      this.consume();
      return {
        type: 'literal',
        value: parseFloat(token)
      };
    }

    // Function call
    if (/^[A-Z_][A-Z0-9_]*$/i.test(token) && this.peek() === '(') {
      const functionName = this.consume();
      this.consume(); // consume '('
      
      const args: FormulaAST[] = [];
      
      if (this.current() !== ')') {
        args.push(this.parseExpression());
        
        while (this.current() === ',') {
          this.consume();
          args.push(this.parseExpression());
        }
      }
      
      if (this.current() !== ')') {
        throw new FormulaError({
          type: 'syntax',
          message: `Missing closing parenthesis for function ${functionName}`
        });
      }
      
      this.consume();
      
      return {
        type: 'function',
        name: functionName.toUpperCase(),
        args
      };
    }

    // Column reference
    if (/^[A-Z_][A-Z0-9_]*$/i.test(token)) {
      this.consume();
      return {
        type: 'column',
        name: token
      };
    }

    throw new FormulaError({
      type: 'syntax',
      message: `Unexpected token: ${token}`
    });
  }

  private current(): string {
    return this.tokens[this.position] || '';
  }

  private peek(): string {
    return this.tokens[this.position + 1] || '';
  }

  private consume(): string {
    const token = this.current();
    this.position++;
    return token;
  }
}

// Formula Engine
export class FormulaEngine {
  private parser = new FormulaParser();
  private cache = new Map<string, any>();
  private dependencyGraph = new Map<string, Set<string>>();
  private calculatingCells = new Set<string>();

  constructor() {
    this.registerBuiltInFunctions();
  }

  // Evaluate formula expression
  evaluate(expression: string, context: FormulaContext): any {
    try {
      const cacheKey = this.getCacheKey(expression, context);
      
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const ast = this.parser.parse(expression);
      const result = this.evaluateAST(ast, context);
      
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof FormulaError) {
        throw error;
      }
      throw new FormulaError({
        type: 'syntax',
        message: `Formula evaluation error: ${error.message}`
      });
    }
  }

  // Get formula dependencies
  getDependencies(expression: string): string[] {
    try {
      const ast = this.parser.parse(expression);
      const dependencies = new Set<string>();
      this.collectDependencies(ast, dependencies);
      return Array.from(dependencies);
    } catch {
      return [];
    }
  }

  // Check for circular dependencies
  hasCircularDependency(columnId: string, expression: string, allColumns: ColumnDefinition[]): boolean {
    const dependencies = this.getDependencies(expression);
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    return this.detectCircular(columnId, dependencies, allColumns, visited, recursionStack);
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Clear specific cache entry
  clearCacheFor(expression: string, context: FormulaContext): void {
    const cacheKey = this.getCacheKey(expression, context);
    this.cache.delete(cacheKey);
  }

  private evaluateAST(ast: FormulaAST, context: FormulaContext): any {
    switch (ast.type) {
      case 'literal':
        return ast.value;

      case 'column':
        return this.getColumnValue(ast.name!, context);

      case 'function':
        return this.evaluateFunction(ast.name!, ast.args || [], context);

      case 'operator':
        return this.evaluateOperator(ast, context);

      case 'condition':
        const conditionResult = this.evaluateAST(ast.condition!, context);
        return conditionResult 
          ? this.evaluateAST(ast.trueExpr!, context)
          : this.evaluateAST(ast.falseExpr!, context);

      default:
        throw new FormulaError({
          type: 'syntax',
          message: `Unknown AST node type: ${ast.type}`
        });
    }
  }

  private evaluateOperator(ast: FormulaAST, context: FormulaContext): any {
    const { operator, left, right } = ast;

    switch (operator) {
      case 'ADD':
        return this.evaluateAST(left!, context) + this.evaluateAST(right!, context);
      
      case 'SUBTRACT':
        return this.evaluateAST(left!, context) - this.evaluateAST(right!, context);
      
      case 'MULTIPLY':
        return this.evaluateAST(left!, context) * this.evaluateAST(right!, context);
      
      case 'DIVIDE':
        const rightValue = this.evaluateAST(right!, context);
        if (rightValue === 0) {
          throw new FormulaError({
            type: 'division_by_zero',
            message: 'Division by zero'
          });
        }
        return this.evaluateAST(left!, context) / rightValue;
      
      case 'EQUALS':
        return this.evaluateAST(left!, context) === this.evaluateAST(right!, context);
      
      case 'NOT_EQUALS':
        return this.evaluateAST(left!, context) !== this.evaluateAST(right!, context);
      
      case '<':
        return this.evaluateAST(left!, context) < this.evaluateAST(right!, context);
      
      case '>':
        return this.evaluateAST(left!, context) > this.evaluateAST(right!, context);
      
      case '<=':
        return this.evaluateAST(left!, context) <= this.evaluateAST(right!, context);
      
      case '>=':
        return this.evaluateAST(left!, context) >= this.evaluateAST(right!, context);
      
      case 'AND':
        return this.evaluateAST(left!, context) && this.evaluateAST(right!, context);
      
      case 'OR':
        return this.evaluateAST(left!, context) || this.evaluateAST(right!, context);
      
      case 'NOT':
        return !this.evaluateAST(left!, context);
      
      case 'NEGATE':
        return -this.evaluateAST(left!, context);
      
      default:
        throw new FormulaError({
          type: 'syntax',
          message: `Unknown operator: ${operator}`
        });
    }
  }

  private evaluateFunction(name: string, args: FormulaAST[], context: FormulaContext): any {
    const func = FunctionRegistry.get(name);
    
    if (!func) {
      throw new FormulaError({
        type: 'function_not_found',
        message: `Unknown function: ${name}`
      });
    }

    if (args.length < func.minArgs || args.length > func.maxArgs) {
      throw new FormulaError({
        type: 'syntax',
        message: `Function ${name} expects ${func.minArgs}-${func.maxArgs} arguments, got ${args.length}`
      });
    }

    const evaluatedArgs = args.map(arg => this.evaluateAST(arg, context));
    return func.execute(evaluatedArgs, context);
  }

  private getColumnValue(columnName: string, context: FormulaContext): any {
    // Handle special column names
    if (columnName.toUpperCase() === 'ROW_INDEX') {
      return context.allLeads?.indexOf(context.lead) || 0;
    }

    const column = context.columns.find(col => 
      col.key === columnName || 
      col.id === columnName || 
      col.name === columnName
    );

    if (!column) {
      throw new FormulaError({
        type: 'reference',
        message: `Column not found: ${columnName}`,
        column: columnName
      });
    }

    // Get value from lead data or extended fields
    let value = context.lead[column.key as keyof Lead];
    
    if (value === undefined && context.lead.extendedFields) {
      value = context.lead.extendedFields[column.key];
    }

    return value;
  }

  private collectDependencies(ast: FormulaAST, dependencies: Set<string>): void {
    if (ast.type === 'column' && ast.name) {
      dependencies.add(ast.name);
    }

    if (ast.args) {
      ast.args.forEach(arg => this.collectDependencies(arg, dependencies));
    }

    if (ast.left) {
      this.collectDependencies(ast.left, dependencies);
    }

    if (ast.right) {
      this.collectDependencies(ast.right, dependencies);
    }

    if (ast.condition) {
      this.collectDependencies(ast.condition, dependencies);
    }

    if (ast.trueExpr) {
      this.collectDependencies(ast.trueExpr, dependencies);
    }

    if (ast.falseExpr) {
      this.collectDependencies(ast.falseExpr, dependencies);
    }
  }

  private detectCircular(
    columnId: string, 
    dependencies: string[], 
    allColumns: ColumnDefinition[],
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    if (recursionStack.has(columnId)) {
      return true;
    }

    if (visited.has(columnId)) {
      return false;
    }

    visited.add(columnId);
    recursionStack.add(columnId);

    for (const dep of dependencies) {
      const depColumn = allColumns.find(col => 
        col.id === dep || col.key === dep || col.name === dep
      );

      if (depColumn?.formula?.expression) {
        const depDependencies = this.getDependencies(depColumn.formula.expression);
        if (this.detectCircular(dep, depDependencies, allColumns, visited, recursionStack)) {
          return true;
        }
      }
    }

    recursionStack.delete(columnId);
    return false;
  }

  private getCacheKey(expression: string, context: FormulaContext): string {
    return `${expression}:${context.lead.id}`;
  }

  private registerBuiltInFunctions(): void {
    // Text Functions
    FunctionRegistry.register({
      name: 'CONCAT',
      category: 'text',
      description: 'Concatenates multiple text values',
      syntax: 'CONCAT(text1, text2, ...)',
      minArgs: 2,
      maxArgs: 10,
      returnType: 'string',
      examples: ['CONCAT(first_name, " ", last_name)', 'CONCAT("Hello ", name, "!")'],
      execute: (args) => args.map(arg => String(arg || '')).join('')
    });

    FunctionRegistry.register({
      name: 'UPPER',
      category: 'text',
      description: 'Converts text to uppercase',
      syntax: 'UPPER(text)',
      minArgs: 1,
      maxArgs: 1,
      returnType: 'string',
      examples: ['UPPER(first_name)'],
      execute: (args) => String(args[0] || '').toUpperCase()
    });

    FunctionRegistry.register({
      name: 'LOWER',
      category: 'text',
      description: 'Converts text to lowercase',
      syntax: 'LOWER(text)',
      minArgs: 1,
      maxArgs: 1,
      returnType: 'string',
      examples: ['LOWER(email)'],
      execute: (args) => String(args[0] || '').toLowerCase()
    });

    FunctionRegistry.register({
      name: 'TRIM',
      category: 'text',
      description: 'Removes leading and trailing whitespace',
      syntax: 'TRIM(text)',
      minArgs: 1,
      maxArgs: 1,
      returnType: 'string',
      examples: ['TRIM(company)'],
      execute: (args) => String(args[0] || '').trim()
    });

    FunctionRegistry.register({
      name: 'LEFT',
      category: 'text',
      description: 'Returns leftmost characters from text',
      syntax: 'LEFT(text, length)',
      minArgs: 2,
      maxArgs: 2,
      returnType: 'string',
      examples: ['LEFT(email, 5)'],
      execute: (args) => String(args[0] || '').substring(0, Math.max(0, args[1]))
    });

    FunctionRegistry.register({
      name: 'RIGHT',
      category: 'text',
      description: 'Returns rightmost characters from text',
      syntax: 'RIGHT(text, length)',
      minArgs: 2,
      maxArgs: 2,
      returnType: 'string',
      examples: ['RIGHT(phone, 4)'],
      execute: (args) => {
        const text = String(args[0] || '');
        const length = Math.max(0, args[1]);
        return text.substring(Math.max(0, text.length - length));
      }
    });

    FunctionRegistry.register({
      name: 'FIND',
      category: 'text',
      description: 'Finds the position of text within another text',
      syntax: 'FIND(search_text, text)',
      minArgs: 2,
      maxArgs: 2,
      returnType: 'number',
      examples: ['FIND("@", email)'],
      execute: (args) => {
        const search = String(args[0]);
        const text = String(args[1] || '');
        const pos = text.indexOf(search);
        return pos === -1 ? 0 : pos + 1; // 1-based indexing like Excel
      }
    });

    // Math Functions
    FunctionRegistry.register({
      name: 'SUM',
      category: 'math',
      description: 'Sums numeric values',
      syntax: 'SUM(number1, number2, ...)',
      minArgs: 1,
      maxArgs: 10,
      returnType: 'number',
      examples: ['SUM(emails_sent, emails_opened)'],
      execute: (args) => args.reduce((sum, arg) => sum + (Number(arg) || 0), 0)
    });

    FunctionRegistry.register({
      name: 'AVERAGE',
      category: 'math',
      description: 'Calculates the average of numeric values',
      syntax: 'AVERAGE(number1, number2, ...)',
      minArgs: 1,
      maxArgs: 10,
      returnType: 'number',
      examples: ['AVERAGE(emails_sent, replies)'],
      execute: (args) => {
        const validNumbers = args.filter(arg => !isNaN(Number(arg))).map(Number);
        return validNumbers.length > 0 
          ? validNumbers.reduce((sum, num) => sum + num, 0) / validNumbers.length
          : 0;
      }
    });

    FunctionRegistry.register({
      name: 'ROUND',
      category: 'math',
      description: 'Rounds a number to specified decimal places',
      syntax: 'ROUND(number, decimals)',
      minArgs: 1,
      maxArgs: 2,
      returnType: 'number',
      examples: ['ROUND(3.14159, 2)'],
      execute: (args) => {
        const num = Number(args[0]) || 0;
        const decimals = Math.max(0, Number(args[1]) || 0);
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
      }
    });

    // Logic Functions
    FunctionRegistry.register({
      name: 'IF',
      category: 'logic',
      description: 'Returns one value if condition is true, another if false',
      syntax: 'IF(condition, value_if_true, value_if_false)',
      minArgs: 3,
      maxArgs: 3,
      returnType: 'any',
      examples: ['IF(emails_sent > 0, "Contacted", "Not Contacted")'],
      execute: (args) => args[0] ? args[1] : args[2]
    });

    FunctionRegistry.register({
      name: 'ISBLANK',
      category: 'logic',
      description: 'Tests whether a value is blank',
      syntax: 'ISBLANK(value)',
      minArgs: 1,
      maxArgs: 1,
      returnType: 'boolean',
      examples: ['ISBLANK(phone)'],
      execute: (args) => args[0] === null || args[0] === undefined || String(args[0]).trim() === ''
    });

    // Date Functions
    FunctionRegistry.register({
      name: 'NOW',
      category: 'date',
      description: 'Returns current date and time',
      syntax: 'NOW()',
      minArgs: 0,
      maxArgs: 0,
      returnType: 'date',
      examples: ['NOW()'],
      execute: () => new Date()
    });

    FunctionRegistry.register({
      name: 'TODAY',
      category: 'date',
      description: 'Returns current date',
      syntax: 'TODAY()',
      minArgs: 0,
      maxArgs: 0,
      returnType: 'date',
      examples: ['TODAY()'],
      execute: () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
    });

    // Validation Functions
    FunctionRegistry.register({
      name: 'ISEMAIL',
      category: 'validation',
      description: 'Tests whether a value is a valid email address',
      syntax: 'ISEMAIL(text)',
      minArgs: 1,
      maxArgs: 1,
      returnType: 'boolean',
      examples: ['ISEMAIL(email)'],
      execute: (args) => {
        const email = String(args[0] || '');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      }
    });

    FunctionRegistry.register({
      name: 'ISPHONE',
      category: 'validation',
      description: 'Tests whether a value is a valid phone number',
      syntax: 'ISPHONE(text)',
      minArgs: 1,
      maxArgs: 1,
      returnType: 'boolean',
      examples: ['ISPHONE(phone)'],
      execute: (args) => {
        const phone = String(args[0] || '').replace(/\D/g, '');
        return phone.length >= 10 && phone.length <= 15;
      }
    });

    // Custom Functions
    FunctionRegistry.register({
      name: 'LEAD_SCORE',
      category: 'custom',
      description: 'Calculates a lead quality score based on available data',
      syntax: 'LEAD_SCORE()',
      minArgs: 0,
      maxArgs: 0,
      returnType: 'number',
      examples: ['LEAD_SCORE()'],
      execute: (args, context) => {
        let score = 0;
        const lead = context.lead;

        // Email present
        if (lead.email && this.evaluateFunction('ISEMAIL', [{ type: 'literal', value: lead.email }], context)) {
          score += 20;
        }

        // Phone present
        if (lead.phone) score += 15;

        // Company present
        if (lead.company) score += 20;

        // Job title present
        if (lead.jobTitle) score += 15;

        // LinkedIn profile present
        if (lead.linkedinUrl) score += 15;

        // Has activity
        if (lead.emailsSent > 0 || lead.emailsOpened > 0) score += 10;

        // Recent activity
        if (lead.lastActivity) {
          const lastActivity = new Date(lead.lastActivity);
          const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceActivity < 30) score += 5;
        }

        return Math.min(100, score);
      }
    });
  }
}

// Export singleton instance
export const formulaEngine = new FormulaEngine();