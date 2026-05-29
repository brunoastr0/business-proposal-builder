FROM python:3.11-slim

# TeX Live packages required for LuaLaTeX compilation.
# texlive-fonts-extra is large (~500 MB) but provides TeX Gyre Math fonts
# used by unicode-math in the template.
RUN apt-get update && apt-get install -y --no-install-recommends \
        texlive-luatex \
        texlive-latex-extra \
        texlive-fonts-extra \
        texlive-lang-portuguese \
    && rm -rf /var/lib/apt/lists/* \
    && luaotfload-tool --update

WORKDIR /app

# Install Python deps before copying source (better layer caching)
COPY proposal-web/requirements.txt ./proposal-web/requirements.txt
RUN pip install --no-cache-dir -r ./proposal-web/requirements.txt

# Copy app + template (compiler.py resolves ../proposal-business at runtime)
COPY proposal-web/   ./proposal-web/
COPY proposal-business/ ./proposal-business/

WORKDIR /app/proposal-web

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
