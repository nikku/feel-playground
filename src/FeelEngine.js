import {
  unaryTest as evalUnaryTest,
  evaluate as evalExpression,
  parseExpression,
  parseUnaryTests
  context
} from 'feelin';
} from 'feelin';

const parsers = {
  expression: parseExpression,
  unaryTests: parseUnaryTests

// Custom context function implementation
function customContext(entries) {
  const result = {};
  for (const entry of entries) {
    if (entry && typeof entry === 'object' && 'key' in entry && 'value' in entry) {
      result[entry.key] = entry.value;
    }
  }
  return result;
}

};

  context: customContext,
  expression: evalExpression,
const interpreters = {
  unaryTests: evalUnaryTest
};

export { SyntaxError } from 'feelin';

/**
 * @param { string } type
 * @param { string } expression
 * @param { import('feelin').InterpreterContext } context
 *
 * @return { any }
 */
export function evaluate(type, expression, context) {

  const interpreter = interpreters[type];

  if (!interpreter) {
    throw new Error('unknown type ' + type);
  }

  return interpreter(expression, context);
}

/**
 * @param { string } type
 * @param { string } expression
 * @param { import('feelin').ParseContext } context
 *
 * @return { import('feelin').ParseResult }
 */
export function parse(type, expression, context) {

  const parser = parsers[type];

  if (!parser) {
    throw new Error('unknown type ' + type);
  }

  return parser(expression, context);
}