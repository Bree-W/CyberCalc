export interface CalcEvalResult {
  success: boolean;
  result?: number;
  displayResult?: string;
  isDivisionByZero: boolean;
  error?: string;
}

export function evaluateExpression(expr: string): CalcEvalResult {
  const sanitized = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '');

  if (!sanitized) {
    return { success: true, result: 0, displayResult: '0', isDivisionByZero: false };
  }

  // Tokenize
  const tokens: string[] = [];
  let i = 0;
  while (i < sanitized.length) {
    const ch = sanitized[i];

    if ('+-*/()%'.includes(ch)) {
      // Check for unary minus: at start or right after '(' or an operator
      if (ch === '-' && (i === 0 || '+-*/('.includes(sanitized[i - 1]))) {
        let numStr = '-';
        i++;
        while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
          numStr += sanitized[i];
          i++;
        }
        if (numStr === '-') {
          return { success: false, isDivisionByZero: false, error: 'Malformed expression' };
        }
        tokens.push(numStr);
        continue;
      }
      tokens.push(ch);
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
        numStr += sanitized[i];
        i++;
      }
      tokens.push(numStr);
    } else {
      return { success: false, isDivisionByZero: false, error: `Invalid character: ${ch}` };
    }
  }

  // Parse using Shunting-Yard to Reverse Polish Notation (RPN)
  const outputQueue: string[] = [];
  const opStack: string[] = [];

  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '%': 2,
  };

  for (const token of tokens) {
    if (!isNaN(Number(token))) {
      outputQueue.push(token);
    } else if (token in precedence) {
      while (
        opStack.length > 0 &&
        opStack[opStack.length - 1] in precedence &&
        precedence[opStack[opStack.length - 1]] >= precedence[token]
      ) {
        outputQueue.push(opStack.pop()!);
      }
      opStack.push(token);
    } else if (token === '(') {
      opStack.push(token);
    } else if (token === ')') {
      while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
        outputQueue.push(opStack.pop()!);
      }
      if (opStack.length === 0) {
        return { success: false, isDivisionByZero: false, error: 'Mismatched parentheses' };
      }
      opStack.pop(); // discard '('
    }
  }

  while (opStack.length > 0) {
    const op = opStack.pop()!;
    if (op === '(' || op === ')') {
      return { success: false, isDivisionByZero: false, error: 'Mismatched parentheses' };
    }
    outputQueue.push(op);
  }

  // Evaluate RPN
  const evalStack: number[] = [];
  for (const token of outputQueue) {
    if (!isNaN(Number(token))) {
      evalStack.push(Number(token));
    } else {
      const b = evalStack.pop();
      const a = evalStack.pop();
      if (a === undefined || b === undefined) {
        return { success: false, isDivisionByZero: false, error: 'Invalid expression syntax' };
      }

      if (token === '+') evalStack.push(a + b);
      else if (token === '-') evalStack.push(a - b);
      else if (token === '*') evalStack.push(a * b);
      else if (token === '/') {
        if (Math.abs(b) < 1e-12) {
          return {
            success: false,
            isDivisionByZero: true,
            error: 'FATAL ERROR: REALITY DIVISION FAILURE (Division by 0 detected)',
          };
        }
        evalStack.push(a / b);
      } else if (token === '%') {
        if (Math.abs(b) < 1e-12) {
          return {
            success: false,
            isDivisionByZero: true,
            error: 'FATAL ERROR: REALITY DIVISION FAILURE (Modulo by 0 detected)',
          };
        }
        evalStack.push(a % b);
      }
    }
  }

  if (evalStack.length !== 1) {
    return { success: false, isDivisionByZero: false, error: 'Calculation could not be evaluated' };
  }

  const result = evalStack[0];
  const displayResult = Number.isInteger(result)
    ? result.toString()
    : Number(result.toFixed(8)).toString();

  return {
    success: true,
    result,
    displayResult,
    isDivisionByZero: false,
  };
}
