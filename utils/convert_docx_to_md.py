import pathlib
import re
import sys

try:
    import pypandoc
except ImportError as exc:  # pragma: no cover - runtime dependency
    raise SystemExit(
        "Missing dependency: pypandoc. Install with: pip install pypandoc"
    ) from exc


def _normalize_blank_lines(markdown: str) -> str:
    """Collapse excessive blank lines to keep output compact."""
    compacted = re.sub(r"(\r?\n){3,}", "\n\n", markdown)
    return compacted.rstrip() + "\n"


def convert_docx_to_markdown(input_path: pathlib.Path, output_path: pathlib.Path) -> None:
    """Convert a .docx file to Markdown using Pandoc and write the result."""
    try:
        markdown = pypandoc.convert_file(
            str(input_path),
            "gfm",
            format="docx",
            extra_args=["--wrap=none"],
        )
    except OSError as exc:
        raise SystemExit(
            "Pandoc is required. Install it from https://pandoc.org/installing.html"
        ) from exc

    markdown = _normalize_blank_lines(markdown)
    output_path.write_text(markdown, encoding="utf-8")
    print("Conversion completed without warnings.")


INPUT_PATH = pathlib.Path(
    r"C:\Users\yerkh\progg\DS\files\projects\Qalam\documentation\ТЕХНИЧЕСкое_задание.docx"
)


def main() -> int:
    input_path = INPUT_PATH
    if not input_path.exists():
        print(f"Input file not found: {input_path}", file=sys.stderr)
        return 1

    output_path = input_path.with_suffix(".md")

    convert_docx_to_markdown(input_path, output_path)
    print(f"Wrote: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
