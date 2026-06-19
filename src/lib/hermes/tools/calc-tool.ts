/**
 * Hermes Calc Tool — avaliador aritmético seguro (sem `eval`).
 * Suporta + - * / ( ) e decimais. Rejeita qualquer outro token.
 */

export type CalcResult =
  | { ok: true; value: number; expression: string }
  | { ok: false; reason: string };

type Token =
  | { t: "num"; v: number }
  | { t: "op"; v: "+" | "-" | "*" | "/" }
  | { t: "lp" }
  | { t: "rp" };

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.replace(/,/g, ".").trim();
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (c === "(") { tokens.push({ t: "lp" }); i++; continue; }
    if (c === ")") { tokens.push({ t: "rp" }); i++; continue; }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      tokens.push({ t: "op", v: c }); i++; continue;
    }
    if (c >= "0" && c <= "9") {
      let j = i;
      let dot = false;
      while (j < s.length && ((s[j] >= "0" && s[j] <= "9") || (!dot && s[j] === "."))) {
        if (s[j] === ".") dot = true;
        j++;
      }
      tokens.push({ t: "num", v: Number(s.slice(i, j)) });
      i = j; continue;
    }
    return null;
  }
  return tokens;
}

// Shunting-yard → avaliação em RPN.
function evaluate(tokens: Token[]): number | null {
  const out: Token[] = [];
  const ops: Token[] = [];
  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.t === "num") out.push(tk);
    else if (tk.t === "op") {
      // unário: -x ou +x no começo ou após (/op
      const prev = tokens[i - 1];
      const isUnary = !prev || prev.t === "op" || prev.t === "lp";
      if (isUnary && (tk.v === "+" || tk.v === "-")) {
        out.push({ t: "num", v: 0 });
      }
      while (
        ops.length &&
        ops[ops.length - 1].t === "op" &&
        prec[(ops[ops.length - 1] as { v: string }).v] >= prec[tk.v]
      ) out.push(ops.pop()!);
      ops.push(tk);
    } else if (tk.t === "lp") ops.push(tk);
    else if (tk.t === "rp") {
      while (ops.length && ops[ops.length - 1].t !== "lp") out.push(ops.pop()!);
      if (!ops.length) return null;
      ops.pop();
    }
  }
  while (ops.length) {
    const top = ops.pop()!;
    if (top.t === "lp") return null;
    out.push(top);
  }
  const stack: number[] = [];
  for (const tk of out) {
    if (tk.t === "num") stack.push(tk.v);
    else if (tk.t === "op") {
      const b = stack.pop(); const a = stack.pop();
      if (a === undefined || b === undefined) return null;
      let r = 0;
      if (tk.v === "+") r = a + b;
      else if (tk.v === "-") r = a - b;
      else if (tk.v === "*") r = a * b;
      else if (tk.v === "/") { if (b === 0) return null; r = a / b; }
      stack.push(r);
    }
  }
  return stack.length === 1 ? stack[0] : null;
}

export function calc(expression: string): CalcResult {
  const cleaned = expression.replace(/x/gi, "*").replace(/÷/g, "/");
  const tokens = tokenize(cleaned);
  if (!tokens || !tokens.length) return { ok: false, reason: "invalid expression" };
  const v = evaluate(tokens);
  if (v == null || !Number.isFinite(v)) return { ok: false, reason: "evaluation failed" };
  return { ok: true, value: v, expression: cleaned };
}
