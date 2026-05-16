FROM ghcr.io/astral-sh/uv:python3.13-alpine
WORKDIR /update-cache
COPY .python-version pyproject.toml uv.lock /update-cache/
ENV PATH="/update-cache/.venv/bin:$PATH"
RUN uv sync --no-dev --locked
COPY update_cache.py /update-cache/
CMD ["python", "update_cache.py"]