export interface CalcEvalResult {
  success: boolean;
  result?: number;
  displayResult?: string;
  isDivisionByZero: boolean;
  error?: string;
}

class CalculationError extends Error {
  constructor(message: string, readonly isDivisionByZero = false) {
    super(message);
  }
}

const constants: Record<string, number> = {
  e: Math.E,
  pi: Math.PI,
};

const functions: Record<string, (value: number) => number> = {
  abs: Math.abs,
  cos: Math.cos,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan,
};

export function evaluateExpression(expr: string): CalcEvalResult {
  const sanitized = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/\s+/g, '')
    .toLowerCase();

  if (!sanitized) {
    return { success: true, result: 0, displayResult: '0', isDivisionByZero: false };
  }

  const tokens: string[] = [];
  let index = 0;

  while (index < sanitized.length) {
    const remaining = sanitized.slice(index);
    const numberMatch = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/.exec(remaining);
    const identifierMatch = /^[a-z]+/.exec(remaining);

    if (numberMatch) {
      tokens.push(numberMatch[0]);
      index += numberMatch[0].length;
    } else if (identifierMatch) {
      tokens.push(identifierMatch[0]);
      index += identifierMatch[0].length;
    } else if ('+-*/%^()'.includes(sanitized[index])) {
      tokens.push(sanitized[index]);
      index++;
    } else {
      return {
        success: false,
        isDivisionByZero: false,
        error: `Invalid character: ${sanitized[index]}`,
      };
    }
  }

  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const expect = (token: string) => {
    if (take() !== token) {
      throw new CalculationError(`Expected "${token}"`);
    }
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  const parseTerm = (): number => {
    let value = parseUnary();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const operator = take();
      const right = parseUnary();
      if ((operator === '/' || operator === '%') && right === 0) {
        throw new CalculationError('Division by zero is undefined.', true);
      }
      if (operator === '*') value *= right;
      else if (operator === '/') value /= right;
      else value %= right;
    }
    return value;
  };

  const parseUnary = (): number => {
    if (peek() === '+' || peek() === '-') {
      const operator = take();
      const value = parseUnary();
      return operator === '-' ? -value : value;
    }
    return parsePower();
  };

  const parsePower = (): number => {
    const value = parsePrimary();
    if (peek() === '^') {
      take();
      return Math.pow(value, parseUnary());
    }
    return value;
  };

  const parsePrimary = (): number => {
    const token = take();
    if (token === undefined) {
      throw new CalculationError('Invalid expression syntax');
    }

    if (/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(token)) {
      return Number(token);
    }

    if (token === '(') {
      const value = parseExpression();
      expect(')');
      return value;
    }

    if (Object.prototype.hasOwnProperty.call(constants, token)) {
      return constants[token];
    }

    if (Object.prototype.hasOwnProperty.call(functions, token)) {
      expect('(');
      const argument = parseExpression();
      expect(')');
      return functions[token](argument);
    }

    throw new CalculationError(`Unexpected token: ${token}`);
  };

  try {
    const result = parseExpression();
    if (position !== tokens.length) {
      throw new CalculationError(`Unexpected token: ${peek()}`);
    }
    if (!Number.isFinite(result)) {
      throw new CalculationError('Result is outside the supported numeric range.');
    }

    const displayResult = Number.isInteger(result)
      ? result.toString()
      : Number(result.toFixed(8)).toString();

    return {
      success: true,
      result,
      displayResult,
      isDivisionByZero: false,
    };
  } catch (error) {
    if (error instanceof CalculationError) {
      return {
        success: false,
        isDivisionByZero: error.isDivisionByZero,
        error: error.message,
      };
    }
    throw error;
  }
}
