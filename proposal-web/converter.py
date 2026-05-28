"""
HTML → LaTeX converter for proposal section content.
Handles the HTML subset produced by Quill 2.x.
"""

import re
from bs4 import BeautifulSoup, NavigableString, Tag

_SPECIAL = str.maketrans({
    '\\': r'\textbackslash{}',
    '{': r'\{',
    '}': r'\}',
    '$': r'\$',
    '&': r'\&',
    '#': r'\#',
    '%': r'\%',
    '_': r'\_',
    '^': r'\textasciicircum{}',
    '~': r'\textasciitilde{}',
})

_EMPTY = re.compile(r'^(\s*<p[^>]*>\s*(<br\s*/?>\s*)?\s*</p>\s*)*$', re.I)


def _esc(text: str) -> str:
    return text.translate(_SPECIAL)


def _node(n) -> str:
    if isinstance(n, NavigableString):
        return _esc(str(n))
    if not isinstance(n, Tag):
        return ''

    tag = n.name
    inner = ''.join(_node(c) for c in n.children)

    if tag == 'p':
        s = inner.strip()
        return s + '\n\n' if s else ''
    if tag in ('strong', 'b'):
        return r'\textbf{' + inner + '}'
    if tag in ('em', 'i'):
        return r'\textit{' + inner + '}'
    if tag == 'u':
        return r'\underline{' + inner + '}'
    if tag == 'h2':
        return r'\subsection{' + inner.strip() + '}\n\n'
    if tag == 'h3':
        return r'\subsubsection{' + inner.strip() + '}\n\n'
    if tag == 'ul':
        items = '\n'.join(
            r'  \item ' + ''.join(_node(c) for c in li.children).strip()
            for li in n.find_all('li', recursive=False)
        )
        return r'\begin{itemize}' + '\n' + items + '\n' + r'\end{itemize}' + '\n\n'
    if tag == 'ol':
        items = '\n'.join(
            r'  \item ' + ''.join(_node(c) for c in li.children).strip()
            for li in n.find_all('li', recursive=False)
        )
        return r'\begin{enumerate}' + '\n' + items + '\n' + r'\end{enumerate}' + '\n\n'
    if tag == 'li':
        return inner
    if tag == 'br':
        return r'\\' + '\n'
    if tag == 'blockquote':
        return r'\begin{quote}' + '\n' + inner.strip() + '\n' + r'\end{quote}' + '\n\n'
    if tag == 'table':
        return _table(n)
    # passthrough: span, div, a, etc.
    return inner


def _table(tbl) -> str:
    rows = tbl.find_all('tr')
    if not rows:
        return ''
    col_count = max(len(r.find_all(['td', 'th'])) for r in rows)
    if col_count == 0:
        return ''

    spec = '|'.join(['X'] * col_count)
    lines = [r'\begin{tabularx}{\linewidth}{' + spec + '}', r'\toprule']

    for row in rows:
        cells = row.find_all(['td', 'th'])
        is_header = any(c.name == 'th' for c in cells)
        parts = []
        for c in cells:
            text = ''.join(_node(ch) for ch in c.children).strip()
            parts.append(r'\textbf{' + text + '}' if c.name == 'th' else text)
        lines.append(' & '.join(parts) + r' \\')
        if is_header:
            lines.append(r'\midrule')

    lines += [r'\bottomrule', r'\end{tabularx}', '']
    return '\n'.join(lines) + '\n\n'


def html_to_latex(html: str) -> str:
    if not html or _EMPTY.match(html.strip()):
        return r'\textit{(Conteúdo não preenchido)}'
    soup = BeautifulSoup(html, 'html.parser')
    return ''.join(_node(c) for c in soup.children).strip()
