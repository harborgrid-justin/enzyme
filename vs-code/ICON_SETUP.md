# Icon Setup Instructions

## Extension Icon

The VS Code marketplace requires a PNG or JPEG icon file. Currently, we have an SVG icon at `resources/enzyme-icon.svg` but need to create a PNG version.

### Steps to Create the Icon

1. **Using Online Tools:**
   - Go to https://cloudconvert.com/svg-to-png
   - Upload `resources/enzyme-icon.svg`
   - Set size to 128x128 pixels
   - Download and save as `resources/enzyme-icon.png`

2. **Using ImageMagick (if available):**
   ```bash
   convert -background none -resize 128x128 resources/enzyme-icon.svg resources/enzyme-icon.png
   ```

3. **Using Inkscape (if available):**
   ```bash
   inkscape -w 128 -h 128 resources/enzyme-icon.svg -o resources/enzyme-icon.png
   ```

4. **Using rsvg-convert (if available):**
   ```bash
   rsvg-convert -w 128 -h 128 resources/enzyme-icon.svg -o resources/enzyme-icon.png
   ```

### Icon Requirements

- **Format:** PNG or JPEG
- **Size:** 128x128 pixels (recommended)
- **Background:** Transparent (for PNG)
- **File:** `resources/enzyme-icon.png`

### Current Status

- ✅ SVG icon created at `resources/enzyme-icon.svg`
- ⚠️ PNG icon needed at `resources/enzyme-icon.png` (referenced in package.json)

### Temporary Workaround

If you need to package the extension before creating the PNG:

1. Temporarily change the icon reference in package.json:
   ```json
   "icon": "resources/enzyme-icon.svg"
   ```
   (Note: This may not display properly in the marketplace)

2. Or create a simple placeholder PNG

Once the PNG is created, the package.json is already configured to use it.
