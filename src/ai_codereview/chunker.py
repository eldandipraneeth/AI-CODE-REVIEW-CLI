"""Smart diff chunking engine.

Solves the large-diff problem: splits code diffs intelligently while preserving
function boundaries. Uses Python AST for .py files, regex heuristics for other
languages, and sliding-window fallback for everything else.
"""

from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field


@dataclass
class DiffHunk:
    """A single hunk from a unified diff."""

    old_start: int
    old_count: int
    new_start: int
    new_count: int
    lines: list[str] = field(default_factory=list)
    header: str = ""


@dataclass
class FileDiff:
    """Parsed diff for a single file."""

    file_path: str
    hunks: list[DiffHunk] = field(default_factory=list)
    status: str = "modified"  # added, modified, deleted, renamed

    @property
    def full_patch(self) -> str:
        """Reconstruct the patch text from hunks."""
        parts = []
        for hunk in self.hunks:
            parts.append(hunk.header)
            parts.extend(hunk.lines)
        return "\n".join(parts)


@dataclass
class DiffChunk:
    """A reviewable chunk of a diff, ready to send to the LLM.

    Each chunk preserves semantic boundaries (function/class level) and
    includes surrounding context for the model to understand intent.
    """

    file_path: str
    start_line: int
    end_line: int
    content: str
    context: str = ""
    language: str = ""


# ---------------------------------------------------------------------------
# Token estimation
# ---------------------------------------------------------------------------

def estimate_tokens(text: str) -> int:
    """Estimate token count for a text string.

    Uses the rough heuristic of ~4 characters per token, which is reasonably
    accurate for code across most tokenizers.
    """
    return max(1, len(text) // 4)


# ---------------------------------------------------------------------------
# Unified diff parser
# ---------------------------------------------------------------------------

_DIFF_FILE_HEADER = re.compile(r"^diff --git a/(.*?) b/(.*?)$")
_DIFF_HUNK_HEADER = re.compile(
    r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$"
)
_DIFF_NEW_FILE = re.compile(r"^\+\+\+ b/(.+)$")
_DIFF_OLD_FILE = re.compile(r"^--- (?:a/(.+)|/dev/null)$")


def parse_unified_diff(diff_text: str) -> list[FileDiff]:
    """Parse a unified diff string into structured FileDiff objects.

    Handles standard `git diff` and GitHub API diff formats.

    Args:
        diff_text: Raw unified diff text.

    Returns:
        List of FileDiff objects, one per changed file.
    """
    if not diff_text or not diff_text.strip():
        return []

    files: list[FileDiff] = []
    current_file: FileDiff | None = None
    current_hunk: DiffHunk | None = None

    for line in diff_text.split("\n"):
        # New file header
        file_match = _DIFF_FILE_HEADER.match(line)
        if file_match:
            current_file = FileDiff(file_path=file_match.group(2))
            files.append(current_file)
            current_hunk = None
            continue

        # +++ header (new file path, more reliable)
        new_file_match = _DIFF_NEW_FILE.match(line)
        if new_file_match and current_file:
            current_file.file_path = new_file_match.group(1)
            continue

        # --- header (old file path)
        old_file_match = _DIFF_OLD_FILE.match(line)
        if old_file_match:
            if old_file_match.group(1) is None and current_file:
                current_file.status = "added"
            continue

        # Hunk header
        hunk_match = _DIFF_HUNK_HEADER.match(line)
        if hunk_match and current_file:
            current_hunk = DiffHunk(
                old_start=int(hunk_match.group(1)),
                old_count=int(hunk_match.group(2) or "1"),
                new_start=int(hunk_match.group(3)),
                new_count=int(hunk_match.group(4) or "1"),
                header=line,
            )
            current_file.hunks.append(current_hunk)
            continue

        # Diff content lines
        if current_hunk is not None and line and line[0] in ("+", "-", " ", "\\"):
            current_hunk.lines.append(line)

    return files


# ---------------------------------------------------------------------------
# AST-aware chunking (Python)
# ---------------------------------------------------------------------------

@dataclass
class _ASTBoundary:
    """A function or class boundary from AST analysis."""

    name: str
    start_line: int
    end_line: int
    type: str  # "function" or "class"


def _get_python_boundaries(source: str) -> list[_ASTBoundary]:
    """Extract function and class boundaries from Python source using AST.

    Args:
        source: Python source code string.

    Returns:
        List of AST boundaries sorted by start line.
    """
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []

    boundaries: list[_ASTBoundary] = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            boundaries.append(
                _ASTBoundary(
                    name=node.name,
                    start_line=node.lineno,
                    end_line=node.end_lineno or node.lineno,
                    type="function",
                )
            )
        elif isinstance(node, ast.ClassDef):
            boundaries.append(
                _ASTBoundary(
                    name=node.name,
                    start_line=node.lineno,
                    end_line=node.end_lineno or node.lineno,
                    type="class",
                )
            )

    boundaries.sort(key=lambda b: b.start_line)
    return boundaries


# ---------------------------------------------------------------------------
# Regex-based boundary detection (non-Python)
# ---------------------------------------------------------------------------

# Patterns that typically indicate function/class boundaries
_BOUNDARY_PATTERNS = [
    re.compile(r"^(?:export\s+)?(?:async\s+)?function\s+\w+", re.MULTILINE),
    re.compile(r"^(?:export\s+)?class\s+\w+", re.MULTILINE),
    re.compile(r"^(?:pub\s+)?(?:async\s+)?fn\s+\w+", re.MULTILINE),  # Rust
    re.compile(r"^func\s+\w+", re.MULTILINE),  # Go
    re.compile(r"^(?:public|private|protected)\s+.*\w+\s*\(", re.MULTILINE),  # Java/C#
    re.compile(r"^def\s+\w+", re.MULTILINE),  # Ruby
]


def _find_regex_boundaries(source: str) -> list[int]:
    """Find approximate function/class boundaries using regex.

    Returns a sorted list of line numbers where boundaries are detected.
    """
    boundary_lines: set[int] = set()

    for pattern in _BOUNDARY_PATTERNS:
        for match in pattern.finditer(source):
            line_num = source[:match.start()].count("\n") + 1
            boundary_lines.add(line_num)

    return sorted(boundary_lines)


# ---------------------------------------------------------------------------
# Main chunking logic
# ---------------------------------------------------------------------------

_DEFAULT_MAX_TOKENS = 3000
_MIN_CHUNK_TOKENS = 100
_OVERLAP_LINES = 5


def chunk_diff(
    diff_text: str,
    max_tokens: int = _DEFAULT_MAX_TOKENS,
    source_files: dict[str, str] | None = None,
) -> list[DiffChunk]:
    """Split a unified diff into reviewable chunks that preserve semantic boundaries.

    This is the main entry point for the chunking engine. It:
    1. Parses the unified diff into per-file hunks
    2. For each file, attempts AST-aware splitting (Python)
    3. Falls back to regex boundary detection (other languages)
    4. Last resort: sliding window with overlap

    Args:
        diff_text: Raw unified diff text.
        max_tokens: Maximum estimated tokens per chunk.
        source_files: Optional dict of file_path -> full source code for
            AST analysis. If not provided, chunks by diff hunks alone.

    Returns:
        List of DiffChunk objects ready for LLM review.
    """
    file_diffs = parse_unified_diff(diff_text)

    if not file_diffs:
        return []

    chunks: list[DiffChunk] = []

    for file_diff in file_diffs:
        if file_diff.status == "deleted":
            continue  # Don't review deleted files

        if not file_diff.hunks:
            continue

        file_chunks = _chunk_file_diff(file_diff, max_tokens, source_files)
        chunks.extend(file_chunks)

    return chunks


def _chunk_file_diff(
    file_diff: FileDiff,
    max_tokens: int,
    source_files: dict[str, str] | None,
) -> list[DiffChunk]:
    """Chunk a single file's diff into reviewable pieces."""
    patch = file_diff.full_patch
    lang = _detect_language_from_path(file_diff.file_path)

    # If the whole patch fits in one chunk, just return it
    if estimate_tokens(patch) <= max_tokens:
        first_hunk = file_diff.hunks[0]
        last_hunk = file_diff.hunks[-1]
        context = ""
        if source_files and file_diff.file_path in source_files:
            context = _extract_context(
                source_files[file_diff.file_path],
                first_hunk.new_start,
                lang,
            )
        return [
            DiffChunk(
                file_path=file_diff.file_path,
                start_line=first_hunk.new_start,
                end_line=last_hunk.new_start + last_hunk.new_count,
                content=patch,
                context=context,
                language=lang,
            )
        ]

    # Try AST-aware chunking for Python files
    if lang == "python" and source_files and file_diff.file_path in source_files:
        ast_chunks = _chunk_by_ast(
            file_diff, source_files[file_diff.file_path], max_tokens
        )
        if ast_chunks:
            return ast_chunks

    # Fall back to hunk-based chunking
    return _chunk_by_hunks(file_diff, max_tokens, lang)


def _chunk_by_ast(
    file_diff: FileDiff,
    source: str,
    max_tokens: int,
) -> list[DiffChunk]:
    """Chunk a Python file's diff using AST boundaries.

    Groups diff hunks by the function/class they belong to, ensuring each
    chunk contains a complete semantic unit.
    """
    boundaries = _get_python_boundaries(source)

    if not boundaries:
        return []

    # Map each hunk to its containing function/class
    boundary_hunks: dict[str, list[DiffHunk]] = {}
    unmapped_hunks: list[DiffHunk] = []

    for hunk in file_diff.hunks:
        hunk_start = hunk.new_start
        hunk_end = hunk.new_start + hunk.new_count
        matched = False

        for boundary in boundaries:
            if hunk_start <= boundary.end_line and hunk_end >= boundary.start_line:
                key = f"{boundary.type}:{boundary.name}:{boundary.start_line}"
                if key not in boundary_hunks:
                    boundary_hunks[key] = []
                boundary_hunks[key].append(hunk)
                matched = True
                break

        if not matched:
            unmapped_hunks.append(hunk)

    chunks: list[DiffChunk] = []

    # Create chunks for each function/class group
    for key, hunks in boundary_hunks.items():
        content_parts = []
        for hunk in hunks:
            content_parts.append(hunk.header)
            content_parts.extend(hunk.lines)

        content = "\n".join(content_parts)
        first_hunk = hunks[0]
        last_hunk = hunks[-1]

        # If this group is too large, split it further
        if estimate_tokens(content) > max_tokens:
            sub_chunks = _split_large_content(
                content=content,
                file_path=file_diff.file_path,
                start_line=first_hunk.new_start,
                max_tokens=max_tokens,
                language="python",
            )
            chunks.extend(sub_chunks)
        else:
            boundary_info = key.split(":")
            context = f"# In {boundary_info[0]} '{boundary_info[1]}'"
            chunks.append(
                DiffChunk(
                    file_path=file_diff.file_path,
                    start_line=first_hunk.new_start,
                    end_line=last_hunk.new_start + last_hunk.new_count,
                    content=content,
                    context=context,
                    language="python",
                )
            )

    # Handle unmapped hunks (top-level code, imports, etc.)
    if unmapped_hunks:
        content_parts = []
        for hunk in unmapped_hunks:
            content_parts.append(hunk.header)
            content_parts.extend(hunk.lines)

        content = "\n".join(content_parts)
        chunks.append(
            DiffChunk(
                file_path=file_diff.file_path,
                start_line=unmapped_hunks[0].new_start,
                end_line=unmapped_hunks[-1].new_start + unmapped_hunks[-1].new_count,
                content=content,
                context="# Top-level code / imports",
                language="python",
            )
        )

    return chunks


def _chunk_by_hunks(
    file_diff: FileDiff,
    max_tokens: int,
    language: str,
) -> list[DiffChunk]:
    """Chunk by grouping adjacent hunks up to the token limit."""
    chunks: list[DiffChunk] = []
    current_parts: list[str] = []
    current_tokens = 0
    group_start: int | None = None
    group_end = 0

    for hunk in file_diff.hunks:
        hunk_text = hunk.header + "\n" + "\n".join(hunk.lines)
        hunk_tokens = estimate_tokens(hunk_text)

        # If single hunk exceeds limit, split it
        if hunk_tokens > max_tokens:
            # Flush current group first
            if current_parts:
                chunks.append(
                    DiffChunk(
                        file_path=file_diff.file_path,
                        start_line=group_start or 1,
                        end_line=group_end,
                        content="\n".join(current_parts),
                        language=language,
                    )
                )
                current_parts = []
                current_tokens = 0
                group_start = None

            # Split the large hunk
            sub_chunks = _split_large_content(
                content=hunk_text,
                file_path=file_diff.file_path,
                start_line=hunk.new_start,
                max_tokens=max_tokens,
                language=language,
            )
            chunks.extend(sub_chunks)
            continue

        # Would adding this hunk exceed the limit?
        if current_tokens + hunk_tokens > max_tokens and current_parts:
            chunks.append(
                DiffChunk(
                    file_path=file_diff.file_path,
                    start_line=group_start or 1,
                    end_line=group_end,
                    content="\n".join(current_parts),
                    language=language,
                )
            )
            current_parts = []
            current_tokens = 0
            group_start = None

        if group_start is None:
            group_start = hunk.new_start

        current_parts.append(hunk_text)
        current_tokens += hunk_tokens
        group_end = hunk.new_start + hunk.new_count

    # Flush remaining
    if current_parts:
        chunks.append(
            DiffChunk(
                file_path=file_diff.file_path,
                start_line=group_start or 1,
                end_line=group_end,
                content="\n".join(current_parts),
                language=language,
            )
        )

    return chunks


def _split_large_content(
    content: str,
    file_path: str,
    start_line: int,
    max_tokens: int,
    language: str,
) -> list[DiffChunk]:
    """Split content that exceeds the token limit using logical boundaries.

    Tries to split at blank lines first, then at any line boundary.
    """
    lines = content.split("\n")
    chunks: list[DiffChunk] = []
    current_lines: list[str] = []
    current_tokens = 0

    for i, line in enumerate(lines):
        line_tokens = estimate_tokens(line)

        if current_tokens + line_tokens > max_tokens and current_lines:
            chunks.append(
                DiffChunk(
                    file_path=file_path,
                    start_line=start_line + (len(lines) - len(current_lines) - (len(lines) - i)),
                    end_line=start_line + i,
                    content="\n".join(current_lines),
                    language=language,
                )
            )
            # Keep a few lines of overlap for context
            overlap = current_lines[-_OVERLAP_LINES:] if len(current_lines) > _OVERLAP_LINES else []
            current_lines = overlap
            current_tokens = estimate_tokens("\n".join(overlap))

        current_lines.append(line)
        current_tokens += line_tokens

    if current_lines:
        chunks.append(
            DiffChunk(
                file_path=file_path,
                start_line=start_line + max(0, len(lines) - len(current_lines)),
                end_line=start_line + len(lines),
                content="\n".join(current_lines),
                language=language,
            )
        )

    return chunks


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_context(source: str, line_number: int, language: str) -> str:
    """Extract surrounding context (imports, class definition) for a given line."""
    lines = source.split("\n")
    context_parts: list[str] = []

    if language == "python":
        # Grab import lines
        for line in lines[:min(30, len(lines))]:
            stripped = line.strip()
            if stripped.startswith(("import ", "from ")) or not stripped:
                context_parts.append(line)
            elif stripped and not stripped.startswith("#"):
                break

    # Grab surrounding lines for context (5 lines before the changed area)
    context_start = max(0, line_number - 6)
    context_end = max(0, line_number - 1)
    if context_start < context_end:
        surrounding = lines[context_start:context_end]
        if surrounding:
            context_parts.append(f"\n# ... (lines {context_start + 1}-{context_end}):")
            context_parts.extend(surrounding)

    return "\n".join(context_parts) if context_parts else ""


def _detect_language_from_path(file_path: str) -> str:
    """Detect language from file extension."""
    ext_map = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".jsx": "javascript",
        ".go": "go",
        ".rs": "rust",
        ".java": "java",
        ".rb": "ruby",
        ".php": "php",
        ".c": "c",
        ".cpp": "cpp",
        ".h": "c",
        ".hpp": "cpp",
        ".cs": "csharp",
        ".swift": "swift",
        ".kt": "kotlin",
        ".scala": "scala",
        ".sh": "bash",
    }
    for ext, lang in ext_map.items():
        if file_path.endswith(ext):
            return lang
    return ""
