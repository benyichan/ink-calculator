'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const HTML = path.resolve(__dirname, '..', 'www', 'index.html');
const html = fs.readFileSync(HTML, 'utf8');
const START = '/* ==== CALC CORE START ==== */';
const END = '/* ==== CALC CORE END ==== */';
const a = html.indexOf(START);
const b = html.indexOf(END);
assert.ok(a >= 0 && b > a, '计算核心标记缺失，无法抽取真实源码');
const coreSource = html.slice(a + START.length, b);

const sandbox = {
  console, Math, Number, JSON, Error, String, Array, Object, Boolean, RegExp, Date,
  parseFloat, parseInt, isNaN, isFinite,
  state: { deg: true, unit: 0 }
};
vm.createContext(sandbox);
vm.runInContext(coreSource + '\n;globalThis.__core = {' +
  'calculate, evaluate, tokenize, formatResult, formatDisplay, formatWithUnit,' +
  'NUMERIC, UNITS, toSci, tooVerbose, scaleNum};', sandbox);
const core = sandbox.__core;

function setEnv(deg, unit) {
  sandbox.state.deg = deg !== false;
  sandbox.state.unit = unit || 0;
}
function calc(expr, deg, unit) {
  setEnv(deg, unit);
  return core.calculate(expr);
}
function val(expr, deg) {
  const r = calc(expr, deg, 0);
  assert.equal(r.ok, true, `${expr} 应成功，实际 ${JSON.stringify(r)}`);
  return r.value;
}
function close(actual, expected, tol, label) {
  const t = tol == null ? 1e-9 : tol;
  assert.ok(Math.abs(actual - expected) <= t,
    `${label || ''} 期望 ${expected}，实际 ${actual}，容差 ${t}`);
}
globalThis.__goldCount = 0;
function gold(expr, expected, deg, tol) {
  globalThis.__goldCount++;
  if (expected === null) return;
  close(val(expr, deg), expected, tol, expr);
}
function err(expr, code, deg) {
  const r = calc(expr, deg, 0);
  assert.equal(r.ok, false, `${expr} 应失败`);
  assert.equal(r.code, code, `${expr} 错误码应为 ${code}，实际 ${r.code}: ${r.message}`);
  assert.ok(r.message && !/at\s+\w+\s*\(/.test(r.message), '错误信息不得含堆栈');
  return r;
}

/* ---------------- 黄金用例：优先级 / 结合性 / 一元负号 ---------------- */
test('黄金用例：优先级、括号、结合性、一元负号与幂', () => {
  const cases = [
    ['2+3*4', 14], ['(2+3)*4', 20], ['2*3+4', 10], ['2+3-4', 1],
    ['10-2-3', 5], ['100/5/2', 10], ['100/(5/2)', 40], ['8/2*3', 12],
    ['2^3', 8], ['2^3^2', 512], ['(2^3)^2', 64], ['-2^2', -4],
    ['(-2)^2', 4],     ['2^-3', 0.125], ['-2^3', -8], ['+2^2', 4],
    ['--2^2', 4], ['-(-2)^2', -4], ['2^-2^2', 0.0625],
    ['0^0', 1], ['1^0', 1], ['0^2', 0], ['2^0.5', Math.SQRT2],
    ['1+2*3^2', 19], ['(1+2)*3^2', 27], ['2(3+4)', 14],
    ['(1+2)(3+4)', 21], ['3(4)', 12], ['2pi', 2 * Math.PI],
    ['3!2', 12], ['5!', 120], ['0!', 1], ['(2+3)!', 120],
    ['6/2(1+2)', 9]
  ];
  for (const [expr, expected] of cases) {
    gold(expr, expected);
  }
});

/* ---------------- 黄金用例：小数 / 百分号 / 函数 ---------------- */
test('黄金用例：小数、百分号、函数与模式切换', () => {
  const cases = [
    ['0.1+0.2', 0.30000000000000004], ['1.005', 1.005],
    ['1.005*100', 100.49999999999999], ['0.1*3', 0.30000000000000004],
    ['1/3*3', 1], ['1234567.89', 1234567.89], ['.5+0.5', 1],
    ['50+10%', 55], ['50-10%', 45], ['100+12.5%', 112.5],
    ['100-12.5%', 87.5], ['50*10%', 5], ['200*10%+50', 70],
    ['100+10%+5', 115], ['100+-10%', 90], ['-100+10%', -110],
    ['(100+20%)+10%', 132], ['100-(20+10)%', 99.7],
    ['sin(90)', 1], ['cos(0)', 1], ['sin(0)', 0], ['cos(180)', -1],
    ['tan(45)', 1], ['asin(1)', 90], ['acos(1)', 0], ['atan(1)', 45],
    ['sqrt(9)', 3], ['cbrt(27)', 3], ['abs(-3.5)', 3.5],
    ['floor(1.9)', 1], ['ceil(1.1)', 2], ['round(1.5)', 2],
    ['log(1000)', 3], ['ln(1)', 0], ['exp(0)', 1],
    ['sinh(0)', 0], ['cosh(0)', 1], ['tanh(0)', 0]
  ];
  for (const [expr, expected] of cases) gold(expr, expected);

  const rad = [
    ['sin(pi/2)', 1], ['cos(pi)', -1], ['tan(pi/4)', 1],
    ['asin(1)', Math.PI / 2], ['acos(0)', Math.PI / 2], ['atan(1)', Math.PI / 4],
    ['ln(e)', 1], ['log(1000)', 3], ['sqrt(16)', 4]
  ];
  for (const [expr, expected] of rad) gold(expr, expected, false);
});

/* ---------------- 黄金用例：四则/幂 25×5 组合（125 条） ---------------- */
test('黄金用例：25 组操作数 × 5 种运算', () => {
  const A = [1, 2, 3, 4, 5];
  const B = [6, 7, 8, 9, 10];
  for (const x of A) {
    for (const y of B) {
      gold(`${x}+${y}`, x + y);
      gold(`${x}-${y}`, x - y);
      gold(`${x}*${y}`, x * y);
      gold(`${x}/${y}`, x / y);
      gold(`${x}^${y}`, Math.pow(x, y));
    }
  }
});

/* ---------------- 错误码：全部 P0 拦截项 ---------------- */
test('错误拦截：空表达式、括号、小数点、除零、定义域、超限', () => {
  err('', 'E_EMPTY');
  err('   ', 'E_EMPTY');
  err('1+', 'E_SYNTAX');
  err('1-', 'E_SYNTAX');
  err('*2', 'E_SYNTAX');
  err('/2', 'E_SYNTAX');
  err('^2', 'E_SYNTAX');
  err('1/', 'E_SYNTAX');
  err('2^^3', 'E_SYNTAX');
  err('()', 'E_EMPTY_PAREN');
  err('(1+2', 'E_MISSING_PAREN');
  err('sin(0', 'E_MISSING_PAREN');
  err('1+2)', 'E_EXTRA_PAREN');
  err('((1+2)', 'E_MISSING_PAREN');
  err('.', 'E_NUM');
  err('1..2', 'E_NUM');
  err('1.2.3', 'E_NUM');
  err('1@2', 'E_BAD_CHAR');
  err('foo(1)', 'E_UNKNOWN_FUNC');
  err('1/0', 'E_DIV_ZERO');
  err('1/(2-2)', 'E_DIV_ZERO');
  err('0/0', 'E_DIV_ZERO');
  err('sqrt(-1)', 'E_DOMAIN');
  err('log(0)', 'E_DOMAIN');
  err('log(-2)', 'E_DOMAIN');
  err('ln(0)', 'E_DOMAIN');
  err('ln(-1)', 'E_DOMAIN');
  err('asin(2)', 'E_DOMAIN');
  err('acos(-2)', 'E_DOMAIN');
  err('3.5!', 'E_FACTORIAL');
  err('(-1)!', 'E_FACTORIAL');
  err('171!', 'E_TOO_LARGE');
  err('exp(1000)', 'E_TOO_LARGE');
  err('tan(90)', 'E_UNDEFINED');
  err('tan(pi/2)', 'E_UNDEFINED', false);
  err('1+'.repeat(300) + '1', 'E_TOO_COMPLEX');
  err('('.repeat(150) + '1' + ')'.repeat(150), 'E_TOO_COMPLEX');
});

/* ---------------- 展示层归一：0.1+0.2、舍入、科学计数 ---------------- */
test('展示归一：0.1+0.2、1.005、连续累加、千分位与单位', () => {
  const shown = (expr, deg) => core.formatResult(val(expr, deg));
  assert.equal(shown('0.1+0.2'), '0.3');
  assert.equal(shown('0.1+0.2+0.3'), '0.6');
  assert.equal(shown('1.005'), '1.005');
  assert.equal(shown('1.005*100'), '100.5');
  let acc = 0;
  for (let i = 0; i < 10; i++) acc += 0.1;
  assert.equal(core.formatResult(acc), '1');
  assert.equal(shown('1/3'), '0.333333333333');
  assert.equal(core.formatResult(-0), '0');
  assert.equal(core.formatResult(NaN), '无效');
  assert.equal(core.formatResult(Infinity), '无效');
  assert.equal(core.formatResult(-Infinity), '无效');
  assert.equal(core.formatDisplay(1234567.89), '1,234,567.89');
  assert.match(core.formatResult(1e15), /e/);
  assert.match(core.formatResult(1e-10), /e/);

  setEnv(true, 2);
  assert.equal(core.formatWithUnit(1234567.89), '123.46万');
  setEnv(true, 5);
  assert.equal(core.formatWithUnit(1234567.89), '0.01亿');
  assert.equal(core.formatWithUnit(1000), '1,000'); /* 0.00001亿 → 回退原值 */
  core.formatWithUnit(0);
  setEnv(true, 0);
});

/* ---------------- 深度嵌套不溢出（有限深度） ---------------- */
test('有限括号嵌套仍可计算', () => {
  const expr = '('.repeat(8) + '1+2' + ')'.repeat(8);
  assert.equal(val(expr), 3);
});

/* ---------------- 属性测试：1000 条随机合法表达式 ---------------- */
test('属性测试：1000 条随机合法表达式满足代数恒等式', () => {
  let seed = 20261120;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 1000; i++) {
    const aRaw = (rnd() * 2000 - 1000) / 4;
    const a = Math.round(aRaw * 100) / 100;
    const b = (rnd() < 0.5 ? -1 : 1) * (0.1 + rnd() * 50);
    check(`(${a}+${b})-${b}`, a);
    check(`(${a}-${b})+${b}`, a);
    check(`${a}*${b}/${b}`, a);
    check(`-(-${a})`, a);
    check(`${a}+0`, a);
    check(`(${a}+${b})*1`, a + b);
  }
  function check(expr, expected) {
    const r = calc(expr);
    assert.equal(r.ok, true, `${expr} 属性测试失败：${JSON.stringify(r)}`);
    close(r.value, expected, 1e-7, expr);
  }
});

/* ---------------- 模糊测试：非法输入不崩溃、不挂起 ---------------- */
test('模糊测试：500 条随机输入均返回合法 Result', () => {
  const alphabet = '0123456789+-*/^().%!abcxyzπe ';
  let seed = 77123;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const codes = new Set([
    'E_EMPTY','E_SYNTAX','E_NUM','E_BAD_CHAR','E_UNKNOWN_FUNC','E_PAREN',
    'E_EMPTY_PAREN','E_EXTRA_PAREN','E_MISSING_PAREN','E_DIV_ZERO','E_DOMAIN',
    'E_UNDEFINED','E_FACTORIAL','E_TOO_LARGE','E_TOO_SMALL','E_OVERFLOW',
    'E_TOO_COMPLEX'
  ]);
  for (let i = 0; i < 500; i++) {
    const len = 1 + Math.floor(rnd() * 40);
    let s = '';
    for (let j = 0; j < len; j++) s += alphabet[Math.floor(rnd() * alphabet.length)];
    const r = calc(s);
    assert.equal(typeof r.ok, 'boolean');
    if (r.ok) {
      assert.equal(typeof r.value, 'number');
      assert.ok(isFinite(r.value));
    } else {
      assert.ok(codes.has(r.code), `未知错误码 ${r.code} @ ${s}`);
      assert.ok(r.message && !/at\s+\w+\s*\(/.test(r.message));
    }
  }
});

/* ---------------- 回归：每个修复项一条具名断言 ---------------- */
test('回归：一元负号优先于幂（-2^2 = -4）', () => {
  assert.equal(val('-2^2'), -4);
  assert.equal(val('(-2)^2'), 4);
});
test('回归：除零返回友好错误码而非 Infinity', () => {
  assert.equal(calc('1/0').code, 'E_DIV_ZERO');
  assert.equal(core.formatResult(Infinity), '无效');
});
test('回归：负数开方 / 对数非正数 / 反三角越界被拦截', () => {
  assert.equal(calc('sqrt(-1)').code, 'E_DOMAIN');
  assert.equal(calc('log(0)').code, 'E_DOMAIN');
  assert.equal(calc('asin(2)').code, 'E_DOMAIN');
});
test('回归：空括号与多余右括号可定位', () => {
  const empty = err('()', 'E_EMPTY_PAREN');
  const extra = err('1+2)', 'E_EXTRA_PAREN');
  assert.equal(typeof empty.pos, 'number');
  assert.equal(typeof extra.pos, 'number');
});
test('回归：单独的点和连续小数点被拒绝', () => {
  assert.equal(calc('.').code, 'E_NUM');
  assert.equal(calc('1..2').code, 'E_NUM');
});
test('回归：超长表达式受限，不触发递归溢出', () => {
  assert.equal(calc('1+'.repeat(400)).code, 'E_TOO_COMPLEX');
});
test('回归：百分号上下文语义不被括号污染', () => {
  close(val('(100+20%)+10%'), 132);
  close(val('50*10%'), 5);
});
test('回归：tan 在 90° / π/2 附近判为无定义', () => {
  assert.equal(calc('tan(90)').code, 'E_UNDEFINED');
  assert.equal(calc('tan(pi/2)', false).code, 'E_UNDEFINED');
});

test('覆盖率口径：黄金用例数量 >= 200', () => {
  assert.ok(globalThis.__goldCount >= 200,
    `当前黄金用例 ${globalThis.__goldCount} 条，未达 200 条门槛`);
});
