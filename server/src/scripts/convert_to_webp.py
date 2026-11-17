#!/usr/bin/env python3
"""
Single-Image WebP Converter CLI Tool
Aeterna One CRM — Server Utility

Usage:
  Interactive prompt:
    python src/scripts/convert_to_webp.py
    (or: npm run convert:image)

  Direct CLI argument:
    python src/scripts/convert_to_webp.py "path/to/image.png"
    python src/scripts/convert_to_webp.py "path/to/image.png" --delete
    python src/scripts/convert_to_webp.py "path/to/image.png" --keep
"""

import sys
import os
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("\n❌ Error: Pillow is not installed in the Python environment.")
    print("   Install it using: pip install pillow\n")
    sys.exit(1)


SUPPORTED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp'}


def format_bytes(bytes_count):
    """Format bytes to human readable string (KB or MB)."""
    if bytes_count < 1024 * 1024:
        return f"{bytes_count / 1024:.2f} KB"
    return f"{bytes_count / (1024 * 1024):.2f} MB"


def clean_input_path(raw_path: str) -> Path:
    """Clean surrounding quotes, whitespace and resolve path."""
    cleaned = raw_path.strip().strip('"').strip("'").strip()
    return Path(cleaned).expanduser().resolve()


def convert_image_to_webp(file_path: Path, delete_original: bool = None) -> bool:
    """Convert a single image to WebP with RGBA transparency preserved."""
    if not file_path.exists():
        print(f"\n❌ Error: File not found at path: {file_path}")
        return False

    if not file_path.is_file():
        print(f"\n❌ Error: Target path is not a file: {file_path}")
        return False

    ext = file_path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        print(f"\n❌ Error: Unsupported file format '{ext}'.")
        print(f"   Supported formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")
        return False

    if ext == '.webp':
        print(f"\n⚠️  Notice: The file '{file_path.name}' is already a WebP image.")
        reconvert = input("   Do you want to re-compress it? (y/N): ").strip().lower()
        if reconvert not in ('y', 'yes'):
            print("   Operation cancelled.")
            return False

    output_path = file_path.with_suffix('.webp')

    # If input is already .webp, save to temporary or overwrite directly
    is_same_file = (output_path == file_path)
    temp_output_path = file_path.with_name(f"{file_path.stem}_temp.webp") if is_same_file else output_path

    try:
        orig_size = file_path.stat().st_size

        with Image.open(file_path) as img:
            # Preserve transparency if present
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                processed_img = img.convert('RGBA')
            elif img.mode != 'RGB':
                processed_img = img.convert('RGB')
            else:
                processed_img = img

            # Save with high-efficiency WebP compression
            processed_img.save(
                temp_output_path,
                format='WEBP',
                quality=85,
                method=6
            )

        if is_same_file:
            temp_output_path.replace(file_path)
            new_path = file_path
        else:
            new_path = output_path

        new_size = new_path.stat().st_size
        saved_bytes = orig_size - new_size
        saved_pct = (saved_bytes / orig_size * 100) if orig_size > 0 else 0

        print("\n" + "=" * 55)
        print(" 🎉 Image Converted Successfully to WebP!")
        print("=" * 55)
        print(f" 📄 Source:       {file_path.name} ({format_bytes(orig_size)})")
        print(f" ✨ Output:       {new_path.name} ({format_bytes(new_size)})")
        print(f" 📂 Path:         {new_path}")
        print(f" 📉 Saved:        {format_bytes(saved_bytes)} ({saved_pct:.1f}% reduction)")
        print("=" * 55)

        # Handle deletion of original file if output is a new file
        if not is_same_file:
            if delete_original is None:
                confirm = input("\n🗑️  Delete original file? (y/N) [default: N]: ").strip().lower()
                delete_original = (confirm in ('y', 'yes'))

            if delete_original:
                try:
                    file_path.unlink()
                    print(f"   Deleted original file: {file_path.name}")
                except Exception as del_err:
                    print(f"   ⚠️  Could not delete original file: {del_err}")
            else:
                print(f"   Kept original file: {file_path.name}")

        return True

    except Exception as e:
        print(f"\n❌ Failed to convert image: {e}")
        if temp_output_path.exists() and is_same_file:
            temp_output_path.unlink()
        return False


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = [a for a in sys.argv[1:] if a.startswith('--')]

    delete_original = None
    if '--delete' in flags:
        delete_original = True
    elif '--keep' in flags:
        delete_original = False

    print("\n=======================================================")
    print(" 🖼️   AETERNA CRM — On-Demand WebP Image Converter")
    print("=======================================================")

    if args:
        target_input = args[0]
    else:
        print("\n👉 Drag & drop an image or enter its path below:")
        try:
            target_input = input("   Image Path: ")
        except (KeyboardInterrupt, EOFError):
            print("\n\nOperation cancelled.")
            sys.exit(0)

    if not target_input.strip():
        print("❌ No path entered. Exiting.")
        sys.exit(1)

    file_path = clean_input_path(target_input)
    success = convert_image_to_webp(file_path, delete_original=delete_original)

    if not success:
        sys.exit(1)


if __name__ == '__main__':
    main()
