#!/usr/bin/env python3
# boot.py: the starter for plain.
#
# plain is written in plain (see plain.plain). but something has to run the
# very first plain program, so this file knows just enough plain to start it:
#
#   python3 boot.py plain.plain yourfile.plain
#
# once plain.plain is running, plain is running plain.
import math, os, re, sys, threading

class Oops(Exception): pass
class Stop(Exception): pass
class Quit(Exception): pass
class Back(Exception):
    def __init__(self, v): self.v = v

NUM = re.compile(r'-?\d+(\.\d+)?$')
FUNCS, NAMES = {}, set()
DEPTH = [0]

# values: number, text, list, table (dict), nothing (None)

def isnum(v): return isinstance(v, (int, float)) and not isinstance(v, bool)
def looksnum(v): return isnum(v) or (isinstance(v, str) and bool(NUM.match(v)))

def kind(v):
    if v is None: return 'nothing'
    if isnum(v): return 'number'
    if isinstance(v, str): return 'text'
    return 'list' if isinstance(v, list) else 'table'

def show(v):
    if v is None: return ''
    if isinstance(v, float): return str(int(v)) if v.is_integer() else repr(v)
    if isnum(v): return str(v)
    if isinstance(v, str): return v
    if isinstance(v, list): return '[' + ', '.join(show(x) for x in v) + ']'
    return '{' + ', '.join(k + ': ' + show(x) for k, x in v.items()) + '}'

def tonum(v):
    if isnum(v): return v
    if looksnum(v): return float(v) if '.' in v else int(v)
    raise Oops(f"'{show(v)}' isnt a number")

def whole(v): return int(math.floor(tonum(v)))
def same(a, b): return a == b if isnum(a) and isnum(b) else show(a) == show(b)
def empty(v): return v is None or (not isnum(v) and len(v) == 0)

def contains(a, b):
    if isinstance(a, list): return any(same(x, b) for x in a)
    if isinstance(a, dict): return show(b) in a
    if a is None: return False
    return show(b) in show(a)

def plus(a, b): return a + b if isnum(a) and isnum(b) else show(a) + show(b)

def math_op(op, a, b):
    a, b = tonum(a), tonum(b)
    if op == 'minus': return a - b
    if op == 'times': return a * b
    if b == 0: raise Oops("cant divide by zero")
    if op == 'modulo': return a % b
    r = a / b
    return int(r) if r.is_integer() else r

def need_list(v):
    if not isinstance(v, list): raise Oops(f"'{show(v)}' isnt a list")
    return v

def need_table(v):
    if not isinstance(v, dict): raise Oops(f"'{show(v)}' isnt a table")
    return v

def need_text(v):
    if isinstance(v, (list, dict)): raise Oops(f"'{show(v)}' isnt text")
    return show(v)

def item(n, L):
    L, n = need_list(L), whole(n)
    return L[n - 1] if 1 <= n <= len(L) else None

def letter(n, s):
    s, n = need_text(s), whole(n)
    return s[n - 1] if 1 <= n <= len(s) else None

def letters(a, b, s):
    s, a, b = need_text(s), whole(a), whole(b)
    return s[max(a, 1) - 1:max(b, 0)]

def length(v):
    if v is None: return 0
    return len(show(v)) if isnum(v) else len(v)

def slot(L, n):
    L, n = need_list(L), whole(n)
    if not 1 <= n <= len(L): raise Oops(f"item {n} doesnt exist")
    return L, n - 1

def read_file(p, lines):
    try:
        with open(show(p)) as f: s = f.read()
    except OSError:
        raise Oops(f"cant read file '{show(p)}'")
    return s.splitlines() if lines else s

class Env:
    def __init__(self, vars, glob, args): self.vars, self.glob, self.args = vars, glob, args
    def get(self, w):
        if NUM.match(w): return tonum(w)
        if w in self.vars: return self.vars[w]
        if w in self.glob: return self.glob[w]
        return w

def call(e, name, args):
    if name not in FUNCS: raise Oops(f"there is no '{name}'")
    params, body = FUNCS[name]
    if len(params) != len(args):
        raise Oops(f"'{name}' needs {len(params)} things but got {len(args)}")
    if DEPTH[0] > 20000:
        raise Oops(f"'{name}' keeps calling itself forever")
    DEPTH[0] += 1
    try:
        run(body, Env(dict(zip(params, args)), e.glob, e.args))
    except Back as b:
        return b.v
    except Stop:
        pass
    finally:
        DEPTH[0] -= 1
    return None

# reading words

def tokens(line):
    out, i, n = [], 0, len(line)
    while i < n:
        ch = line[i]
        if ch in ' \t':
            i += 1
        elif ch == '"':
            j = line.find('"', i + 1)
            if j < 0: raise Oops("a quote never closes")
            out.append(('text', line[i + 1:j])); i = j + 1
        else:
            j = i
            while j < n and line[j] not in ' \t"': j += 1
            out.append(('word', line[i:j])); i = j
    return out

def linetext(t): return ' '.join(v if k == 'word' else '"' + v + '"' for k, v in t)

class Cur:
    def __init__(self, t): self.t, self.i = t, 0
    def w(self, k=0):
        j = self.i + k
        return self.t[j][1] if j < len(self.t) and self.t[j][0] == 'word' else None
    def eat(self, *ws):
        if all(self.w(k) == x for k, x in enumerate(ws)):
            self.i += len(ws); return True
        return False
    def where(self):
        return 'at the end of the line' if self.done() else f"near '{self.t[self.i][1]}'"
    def need(self, w):
        if not self.eat(w): raise Oops(f"expected '{w}' {self.where()}")
    def done(self): return self.i >= len(self.t)
    def name(self):
        x = self.w()
        if x is None: raise Oops(f"expected a name {self.where()}")
        self.i += 1; return x
    def finish(self):
        if not self.done(): raise Oops(f"didnt understand {self.where()}")

# expressions turn into little python functions that take an Env

THE = {'length', 'kind', 'keys', 'arguments', 'result', 'item', 'letter', 'letters', 'entry'}
CONSTS = {'newline': '\n', 'quote': '"', 'space': ' ', 'tab': '\t', 'nothing': None}

def c_expr(c):
    f = c_atom(c)
    while True:
        if c.eat('plus'): op = 'plus'
        elif c.eat('minus'): op = 'minus'
        elif c.eat('times'): op = 'times'
        elif c.eat('divided', 'by'): op = 'divided'
        elif c.eat('modulo'): op = 'modulo'
        else: return f
        g = c_atom(c)
        if op == 'plus': f = (lambda f, g: lambda e: plus(f(e), g(e)))(f, g)
        else: f = (lambda f, g, op: lambda e: math_op(op, f(e), g(e)))(f, g, op)

def c_atom(c):
    f = c_atom0(c)
    while True:
        if c.eat('as', 'a', 'number'): f = (lambda f: lambda e: tonum(f(e)))(f)
        elif c.eat('as', 'text'): f = (lambda f: lambda e: show(f(e)))(f)
        elif c.eat('rounded', 'down'): f = (lambda f: lambda e: whole(f(e)))(f)
        else: return f

def c_args(c):
    args = []
    if c.eat('with'):
        args.append(c_expr(c))
        while c.eat('and'): args.append(c_expr(c))
    return args

def c_atom0(c):
    if c.done(): raise Oops("something is missing at the end of the line")
    k, v = c.t[c.i]
    if k == 'text':
        c.i += 1; return lambda e: v
    if c.w() == 'the' and c.w(1) in THE: c.i += 1
    if c.eat('length', 'of'): f = c_atom0(c); return lambda e: length(f(e))
    if c.eat('kind', 'of'): f = c_atom0(c); return lambda e: kind(f(e))
    if c.eat('keys', 'of'): f = c_atom0(c); return lambda e: list(need_table(f(e)))
    if c.eat('item'):
        n = c_expr(c); c.need('of'); L = c_atom0(c)
        return lambda e: (lambda n: item(n, L(e)))(n(e))
    if c.eat('letters'):
        a = c_expr(c); c.need('to'); b = c_expr(c); c.need('of'); s = c_atom0(c)
        return lambda e: (lambda a, b: letters(a, b, s(e)))(a(e), b(e))
    if c.eat('letter'):
        n = c_expr(c); c.need('of'); s = c_atom0(c)
        return lambda e: (lambda n: letter(n, s(e)))(n(e))
    if c.eat('entry'):
        kf = c_expr(c); c.need('of'); t = c_atom0(c)
        return lambda e: (lambda k: need_table(t(e)).get(show(k)))(kf(e))
    if c.eat('a', 'new', 'list'): return lambda e: []
    if c.eat('a', 'new', 'table'): return lambda e: {}
    if c.eat('lowercase'): f = c_atom0(c); return lambda e: show(f(e)).lower()
    if c.eat('uppercase'): f = c_atom0(c); return lambda e: show(f(e)).upper()
    if c.eat('arguments'): return lambda e: e.args
    if c.eat('result', 'of'):
        name = c.name(); args = c_args(c)
        return lambda e: call(e, name, [a(e) for a in args])
    w = c.name()
    if w in CONSTS: v = CONSTS[w]; return lambda e: v
    return lambda e: e.get(w)

# conditions. both sides of and/or always get worked out, like plain.plain does

def c_cond(c):
    f = c_and(c)
    while c.eat('or'):
        g = c_and(c); f = (lambda f, g: lambda e: (lambda a, b: a or b)(f(e), g(e)))(f, g)
    return f

def c_and(c):
    f = c_comp(c)
    while c.eat('and'):
        g = c_comp(c); f = (lambda f, g: lambda e: (lambda a, b: a and b)(f(e), g(e)))(f, g)
    return f

def c_comp(c):
    a, neg = c_expr(c), False
    if c.eat('is', 'not'): neg = True; test = c_is(c)
    elif c.eat('is'): test = c_is(c)
    elif c.eat('says') or c.eat('equals'): test = two(c, same)
    elif c.eat('contains'): test = two(c, contains)
    elif c.eat('does', 'not', 'contain'): neg = True; test = two(c, contains)
    elif c.eat('starts', 'with'): test = two(c, lambda x, y: show(x).startswith(show(y)))
    elif c.eat('ends', 'with'): test = two(c, lambda x, y: show(x).endswith(show(y)))
    elif c.eat('has'): test = two(c, contains)
    else: raise Oops(f"expected a comparison like 'is' {c.where()}")
    return lambda e: test(a(e), e) != neg

def two(c, fn):
    b = c_expr(c)
    return lambda x, e: fn(x, b(e))

def bigger(x, y): return tonum(x) > tonum(y)

def c_is(c):
    if c.eat('a', 'number'): return lambda x, e: looksnum(x)
    if c.eat('a', 'file'): return lambda x, e: os.path.isfile(show(x))
    if c.eat('empty'): return lambda x, e: empty(x)
    if c.eat('more', 'than') or c.eat('bigger', 'than') or c.eat('greater', 'than'):
        return two(c, bigger)
    if c.eat('less', 'than') or c.eat('smaller', 'than'):
        return two(c, lambda x, y: tonum(x) < tonum(y))
    if c.eat('at', 'least'): return two(c, lambda x, y: tonum(x) >= tonum(y))
    if c.eat('at', 'most'): return two(c, lambda x, y: tonum(x) <= tonum(y))
    return two(c, same)

def compile_with(t, fn):
    c = Cur(t); f = fn(c); c.finish(); return f

# statements

def simple(t):
    c = Cur(t)
    if c.eat('set'):
        if c.eat('item'):
            n = c_expr(c); c.need('of'); nm = c.name(); c.need('to'); v = c_expr(c); c.finish()
            def fn(e):
                i, val = n(e), v(e); L, j = slot(e.get(nm), i); L[j] = val
            return fn
        if c.eat('entry'):
            k = c_expr(c); c.need('of'); nm = c.name(); c.need('to'); v = c_expr(c); c.finish()
            def fn(e):
                key, val = k(e), v(e); need_table(e.get(nm))[show(key)] = val
            return fn
        nm = c.name(); c.need('to'); v = c_expr(c); c.finish()
        def fn(e): e.vars[nm] = v(e)
        return fn
    if c.eat('add'):
        v = c_expr(c); c.need('to')
        if c.eat('the', 'end', 'of'):
            nm = c.name(); c.finish()
            def fn(e): val = v(e); need_list(e.get(nm)).append(val)
            return fn
        nm = c.name(); c.finish()
        def fn(e): val = v(e); e.vars[nm] = tonum(e.get(nm)) + tonum(val)
        return fn
    if c.eat('subtract'):
        v = c_expr(c); c.need('from'); nm = c.name(); c.finish()
        def fn(e): val = v(e); e.vars[nm] = tonum(e.get(nm)) - tonum(val)
        return fn
    if c.eat('remove'):
        if c.eat('item'):
            n = c_expr(c); c.need('of'); nm = c.name(); c.finish()
            def fn(e): i = n(e); L, j = slot(e.get(nm), i); del L[j]
            return fn
        c.need('entry'); k = c_expr(c); c.need('of'); nm = c.name(); c.finish()
        def fn(e): key = k(e); need_table(e.get(nm)).pop(show(key), None)
        return fn
    if c.eat('say'):
        parts = []
        while not c.done(): parts.append(c_expr(c))
        def fn(e): print(' '.join(show(p(e)) for p in parts), flush=True)
        return fn
    if c.eat('ask'):
        p = c_expr(c); c.need('into'); nm = c.name(); c.finish()
        def fn(e):
            try: a = input(show(p(e)) + ' ')
            except EOFError: a = ''
            e.vars[nm] = tonum(a) if NUM.match(a) else a
        return fn
    if c.eat('read', 'the', 'lines', 'of') or c.eat('read', 'the', 'file'):
        lines = c.t[2][1] == 'lines'
        p = c_expr(c); c.need('into'); nm = c.name(); c.finish()
        def fn(e): e.vars[nm] = read_file(p(e), lines)
        return fn
    if c.eat('give', 'back'):
        v = (lambda e: None) if c.done() else c_expr(c); c.finish()
        def fn(e): raise Back(v(e))
        return fn
    if c.eat('stop', 'repeating'):
        c.finish()
        def fn(e): raise Stop()
        return fn
    if c.eat('quit'):
        c.finish()
        def fn(e): raise Quit()
        return fn
    if c.eat('do') or c.w() in NAMES:
        name = c.name(); args = c_args(c); c.finish()
        return lambda e: call(e, name, [a(e) for a in args])
    raise Oops(f"dont understand '{linetext(t)}'")

def first(t): return t[0][1] if t and t[0][0] == 'word' else None

def run(body, e):
    for n, fn in body:
        try:
            fn(e)
        except Oops as x:
            if not getattr(x, 'tagged', False):
                x = Oops(f"line {n}: {x}"); x.tagged = True
            raise x

def loop(body, e):
    try:
        run(body, e); return True
    except Stop:
        return False

def tagged(n, msg):
    x = Oops(f"line {n}: {msg}"); x.tagged = True; return x

def block(L, pos, stops):
    body = []
    while pos < len(L) and first(L[pos][1]) not in stops:
        node, pos = stmt(L, pos)
        body.append(node)
    return body, pos

def closer(L, pos, n, what):
    if pos >= len(L) or first(L[pos][1]) != 'end':
        raise tagged(n, f"this {what} never hits an 'end'")
    return pos + 1

def if_(L, pos, skip):
    n, t = L[pos]
    k = next((k for k in range(skip, len(t)) if t[k] == ('word', 'then')), len(t))
    ct, rest = t[skip:k], t[k + 1:]
    try:
        cond = compile_with(ct, c_cond)
        one = simple(rest) if rest else None
    except Oops as x:
        raise tagged(n, x)
    if one:
        return (lambda e: one(e) if cond(e) else None), pos + 1, False
    yes, pos = block(L, pos + 1, ('otherwise', 'else', 'end'))
    no = []
    if pos < len(L) and first(L[pos][1]) in ('otherwise', 'else'):
        m, t2 = L[pos]
        if len(t2) > 1 and t2[1] == ('word', 'if'):
            fn2, pos, isblock = if_(L, pos, 2)
            if not isblock: raise tagged(m, "'otherwise if' needs its stuff on the next lines")
            no = [(m, fn2)]
        else:
            if len(t2) > 1: raise tagged(m, "'otherwise' should be alone on its line")
            no, pos = block(L, pos + 1, ('end',))
    return (lambda e: run(yes, e) if cond(e) else run(no, e)), pos, True

def stmt(L, pos):
    n, t = L[pos]; w = first(t)
    if w == 'if':
        fn, pos, isblock = if_(L, pos, 1)
        return (n, fn), closer(L, pos, n, 'if') if isblock else pos
    try:
        if w in ('end', 'otherwise', 'else'):
            raise Oops(f"'{w}' without an 'if' or loop")
        if w == 'while':
            cond = compile_with(t[1:], c_cond)
            body, pos = block(L, pos + 1, ('end',))
            def fn(e):
                while cond(e):
                    if not loop(body, e): break
            return (n, fn), closer(L, pos, n, 'while')
        if w == 'repeat':
            if t[-1] != ('word', 'times'): raise Oops("repeat needs 'times' at the end")
            count = compile_with(t[1:-1], c_expr)
            body, pos = block(L, pos + 1, ('end',))
            def fn(e):
                for _ in range(whole(count(e))):
                    if not loop(body, e): break
            return (n, fn), closer(L, pos, n, 'repeat')
        if w == 'for':
            c = Cur(t[1:]); c.need('each'); nm = c.name(); c.need('in'); over = c_expr(c); c.finish()
            body, pos = block(L, pos + 1, ('end',))
            def fn(e):
                v = over(e)
                if isnum(v): raise Oops(f"cant go through a number")
                for x in list(v or []):
                    e.vars[nm] = x
                    if not loop(body, e): break
            return (n, fn), closer(L, pos, n, 'for each')
        if w == 'to':
            c = Cur(t[1:]); nm = c.name(); params = []
            if c.eat('with'):
                params.append(c.name())
                while c.eat('and'): params.append(c.name())
            c.finish()
            body, pos = block(L, pos + 1, ('end',))
            FUNCS[nm] = (params, body)
            return (n, lambda e: None), closer(L, pos, n, 'to')
        return (n, simple(t)), pos + 1
    except Oops as x:
        if getattr(x, 'tagged', False): raise
        raise tagged(n, x)

def program(src):
    L = []
    for n, raw in enumerate(src.splitlines(), 1):
        try: t = tokens(raw)
        except Oops as x: raise tagged(n, x)
        if t and not (t[0][0] == 'word' and t[0][1].startswith('#')):
            L.append((n, t))
    for n, t in L:
        if first(t) == 'to' and len(t) > 1 and t[1][0] == 'word': NAMES.add(t[1][1])
    body, _ = block(L, 0, ())
    return body

def main():
    if len(sys.argv) < 2:
        print('usage: python3 boot.py plain.plain yourfile.plain'); return
    path = sys.argv[1]
    G = {}
    try:
        body = program(read_file(path, False))
        run(body, Env(G, G, sys.argv[2:]))
    except (Stop, Back, Quit):
        pass
    except Oops as x:
        print(f"error: {x}", flush=True)

if __name__ == '__main__':
    sys.setrecursionlimit(1_000_000)
    threading.stack_size(512 * 1024 * 1024)
    t = threading.Thread(target=main); t.start(); t.join()
