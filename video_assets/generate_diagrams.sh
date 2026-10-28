#!/bin/bash
# Script to generate SVG diagrams from Mermaid source files
# Requires Mermaid CLI (mmdc) to be installed: npm install -g @mermaid-js/mermaid-cli

DIAGRAM_DIR="diagrams"
OUTPUT_DIR="diagrams/svg"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Check if mmdc is available
if ! command -v mmdc &> /dev/null
then
    echo "Mermaid CLI (mmdc) could not be found. Please install it with:"
    echo "npm install -g @mermaid-js/mermaid-cli"
    echo "Then re-run this script."
    exit 1
fi

# Process each .mmd file
for mmd_file in "$DIAGRAM_DIR"/*.mmd; do
    if [ -f "$mmd_file" ]; then
        filename=$(basename "$mmd_file" .mmd)
        output_file="$OUTPUT_DIR/$filename.svg"
        echo "Generating $output_file from $mmd_file"
        mmdc -i "$mmd_file" -o "$output_file" -b transparent --size 800
    fi
done

echo "Diagram generation complete. SVGs are in $OUTPUT_DIR"