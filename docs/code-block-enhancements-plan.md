# Code Block Enhancements - Implementation Plan

**Date**: 2026-01-09
**Feature**: Code Block Enhancements
**Priority**: High
**Status**: Planning

## Overview

Enhance code blocks in the document viewer with improved functionality including copy-to-clipboard, line numbers, line highlighting, syntax theme selection, code folding, and better language detection.

## Current State

### What Exists
- Syntax highlighting via highlight.js v11.9.0
- GitHub Light theme (light mode) and GitHub Dark theme (dark mode)
- Language detection and auto-highlighting
- GFM (GitHub Flavored Markdown) support via marked.js

### What's Missing
- Copy-to-clipboard button
- Line numbers
- Line highlighting
- Syntax theme selector (beyond light/dark)
- Code folding for long blocks
- Run code snippets capability

## Requirements Analysis

### 1. Copy-to-Clipboard Button
**Priority**: HIGH
**Complexity**: LOW

Copy the code content to clipboard with visual feedback.

**Implementation**:
- Add button to top-right corner of each code block
- Use Clipboard API (`navigator.clipboard.writeText()`)
- Show success feedback (checkmark, "Copied!" message)
- Fallback for older browsers (execCommand)

**UI Design**:
- Icon: Copy/clipboard SVG
- Position: Absolute, top-right of code block
- Hover: Show tooltip
- Click: Change icon to checkmark, revert after 2s

### 2. Line Numbers
**Priority**: MEDIUM
**Complexity**: MEDIUM

Display line numbers in a gutter to the left of code.

**Implementation**:
- Wrap code block in container with two columns: line numbers + code
- Calculate line count from code content
- Synchronize scrolling between line numbers and code
- Apply to all code blocks automatically

**Considerations**:
- Line numbers should not be copied when user selects code
- Must work with syntax highlighting
- Should be styled to match theme
- Consider performance for very long files (1000+ lines)

### 3. Line Highlighting
**Priority**: MEDIUM
**Complexity**: MEDIUM

Highlight specific lines for emphasis.

**Implementation Options**:

**Option A: URL-based (recommended)**
- Use hash fragments: `#L10-L15` or `#L10`
- Parse URL on page load
- Scroll to and highlight specified lines
- Allow clicking line numbers to add to URL

**Option B: Markdown syntax**
- Extend markdown syntax: ```javascript {1,3-5}
- Requires custom marked.js renderer
- More complex but no URL manipulation

**Recommended**: Option A (URL-based)

**UI Design**:
- Highlighted lines have colored background
- Smooth scroll to first highlighted line
- Click line number to toggle highlight and update URL

### 4. Syntax Theme Selector
**Priority**: LOW
**Complexity**: MEDIUM

Allow users to choose from multiple syntax highlighting themes.

**Implementation**:
- Add theme picker UI (dropdown or palette)
- Store preference in localStorage
- Load theme CSS dynamically from CDN
- Separate from overall dark/light mode (optional override)

**Available Themes** (highlight.js):
- Light: github, atom-one-light, vs, xcode
- Dark: github-dark, atom-one-dark, monokai, tomorrow-night
- Popular: dracula, nord, solarized-light, solarized-dark

**UI Location**:
- Settings panel (future)
- Or: Gear icon in code block header

**Default Behavior**:
- Light mode → github theme
- Dark mode → github-dark theme
- User override persists across sessions

### 5. Code Folding
**Priority**: LOW
**Complexity**: HIGH

Collapse/expand code blocks that exceed a certain line count.

**Implementation**:
- Detect code blocks with N+ lines (threshold: 30 lines)
- Show "Expand/Collapse" button
- Collapse shows first 10 lines + "... X more lines"
- Smooth animation for expand/collapse

**Considerations**:
- Should work with line numbers
- Preserve syntax highlighting when collapsed/expanded
- Consider collapsing by logical sections (functions) - future enhancement

**UI Design**:
- Button at bottom of collapsed block: "Show 45 more lines"
- Button at top when expanded: "Collapse"
- Or: Fold icon in code block header

### 6. Language Detection and Auto-Highlighting
**Priority**: LOW (already implemented)
**Complexity**: N/A

Already implemented via highlight.js `highlightAuto()`.

**Potential Improvements**:
- Show detected language in code block header
- Allow manual override if detection is wrong
- Display language badge (e.g., "JavaScript", "Python")

### 7. Run Code Snippets (Sandboxed)
**Priority**: VERY LOW (out of scope for MVP)
**Complexity**: VERY HIGH

Execute code in a sandboxed environment.

**Challenges**:
- Security: Must be properly sandboxed (iframe, Web Workers)
- Language support: Would need interpreters/compilers
- Resource limits: CPU, memory, execution time
- Output handling: stdout, stderr, return values

**Recommendation**: Defer to future iteration. Too complex for current phase.

**Alternative**: Link to external playgrounds (CodeSandbox, JSFiddle, Repl.it)

## Proposed Implementation Order

### Phase 1: Essential Features (MVP)
1. **Copy-to-Clipboard Button** - Highest value, lowest effort
2. **Line Numbers** - Important for code reference
3. **Language Badge** - Show detected/specified language

### Phase 2: Enhanced Features
4. **Line Highlighting (URL-based)** - Good for documentation links
5. **Code Folding** - Useful for long code blocks

### Phase 3: Customization (Future)
6. **Syntax Theme Selector** - Nice to have, not essential
7. **Run Code Snippets** - Complex, defer indefinitely

## Technical Architecture

### File Structure
```
frontend/
  app.js           - Add code block enhancement functions
  styles.css       - Add code block enhancement styles
  viewer.html      - No changes needed (enhanced via JS)
```

### Key Functions (app.js)

```javascript
// After markdown rendering
enhanceCodeBlocks(container)
  ├─ addCopyButtons(codeBlocks)
  ├─ addLineNumbers(codeBlocks)
  ├─ addLanguageBadges(codeBlocks)
  ├─ setupCodeFolding(codeBlocks)
  └─ setupLineHighlighting()

// Clipboard
copyToClipboard(code, button)
showCopyFeedback(button)

// Line numbers
generateLineNumbers(codeBlock)
syncLineNumberScroll(container)

// Line highlighting
parseLineRange(hash)
highlightLines(codeBlock, lines)

// Folding
detectLongCodeBlocks(threshold = 30)
toggleCodeFold(codeBlock)
```

### CSS Additions (styles.css)

```css
.code-block-container
  - Wrapper for enhanced code blocks

.code-block-header
  - Header with copy button, language badge

.code-block-content
  - Main code + line numbers area

.line-numbers
  - Line number gutter (left column)

.code-copy-btn
  - Copy button styles

.code-language-badge
  - Language indicator

.code-fold-toggle
  - Expand/collapse button

.line-highlight
  - Highlighted line background
```

### Integration Points

1. **Call after markdown rendering** (app.js `loadDocument()`):
   ```javascript
   const rendered = renderMarkdown(doc.content);
   container.appendChild(rendered);
   enhanceCodeBlocks(rendered);  // NEW
   ```

2. **Handle URL hash changes** for line highlighting:
   ```javascript
   window.addEventListener('hashchange', updateLineHighlights);
   ```

3. **Preserve on theme change**:
   - Code enhancements should work in both light and dark modes
   - Copy button and line numbers adjust colors

## UI/UX Considerations

### Copy Button
- Position: Top-right, absolute positioning
- Icon: Clipboard or copy icon (SVG)
- Feedback: Icon changes to checkmark, fades back after 2s
- Tooltip: "Copy code" → "Copied!"

### Line Numbers
- Width: Auto-adjust based on line count (3 digits = 3ch)
- Alignment: Right-aligned
- Color: Muted, lower contrast than code
- Selection: Use CSS `user-select: none` to prevent copying
- Separator: Subtle border between numbers and code

### Language Badge
- Position: Top-left or top-center
- Style: Small pill/badge
- Color: Theme-aware (subtle, not distracting)
- Content: Language name (e.g., "JavaScript", "Python")

### Code Folding
- Threshold: 30+ lines
- Collapsed view: Show first 10 lines + button
- Button text: "Show 45 more lines" (dynamic count)
- Animation: Smooth max-height transition (300ms)

### Line Highlighting
- Background: Light yellow (light mode), dark yellow (dark mode)
- Opacity: Semi-transparent to preserve syntax colors
- Transition: Smooth fade-in when navigating
- Scroll behavior: Auto-scroll to first highlighted line

## Performance Considerations

1. **Line Numbers**
   - For very long files (1000+ lines), consider virtual scrolling
   - Or: Only render visible line numbers

2. **Enhancement Execution**
   - Run enhancements after markdown rendering completes
   - Use `requestAnimationFrame` for DOM manipulations
   - Debounce scroll events for line number sync

3. **Memory**
   - Don't duplicate code content for line numbers
   - Use CSS counters where possible
   - Clean up event listeners when navigating away

## Testing Plan

### Manual Testing
1. Test copy button on various code blocks (JS, Python, Bash)
2. Verify line numbers align correctly
3. Test line highlighting with URL hash
4. Verify code folding expands/collapses smoothly
5. Test in both light and dark modes
6. Test on mobile devices (responsive)

### Edge Cases
- Empty code blocks
- Single-line code blocks
- Very long code blocks (1000+ lines)
- Code blocks with special characters
- Code blocks without language specified
- Multiple code blocks on same page

### Browser Compatibility
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Accessibility

1. **Copy Button**
   - aria-label="Copy code"
   - Keyboard accessible (Tab + Enter)
   - Focus visible

2. **Line Numbers**
   - aria-hidden="true" (not part of content)
   - Not included in screen reader output

3. **Code Folding**
   - aria-expanded="true/false"
   - aria-label="Expand code" / "Collapse code"
   - Keyboard accessible

4. **Line Highlighting**
   - Does not affect screen readers
   - Maintain sufficient color contrast

## Future Enhancements (Not in This Plan)

- Code diff viewer (compare versions)
- Syntax theme gallery with live preview
- Export code block as image
- Inline code execution (REPL)
- Code annotations/comments
- Smart code completion hints
- Search within code block
- Download code as file

## Success Metrics

1. Copy button used on X% of document views
2. No performance degradation on large documents
3. Line numbers align correctly on all tested browsers
4. User feedback positive on code block usability

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance issues with long code blocks | High | Implement virtual scrolling or lazy rendering |
| Copy button conflicts with syntax highlighting | Medium | Careful CSS positioning and z-index |
| Line numbers misalign on different fonts | Medium | Use monospace font with fixed character width |
| Clipboard API not supported in older browsers | Low | Provide fallback with execCommand |

## Dependencies

- highlight.js v11.9.0 (already included)
- marked.js v11.1.1 (already included)
- Clipboard API (built-in browser API)

No new external dependencies required.

## Estimated Effort

- Phase 1 (MVP): 3-4 hours
  - Copy button: 1 hour
  - Line numbers: 1.5 hours
  - Language badge: 0.5 hour
  - Testing: 1 hour

- Phase 2 (Enhanced): 3-4 hours
  - Line highlighting: 2 hours
  - Code folding: 2 hours

**Total**: 6-8 hours for complete implementation

## Conclusion

Code Block Enhancements will significantly improve the user experience for viewing and interacting with code in documentation. The phased approach allows us to deliver high-value features first (copy button, line numbers) while deferring more complex features (code folding, theme selector) to later iterations.

The implementation is straightforward, requires no new dependencies, and integrates cleanly with the existing markdown rendering pipeline.
