FROM texlive/texlive:latest

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY proposal-web/requirements.txt ./proposal-web/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages \
        -r ./proposal-web/requirements.txt

COPY proposal-web/   ./proposal-web/
COPY proposal-business/ ./proposal-business/

WORKDIR /app/proposal-web

EXPOSE 8000
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
