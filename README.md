# Ad-Free Self-Assessment Label

A client-side web application that enables users to self-assess how "ad-free" they are using an EU-style quality label design.

## Overview

This lightweight web app generates an A-F rating label based on a self-assessment questionnaire. Users can take the assessment, receive their personalized label, and share their result via a unique URL that displays only the label when shared.

Example output: a result label might show grade **B** (e.g. score 75 aew) with sub-scores such as Privacy 65%, Premium 45%.

## Features

- **Dynamic Form Generation**: Questions loaded from JSON configuration
- **Weighted Scoring**: Each question has configurable weight and scoring options
- **Multi-Version Support**: Supports multiple assessment versions side-by-side
- **EU-Style Label Design**: Visual label with:
  - A-F vertical bars with variable width (20%-70%)
  - Color-coded gradients (green to red)
  - Score indicator aligned with matching grade row
  - Emoji icons for key metrics
- **Shareable Results**: URL hash encoding with deflate-compressed payloads (base64) for sharing assessment results with version tracking
- **Result-Only Pages**: Shared URLs show only the label, not the assessment form
- **Easy Customization**: Edit configuration files to modify questions, weights, and thresholds
- **Client-Side Only**: No server required, works entirely in the browser
- **Responsive Design**: Mobile-friendly layout

## Project Structure

```
alabel/
├── index.html       # Main HTML with embedded CSS
├── script.js        # JavaScript application logic
├── configs/         # Configuration versions
│   └── v1.json      # Version 1 configuration
└── README.md        # This file
```

## Usage

1. Open `index.html` in a web browser
2. Review the example label and instructions
3. Answer the self-assessment questions
4. View your personalized A-F rating label
5. Click "Share Your Result" to copy a shareable URL
6. Share the URL - recipients see only your result label

## Customization

The project supports multiple versions of the assessment configuration.

1.  **Create a new version**: Create a new JSON file in `configs/` (e.g., `configs/v2.json`).
2.  **Versioning**: Ensure the JSON object includes a `"version": "2"` field.
3.  **Loading**: To load a specific version, append `#v=2` to the URL (e.g., `index.html#v=2`).

Configuration parameters in `configs/v*.json`:

- **Questions**: Add, remove, or modify questions in the `questions` array
- **Weights**: Adjust `weight` for each question (should sum to 100)
- **Scoring Options**: Modify `score` and `label` for each option
- **Grade Thresholds**: Update `gradeThresholds` to change A-F score ranges
- **Icons**: Update `icons` array with emoji icons
- **Formula**: Set `"formula": "weighted_sum"` (default)

## Architecture

- **index.html**: Single-page application structure with CSS styling
- **script.js**:
  - Loads configuration dynamically based on URL hash (e.g., `#v=2`)
  - Renders form dynamically
  - Calculates scores using strategies (supports multiple formulas)
  - Determines grades from thresholds
  - Generates visual labels
  - Encodes/decodes URL hashes for sharing
- **configs/*.json**: Declarative configuration for assessment parameters per version

## Browser Compatibility

Works in all modern browsers that support:
- ES6 JavaScript (async/await, arrow functions)
- CSS Grid and Flexbox
- URL and URLSearchParams APIs
- Compression Streams API (deflate) for result URL payloads

No build process or dependencies required.
