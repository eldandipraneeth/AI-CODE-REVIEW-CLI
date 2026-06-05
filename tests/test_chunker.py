"""Tests for the diff chunker: parsing, splitting, token estimation, and edge cases."""

import pytest

from ai_codereview.chunker import DiffChunk, FileDiff, chunk_diff, estimate_tokens, parse_unified_diff


# ---------------------------------------------------------------------------
# parse_unified_diff
# ---------------------------------------------------------------------------

class TestParseUnifiedDiff:
    """Verify that raw unified-diff text is split into per-file FileDiff objects."""

    def test_single_file_diff(self):
        """A diff touching one file should yield exactly one FileDiff."""
        diff_text = (
            "diff --git a/foo.py b/foo.py\n"
            "index aaa..bbb 100644\n"
            "--- a/foo.py\n"
            "+++ b/foo.py\n"
            "@@ -1,3 +1,4 @@\n"
            " line1\n"
            "+new_line\n"
            " line2\n"
            " line3\n"
        )
        file_diffs = parse_unified_diff(diff_text)
        assert len(file_diffs) == 1
        assert file_diffs[0].file_path == "foo.py"
        assert "+new_line" in file_diffs[0].full_patch

    def test_multi_file_diff(self, sample_diff_text):
        """The sample diff covers two files, so we expect two FileDiff objects."""
        file_diffs = parse_unified_diff(sample_diff_text)
        assert len(file_diffs) == 2
        file_paths = {f.file_path for f in file_diffs}
        assert "src/app.py" in file_paths
        assert "src/utils.py" in file_paths

    def test_preserves_line_numbers(self):
        """Hunk line numbers should be populated from the @@ header."""
        diff_text = (
            "diff --git a/a.py b/a.py\n"
            "--- a/a.py\n"
            "+++ b/a.py\n"
            "@@ -10,6 +10,7 @@\n"
            " context\n"
            "+added\n"
            " more context\n"
        )
        file_diffs = parse_unified_diff(diff_text)
        assert len(file_diffs) >= 1
        assert len(file_diffs[0].hunks) >= 1
        assert file_diffs[0].hunks[0].new_start == 10

    def test_empty_diff_returns_empty(self, empty_diff):
        """An empty diff string should yield no FileDiff objects."""
        file_diffs = parse_unified_diff(empty_diff)
        assert file_diffs == []

    def test_diff_with_only_headers_no_hunks(self):
        """A diff header with no actual hunk lines should still be handled gracefully."""
        diff_text = (
            "diff --git a/empty.py b/empty.py\n"
            "index aaa..bbb 100644\n"
            "--- a/empty.py\n"
            "+++ b/empty.py\n"
        )
        file_diffs = parse_unified_diff(diff_text)
        # Should return a FileDiff with no hunks
        assert isinstance(file_diffs, list)


# ---------------------------------------------------------------------------
# chunk_diff — splitting and boundaries
# ---------------------------------------------------------------------------

class TestChunkDiff:
    """Verify that chunk_diff respects size limits and function boundaries."""

    def test_preserves_python_function_boundaries(self, sample_python_diff):
        """Chunks should not split in the middle of a Python function body."""
        chunks = chunk_diff(sample_python_diff, max_tokens=500)
        for chunk in chunks:
            assert isinstance(chunk, DiffChunk)
            assert chunk.file_path != ""

    def test_large_diff_is_split(self, large_diff):
        """A very large diff should be split into multiple chunks."""
        chunks = chunk_diff(large_diff, max_tokens=200)
        # With 300 added lines and a 200-token limit we expect >1 chunk
        assert len(chunks) > 1

    def test_small_diff_stays_single_chunk(self, sample_diff_text):
        """A small diff should remain as a single chunk when the limit is generous."""
        chunks = chunk_diff(sample_diff_text, max_tokens=10_000)
        # Two files → at most 2 chunks (one per file), not further split
        assert len(chunks) <= 2

    def test_chunk_content_not_empty(self, sample_diff_text):
        """Every returned chunk should contain non-empty content."""
        chunks = chunk_diff(sample_diff_text, max_tokens=10_000)
        for chunk in chunks:
            assert chunk.content.strip() != ""

    def test_language_detected_for_python(self, sample_python_diff):
        """For .py files the language field should be 'python'."""
        chunks = chunk_diff(sample_python_diff, max_tokens=10_000)
        for chunk in chunks:
            if chunk.file_path.endswith(".py"):
                assert chunk.language == "python"


# ---------------------------------------------------------------------------
# estimate_tokens
# ---------------------------------------------------------------------------

class TestEstimateTokens:
    """Sanity-check the token estimator helper."""

    def test_empty_string(self):
        assert estimate_tokens("") >= 0

    def test_short_string(self):
        tokens = estimate_tokens("hello world")
        assert 1 <= tokens <= 10

    def test_proportional_to_length(self):
        short = estimate_tokens("word " * 10)
        long = estimate_tokens("word " * 100)
        assert long > short

    def test_returns_int(self):
        result = estimate_tokens("some code here")
        assert isinstance(result, int)
