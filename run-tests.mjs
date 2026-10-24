import test from 'node:test';
import assert from 'node:assert/strict';

// Test 1: Expression evaluation and Division by Zero Easter Egg detection
test('Standard Calculator - Evaluation and Division by Zero Easter Egg', () => {
  function evaluateExpression(expr) {
    const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
    if (!sanitized) return { success: true, result: 0, isDivisionByZero: false };

    const tokens = [];
    let i = 0;
    while (i < sanitized.length) {
      const ch = sanitized[i];
      if ('+-*/()%'.includes(ch)) {
        if (ch === '-' && (i === 0 || '+-*/('.includes(sanitized[i - 1]))) {
          let numStr = '-';
          i++;
          while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
            numStr += sanitized[i];
            i++;
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
      }
    }

    const outputQueue = [];
    const opStack = [];
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };

    for (const token of tokens) {
      if (!isNaN(Number(token))) {
        outputQueue.push(token);
      } else if (token in precedence) {
        while (opStack.length > 0 && opStack[opStack.length - 1] in precedence && precedence[opStack[opStack.length - 1]] >= precedence[token]) {
          outputQueue.push(opStack.pop());
        }
        opStack.push(token);
      } else if (token === '(') {
        opStack.push(token);
      } else if (token === ')') {
        while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
          outputQueue.push(opStack.pop());
        }
        opStack.pop();
      }
    }
    while (opStack.length > 0) outputQueue.push(opStack.pop());

    const evalStack = [];
    for (const token of outputQueue) {
      if (!isNaN(Number(token))) {
        evalStack.push(Number(token));
      } else {
        const b = evalStack.pop();
        const a = evalStack.pop();
        if (token === '+') evalStack.push(a + b);
        else if (token === '-') evalStack.push(a - b);
        else if (token === '*') evalStack.push(a * b);
        else if (token === '/') {
          if (Math.abs(b) < 1e-12) return { success: false, isDivisionByZero: true };
          evalStack.push(a / b);
        }
      }
    }
    return { success: true, result: evalStack[0], isDivisionByZero: false };
  }

  assert.equal(evaluateExpression('2 + 3 * 4').result, 14);
  assert.equal(evaluateExpression('(10 - 2) / 2').result, 4);
  assert.equal(evaluateExpression('42 / 0').isDivisionByZero, true);
  assert.equal(evaluateExpression('100 / (5 - 5)').isDivisionByZero, true);
});

// Test 2: Repeating-Key XOR (Specification Example: 41424344 ^ 20 -> 61 62 63 64 / "abcd")
test('Bitwise Operations - Repeating-Key XOR Spec Example', () => {
  const data = [0x41, 0x42, 0x43, 0x44];
  const key = [0x20];
  const result = data.map((b, i) => b ^ key[i % key.length]);
  const resultHex = result.map(b => b.toString(16).padStart(2, '0')).join(' ');
  const resultText = String.fromCharCode(...result);

  assert.equal(resultHex, '61 62 63 64');
  assert.equal(resultText, 'abcd');
});

// Test 3: Endianness (Specification Example: 01 02 03 04 -> 16,909,060 vs 67,305,985)
test('Reverse Engineering - Endianness Spec Example', () => {
  const bytes = [0x01, 0x02, 0x03, 0x04];
  const beUint = ((bytes[0] << 24) >>> 0) + ((bytes[1] << 16) | (bytes[2] << 8) | bytes[3]);
  const leUint = ((bytes[3] << 24) >>> 0) + ((bytes[2] << 16) | (bytes[1] << 8) | bytes[0]);

  assert.equal(beUint, 16909060);
  assert.equal(leUint, 67305985);
});

// Test 4: Networking - CIDR Subnet calculations
test('Networking - IPv4 CIDR Subnet calculations', () => {
  const ip = (192 << 24) | (168 << 16) | (1 << 8) | 100;
  const prefix = 24;
  const mask = (~0 << (32 - prefix)) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const usableHosts = Math.pow(2, 32 - prefix) - 2;

  function toIp(num) {
    return `${(num >>> 24) & 255}.${(num >>> 16) & 255}.${(num >>> 8) & 255}.${num & 255}`;
  }

  assert.equal(toIp(network), '192.168.1.0');
  assert.equal(toIp(broadcast), '192.168.1.255');
  assert.equal(toIp(network + 1), '192.168.1.1');
  assert.equal(toIp(broadcast - 1), '192.168.1.254');
  assert.equal(usableHosts, 254);
});

// Test 5: Two's complement integer math and bit widths
test('Conversion Lab - Two\'s Complement Integers', () => {
  function getSigned(val, width) {
    const mask = (1n << BigInt(width)) - 1n;
    const bounded = val & mask;
    const signBit = 1n << BigInt(width - 1);
    return (bounded & signBit) !== 0n ? bounded - (1n << BigInt(width)) : bounded;
  }

  assert.equal(getSigned(255n, 8), -1n);
  assert.equal(getSigned(127n, 8), 127n);
  assert.equal(getSigned(128n, 8), -128n);
  assert.equal(getSigned(65535n, 16), -1n);
  assert.equal(getSigned(4294967295n, 32), -1n);
});
