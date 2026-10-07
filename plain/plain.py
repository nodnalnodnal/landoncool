#!/usr/bin/env python3
# plain: a tiny language you write in regular words
import re, sys

class PlainError(Exception):
    pass

def num(s):
    try:
        return int(s)
    except ValueError:
        try:
            return float(s)
        except ValueError:
            return None

def show(v):
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v)

def value(text, env):
    text = text.strip()
    if len(text) >= 2 and text[0] == text[-1] == '"':
        return text[1:-1]
    n = num(text)
    if n is not None:
        return n
    return env.get(text, text)  # unknown words are just words

OPS = {
    'plus': lambda a, b: a + b,
    'minus': lambda a, b: a - b,
    'times': lambda a, b: a * b,
    'divided by': lambda a, b: a / b,
}
OP_RE = re.compile(r'\s+(plus|minus|times|divided by)\s+', re.I)

def expr(text, env):
    parts = OP_RE.split(text.strip())
    result = value(parts[0], env)
    for i in range(1, len(parts), 2):
        op, right = parts[i].lower(), value(parts[i + 1], env)
        if isinstance(result, str) or isinstance(right, str):
            if op == 'plus':
                result = show(result) + show(right)
                continue
            raise PlainError(f"cant do {op} with words")
        result = OPS[op](result, right)
    return result

CONDS = [
    (r'(.+?) is not (.+)', lambda a, b: show(a) != show(b)),
    (r'(.+?) is (?:more|bigger|greater) than (.+)', lambda a, b: float(a) > float(b)),
    (r'(.+?) is (?:less|smaller) than (.+)', lambda a, b: float(a) < float(b)),
    (r'(.+?) contains (.+)', lambda a, b: show(b) in show(a)),
    (r'(.+?) (?:is|says|equals) (.+)', lambda a, b: show(a) == show(b)),
]

def check_one(text, env):
    for pat, fn in CONDS:
        m = re.fullmatch(pat, text.strip(), re.I)
        if m:
            try:
                return fn(expr(m[1], env), expr(m[2], env))
            except (ValueError, TypeError):
                raise PlainError(f"cant compare '{text}'")
    raise PlainError(f"dont understand the condition '{text}'")

def check(text, env):
    return any(
        all(check_one(p, env) for p in re.split(r'\s+and\s+', part, flags=re.I))
        for part in re.split(r'\s+or\s+', text, flags=re.I)
    )

def head(line):
    return line.split()[0].lower()

def parse(lines, pos, stops):
    body = []
    while pos < len(lines):
        n, line = lines[pos]
        h = head(line)
        if h in stops:
            return body, pos
        if h == 'if':
            m = re.fullmatch(r'if (.+?)(?: then(?: (.+))?)?', line, re.I)
            if m[2]:  # one-liner: if x is 5 then say yes
                body.append(('if', n, m[1], [('line', n, m[2])], []))
                pos += 1
                continue
            yes, pos = parse(lines, pos + 1, ('otherwise', 'else', 'end'))
            no = []
            if pos < len(lines) and head(lines[pos][1]) in ('otherwise', 'else'):
                no, pos = parse(lines, pos + 1, ('end',))
            if pos >= len(lines):
                raise PlainError(f"line {n}: this if never hits an 'end'")
            body.append(('if', n, m[1], yes, no))
            pos += 1
        elif h in ('repeat', 'while'):
            pat = r'repeat (.+?) times?' if h == 'repeat' else r'while (.+)'
            m = re.fullmatch(pat, line, re.I)
            if not m:
                raise PlainError(f"line {n}: dont understand '{line}'")
            block, pos = parse(lines, pos + 1, ('end',))
            if pos >= len(lines):
                raise PlainError(f"line {n}: this {h} never hits an 'end'")
            body.append((h, n, m[1], block))
            pos += 1
        else:
            body.append(('line', n, line))
            pos += 1
    return body, pos

def do(line, env):
    m = re.fullmatch(r'set (\w+) to (.+)', line, re.I)
    if m:
        env[m[1]] = expr(m[2], env)
        return
    m = re.fullmatch(r'say(?: (.*))?', line, re.I)
    if m:
        words = re.findall(r'"[^"]*"|\S+', m[1] or '')
        print(' '.join(
            w[1:-1] if len(w) >= 2 and w[0] == w[-1] == '"' else show(env.get(w, w))
            for w in words))
        return
    m = re.fullmatch(r'(add|subtract) (.+) (?:to|from) (\w+)', line, re.I)
    if m:
        if m[3] not in env:
            raise PlainError(f"'{m[3]}' doesnt exist yet, set it first")
        op = 'plus' if m[1].lower() == 'add' else 'minus'
        env[m[3]] = expr(f'{m[3]} {op} {m[2]}', env)
        return
    m = re.fullmatch(r'ask (.+?) (?:into|as) (\w+)', line, re.I)
    if m:
        ans = input(show(value(m[1], env)) + ' ')
        n = num(ans)
        env[m[2]] = ans if n is None else n
        return
    raise PlainError(f"dont understand '{line}'")

def run(body, env):
    for st in body:
        kind, n = st[0], st[1]
        try:
            if kind == 'if':
                run(st[3] if check(st[2], env) else st[4], env)
            elif kind == 'repeat':
                count = expr(st[2], env)
                if isinstance(count, str):
                    raise PlainError(f"'{st[2]}' isnt a number")
                for _ in range(int(count)):
                    run(st[3], env)
            elif kind == 'while':
                while check(st[2], env):
                    run(st[3], env)
            else:
                do(st[2], env)
        except PlainError as e:
            if str(e).startswith('line '):
                raise
            raise PlainError(f"line {n}: {e}")

def main():
    if len(sys.argv) != 2:
        sys.exit('usage: python3 plain.py file.plain')
    lines = []
    for i, raw in enumerate(open(sys.argv[1]).read().splitlines(), 1):
        s = raw.strip()
        if s and not s.startswith('#'):
            lines.append((i, s))
    try:
        body, _ = parse(lines, 0, ())
        run(body, {})
    except PlainError as e:
        sys.exit(f'error: {e}')

if __name__ == '__main__':
    main()
