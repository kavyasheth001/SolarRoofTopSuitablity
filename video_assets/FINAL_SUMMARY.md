# SolarSight Motion Graphic Video - Complete Asset Package

This directory contains all the assets needed to create a professional motion graphic video explaining the SolarSight project.

## 📋 Overview
- **Video Duration**: 2 minutes 30 seconds
- **Style**: Clean, professional, with 3D animations and smooth transitions
- **Deliverables**: All assets pre-prepared for video assembly
- **Required Tools**: Video editor (After Effects, Premiere, DaVinci Resolve, etc.) and optionally Mermaid CLI for diagram generation

## 📁 Asset Inventory

### 🎬 Core Video Assets
1. **`script.md`** - Detailed scene-by-scene breakdown with:
   - Visual descriptions for each segment
   - On-screen text specifications
   - Animation cues
   - Transition recommendations
   - Timestamped sections (0:00-2:30)

2. **`voiceover.txt`** - Complete voice-over script synchronized with timestamps
   - Matches the script.md timing
   - Clear, energetic narration
   - Ready for recording

3. **`voiceover.srt`** - Subtitle file in SRT format
   - Ready to import into any video editor
   - Synchronized with voice-over timing
   - Contains all narration text

4. **`storyboard.txt`** - Text-based storyboard
   - Scene-by-scene visualization guide
   - Animation and transition details
   - Complement to script.md

### 📊 Diagrams (SVG Format)
All diagrams are in the `diagrams/svg/` folder as scalable vector graphics:

1. **`architecture_simple.svg`** - System architecture
   - Shows React/Vite frontend → ArcGIS JS API → Backend/Database
   - Clear data flow visualization
   - Color-coded by technology layer

2. **`shadow_analysis_simple.svg`** - Shadow analysis workflow
   - Step-by-step process of solar suitability calculation
   - From building selection to final score output
   - Decision points clearly marked

3. **`score_breakdown_simple.svg`** - Score calculation breakdown
   - Visual decomposition of the 0-100 scoring system
   - Shows weighted components (50% sunlit, 20% area, etc.)
   - Leads to suitability classification

### 📖 Documentation
- **`README.md`** - General instructions and color scheme
- **`FINAL_SUMMARY.md`** - This file (complete asset overview)

## 🎨 Project Color Scheme
Use these colors for consistency with the SolarSight interface:
- **Primary Blue**: `#1e3a5f` (headers, primary elements)
- **Success Green**: `#10b981` (suitable scores, positive metrics)
- **Warning Amber**: `#f59e0b` (moderate scores, cautions)
- **Error Red**: `#ef4444` (unsuitable scores, alerts)
- **Background**: White (`#ffffff`) or light gray (`#f8fafc`)
- **Text**: Dark gray (`#334155`) or white (`#ffffff`) on dark backgrounds

## 🛠️ How to Create the Video

### Step 1: Prepare Visual Elements
1. The SVG diagrams are ready to use - import them directly into your video editor
2. For raster versions (PNG/JPG), open the SVGs in a browser or vector editor and export
3. Create or source:
   - Simple 3D building models (extruded rectangles work for shadow simulation)
   - Icons matching the color scheme (sun, buildings, graphs, money, CO2, etc.)
   - Background elements (cityscape, map views)
   - UI elements resembling the SolarSight interface

### Step 2: Produce Audio
1. Record the voice-over using `voiceover.txt` or `voiceover.srt` as your script
2. Use a clear, energetic voice (moderate pace, ~130-150 wpm)
3. Record in a quiet environment (Audacity, Adobe Audition, smartphone voice memos)
4. Export as WAV or high-quality MP3 (44.1kHz or 48kHz)

### Step 3: Assemble in Video Editor
1. Import all assets: SVGs/PNGs, voice-over audio, any music/sfx
2. Create a new project: 1920x1080 (Full HD) or 3840x2160 (4K), 30 fps
3. Follow the `script.md` and `storyboard.txt` for scene timing and visuals
4. Use the `voiceover.srt` for automatic captioning or add manually
5. Apply smooth transitions (fades, wipes, zooms) between scenes
6. Add subtle sound effects for interactions and transitions (optional)
7. Include soft background music at low volume (< -20dB) if desired

### Step 4: Export
- **Format**: MP4 (H.264 codec) for sharing, or MOV (ProRes) for master copy
- **Resolution**: 1920x1080 (minimum) or 3840x2160 (recommended)
- **Frame Rate**: 30 fps
- **Bitrate**: 15-20 Mbps for 1080p, 35-45 Mbps for 4K

## ⚙️ Technical Notes

### Diagram Generation (if needed)
If you need to regenerate or modify diagrams:
1. Install Mermaid CLI: `npm install -g @mermaid-js/mermaid-cli`
2. Edit the `.mmd` files in `diagrams/` folder
3. Run: `mmdc -i input.mmd -o output.svg -b transparent --size 800`

### Animation Recommendations
- **Shadow Analysis**: Animate sun moving across sky (6 AM to 6 PM) with moving shadows
- **Score Gauge**: Animate from 0 to final score with color transition (red→yellow→green)
- **Financial Metrics**: Use counting-up animations for kWp, ₹/year, etc.
- **Transitions**: Use 0.5-1 second ease-in-out for most scene changes
- **UI Interactions**: Add subtle click/pulse effects on buttons and selections

## 📞 Support
For questions about the SolarSight project or these assets:
- Refer to the main project documentation in the repository root
- Check `README_SolarSight.md` for technical details
- Visit the project's main directory for source code and data specifications

---

**Ready to create your video!** All assets are prepared and organized for efficient video production. Simply follow the storyboard, record the voice-over, and assemble in your preferred video editing software.