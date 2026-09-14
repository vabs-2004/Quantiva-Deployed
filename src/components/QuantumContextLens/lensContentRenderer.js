/**
 * lensContentRenderer.js
 * 
 * Quantiva Contextual Lens: Specialized KaTeX & Markdown Content Formatter.
 * 
 * Ensures all structured fields from Tier 1 (Ontology) and Tier 2 (AI Explainer)
 * are cleanly parsed, delimiters normalized, and math protected before marked parsing.
 * 
 * Guarantees that:
 * - Inline LaTeX ($...$, \(...\))
 * - Display LaTeX ($$...$$, \[...\])
 * - Matrices (\begin{pmatrix}, \begin{bmatrix})
 * - Dirac kets/bras (|0⟩, \ket{\psi}, \langle\phi|)
 * - Complex amplitudes (\alpha, \beta, e^{i\theta})
 * render properly through Quantiva's existing MathHTMLContainer.
 */

import { marked } from "marked";

// Configure marked with GitHub Flavored Markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Escapes HTML characters
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Fixes malformed subscripts and clears decorative semicolons
 */
function cleanMath(math) {
  if (!math || typeof math !== "string") return "";
  return math
    .replace(/\\\*{(q\\?_?\d+)}/g, (_, qubit) => `\\_{${qubit.replace(/\\_/g, "_")}}`)
    .replace(
      /;\s*(\\(?:otimes|longrightarrow|rightarrow|xrightarrow|cdot|times))\s*;/g,
      " $1 "
    );
}

/**
 * Normalizes all delimiter variants: \[...\], \(...\), $$...$$, $...$
 */
function normalizeMathDelimiters(text) {
  if (!text || typeof text !== "string") return "";

  let normalized = text;
  // Convert \[...\] → $$...$$
  normalized = normalized.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${cleanMath(math)}$$`);
  // Convert \(...\) → $...$
  normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${cleanMath(math)}$`);
  // Clean existing $$...$$ blocks
  normalized = normalized.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => `$$${cleanMath(math)}$$`);
  // Clean existing $...$ blocks
  normalized = normalized.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_, math) => `$${cleanMath(math)}$`);

  return normalized;
}

/**
 * Auto-delimit bare math formulas or Dirac notation lacking $ delimiters
 */
function autoDelimitBareMath(text) {
  if (!text || typeof text !== "string") return "";

  let s = text.trim();

  // If the whole string is a standalone mathematical formula without $ delimiters
  if (!s.includes("$") && !s.includes("\\(") && !s.includes("\\[")) {
    const isFormula =
      /^(?:[A-Za-z0-9|\s+\-*/=()\\_^{},.<>±≈≤≥→∝⊗⊕~]|\\(?:frac|begin|end|alpha|beta|psi|phi|theta|lambda|pi|ket|bra|rangle|langle|sqrt|pmatrix|bmatrix))+$/.test(s) &&
      /(\\[a-zA-Z]+|\|[01+-a-zA-Z\d_]+[>⟩]|\|[\\a-zA-Z]+[>⟩])/.test(s);

    if (isFormula) {
      return `$$${cleanMath(s)}$$`;
    }
  }

  // Protect existing $...$ and $$...$$
  const protectedMath = [];
  s = s.replace(/\$\$[\s\S]*?\$\$|(?<!\$)\$[^$\n]+?\$(?!\$)/g, (m) => {
    const id = protectedMath.length;
    protectedMath.push(m);
    return `ZZZEXISTINGMATH${id}ZZZ`;
  });

  // Auto-wrap bare Unicode Dirac kets: |0⟩, |1⟩, |+⟩, |-⟩, |ψ⟩
  s = s.replace(/(?<!\$)\|(?:[01+-]|[a-zA-Z\d_]+|\.\.\.)(?:⟩|>)(?!\$)/g, (m) => {
    const inner = m.slice(1, -1);
    return `$\\ket{${inner}}$`;
  });

  // Restore protected math
  protectedMath.forEach((math, i) => {
    s = s.replace(`ZZZEXISTINGMATH${i}ZZZ`, math);
  });

  return s;
}

/**
 * Protect math blocks so marked doesn't mangle underscores, asterisks, or backslashes
 */
function protectMathBlocks(text) {
  const mathBlocks = [];
  const protectedText = text.replace(
    /\$\$[\s\S]*?\$\$|(?<!\$)\$[^$\n]*?\$(?!\$)/g,
    (match) => {
      const index = mathBlocks.length;
      mathBlocks.push(match);
      return `LENS_MATH_${index}_END`;
    }
  );
  return { protectedText, mathBlocks };
}

/**
 * Restores math blocks back into the HTML string
 */
function restoreMathBlocks(html, mathBlocks) {
  let restored = html;
  mathBlocks.forEach((math, index) => {
    const token = `LENS_MATH_${index}_END`;
    restored = restored.replace(token, escapeHtml(math));
  });
  return restored;
}

/**
 * Converts any Lens content field into KaTeX-ready HTML
 */
export function formatLensContentToHtml(rawText) {
  if (!rawText || typeof rawText !== "string") return "";

  // Guard: Never render raw JSON strings
  const trimmed = rawText.trim();
  if (trimmed.startsWith("{") && (trimmed.includes('"quickMeaning"') || trimmed.includes('"contextualRole"'))) {
    try {
      const parsed = JSON.parse(trimmed);
      const extracted = parsed.contextualRole || parsed.quickMeaning || "";
      if (extracted) return formatLensContentToHtml(extracted);
    } catch {
      // Ignore unparseable raw JSON
    }
    return "";
  }

  // 1. Normalize delimiters
  const normalized = normalizeMathDelimiters(rawText);

  // 2. Auto-delimit bare math
  const autoDelimited = autoDelimitBareMath(normalized);

  // 3. Protect math blocks from marked parsing
  const { protectedText, mathBlocks } = protectMathBlocks(autoDelimited);

  // 4. Parse markdown
  const rawHtml = marked.parse(protectedText);

  // 5. Restore math blocks for MathHTMLContainer KaTeX processing
  return restoreMathBlocks(rawHtml, mathBlocks);
}

export default formatLensContentToHtml;
