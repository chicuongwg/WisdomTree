#!/bin/sh
set -eu

if command -v apk >/dev/null 2>&1; then
  apk add --no-cache git pandoc poppler-utils tesseract-ocr tesseract-ocr-data-vie
elif command -v apt-get >/dev/null 2>&1; then
  if [ "$(id -u)" -eq 0 ]; then
    apt-get update
    apt-get install -y git pandoc poppler-utils tesseract-ocr tesseract-ocr-vie
  elif command -v sudo >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y git pandoc poppler-utils tesseract-ocr tesseract-ocr-vie
  else
    echo "Cần quyền root hoặc sudo để cài package hệ thống." >&2
    exit 1
  fi
elif command -v nix >/dev/null 2>&1; then
  nix profile add nixpkgs#pandoc nixpkgs#poppler_utils nixpkgs#tesseract
else
  echo "Không hỗ trợ package manager trên máy này." >&2
  exit 1
fi

for command_name in git pandoc pdftotext pdftoppm tesseract; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Thiếu binary sau khi cài: $command_name" >&2
    exit 1
  }
done

echo "Đã cài đủ Git, Pandoc, Poppler và Tesseract."
