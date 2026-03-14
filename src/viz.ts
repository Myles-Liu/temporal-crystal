/**
 * HTML Visualization Module for Temporal Crystal Memory
 *
 * Generates a self-contained HTML page that visualizes all memory layers
 * with timeline view, memory cards, and layer color-coding.
 */

import { MemoryStore } from "./store.js";
import { MemoryLayer, MemoryData, CrystalData } from "./models.js";

interface VizMemory extends MemoryData {
  ageHours: number;
  ageDays: number;
}

interface VizCrystal extends CrystalData {
  ageHours: number;
  ageDays: number;
}

const LAYER_COLORS: Record<MemoryLayer, { bg: string; border: string; text: string; label: string }> = {
  [MemoryLayer.RAW]: { bg: "#E3F2FD", border: "#1976D2", text: "#0D47A1", label: "Raw" },
  [MemoryLayer.COMPRESSED]: { bg: "#E8F5E9", border: "#388E3C", text: "#1B5E20", label: "Compressed" },
  [MemoryLayer.ABSTRACT]: { bg: "#FFF3E0", border: "#F57C00", text: "#E65100", label: "Abstract" },
  [MemoryLayer.CRYSTAL]: { bg: "#F3E5F5", border: "#7B1FA2", text: "#4A148C", label: "Crystal" },
};

const CRYSTAL_COLOR = { bg: "#FCE4EC", border: "#C2185B", text: "#880E4F", label: "💎 Insight" };

export interface GenerateHTMLOptions {
  title?: string;
  description?: string;
}

/**
 * Calculate age in hours and days
 */
function calculateAge(
  createdAt: string
): { hours: number; days: number } {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMs = now - created;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  return { hours, days };
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Format age display
 */
function formatAge(hours: number, days: number): string {
  if (days > 0) {
    return `${days}d ${hours % 24}h ago`;
  }
  return `${hours}h ago`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Generate memory card HTML
 */
function generateMemoryCard(memory: VizMemory, index: number): string {
  const colors = LAYER_COLORS[memory.layer];
  const tagsHtml =
    memory.tags.length > 0
      ? memory.tags
          .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
          .join("")
      : "";

  const sourceInfo =
    memory.sourceIds.length > 0
      ? `<div class="source-info">Compressed from: ${memory.sourceIds.join(", ")}</div>`
      : "";

  return `
    <div class="memory-card" style="border-left: 4px solid ${colors.border}; background: ${colors.bg};">
      <div class="card-header" style="color: ${colors.text};">
        <span class="layer-badge" style="background: ${colors.border}; color: white;">
          ${colors.label}
        </span>
        <span class="memory-id">#${memory.id}</span>
        <span class="memory-age">${formatAge(memory.ageHours, memory.ageDays)}</span>
      </div>
      <div class="card-content">
        <p class="memory-text">${escapeHtml(memory.content)}</p>
        ${sourceInfo}
      </div>
      <div class="card-footer" style="color: ${colors.text};">
        <div class="card-meta">
          <span class="importance">Importance: ${(memory.importance * 100).toFixed(0)}%</span>
          <span class="timestamp">Created: ${formatTimestamp(memory.createdAt)}</span>
          ${memory.compressedAt ? `<span class="compressed-at">Compressed: ${formatTimestamp(memory.compressedAt)}</span>` : ""}
        </div>
        ${tagsHtml ? `<div class="tags-container">${tagsHtml}</div>` : ""}
      </div>
    </div>
  `;
}

/**
 * Generate crystal card HTML
 */
function generateCrystalCard(crystal: VizCrystal): string {
  const tagsHtml =
    crystal.tags.length > 0
      ? crystal.tags
          .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
          .join("")
      : "";

  const evidenceHtml =
    crystal.evidence.length > 0
      ? `<div class="evidence-list">Evidence: ${crystal.evidence.map((e) => escapeHtml(e)).join(", ")}</div>`
      : "";

  return `
    <div class="crystal-card" style="border-left: 4px solid ${CRYSTAL_COLOR.border}; background: ${CRYSTAL_COLOR.bg};">
      <div class="card-header" style="color: ${CRYSTAL_COLOR.text};">
        <span class="layer-badge" style="background: ${CRYSTAL_COLOR.border}; color: white;">
          ${CRYSTAL_COLOR.label}
        </span>
        <span class="memory-id">#${crystal.id}</span>
        <span class="memory-age">${formatAge(crystal.ageHours, crystal.ageDays)}</span>
      </div>
      <div class="card-content">
        <p class="memory-text"><strong>${escapeHtml(crystal.insight)}</strong></p>
        ${evidenceHtml}
      </div>
      <div class="card-footer" style="color: ${CRYSTAL_COLOR.text};">
        <div class="card-meta">
          <span class="confidence">Confidence: ${(crystal.confidence * 100).toFixed(0)}%</span>
          <span class="category">Category: ${escapeHtml(crystal.category)}</span>
          <span class="timestamp">Formed: ${formatTimestamp(crystal.formedAt)}</span>
        </div>
        ${tagsHtml ? `<div class="tags-container">${tagsHtml}</div>` : ""}
      </div>
    </div>
  `;
}

/**
 * Generate layer section HTML
 */
function generateLayerSection(layer: MemoryLayer, memories: VizMemory[]): string {
  const colors = LAYER_COLORS[layer];
  if (memories.length === 0) {
    return `
      <div class="layer-section">
        <h3 style="color: ${colors.text}; border-bottom: 2px solid ${colors.border};">
          📦 ${colors.label} Layer
        </h3>
        <div class="empty-state">No memories in this layer yet</div>
      </div>
    `;
  }

  const memoriesHtml = memories
    .map((mem, idx) => generateMemoryCard(mem, idx))
    .join("");

  return `
    <div class="layer-section">
      <h3 style="color: ${colors.text}; border-bottom: 2px solid ${colors.border};">
        📦 ${colors.label} Layer (${memories.length})
      </h3>
      <div class="cards-container">
        ${memoriesHtml}
      </div>
    </div>
  `;
}

/**
 * Generate CSS styles (inlined)
 */
function generateCSS(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
      color: #333;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 60px 40px;
      text-align: center;
    }

    header h1 {
      font-size: 3em;
      margin-bottom: 10px;
      font-weight: 700;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
    }

    header p {
      font-size: 1.2em;
      opacity: 0.95;
      margin-bottom: 5px;
    }

    .stats-bar {
      background: rgba(255, 255, 255, 0.15);
      padding: 20px 40px;
      display: flex;
      justify-content: center;
      gap: 40px;
      flex-wrap: wrap;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }

    .stat-item {
      text-align: center;
      color: white;
    }

    .stat-item .number {
      font-size: 2em;
      font-weight: bold;
      display: block;
      margin-bottom: 5px;
    }

    .stat-item .label {
      font-size: 0.9em;
      opacity: 0.85;
    }

    main {
      padding: 40px;
    }

    .timeline {
      position: relative;
      padding: 20px 0;
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 3px;
      height: 100%;
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
      border-radius: 2px;
    }

    .layer-section {
      margin-bottom: 50px;
      animation: fadeIn 0.5s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .layer-section h3 {
      font-size: 1.5em;
      margin-bottom: 20px;
      padding-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .cards-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .memory-card,
    .crystal-card {
      border-radius: 8px;
      padding: 20px;
      background: white;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .memory-card:hover,
    .crystal-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .layer-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
    }

    .memory-id {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9em;
      opacity: 0.7;
    }

    .memory-age {
      font-size: 0.9em;
      opacity: 0.6;
      margin-left: auto;
    }

    .card-content {
      margin-bottom: 15px;
    }

    .memory-text {
      font-size: 1em;
      line-height: 1.6;
      margin-bottom: 10px;
      word-break: break-word;
    }

    .source-info,
    .evidence-list {
      font-size: 0.9em;
      opacity: 0.7;
      padding: 8px;
      background: rgba(0, 0, 0, 0.02);
      border-radius: 4px;
      margin-top: 8px;
      font-style: italic;
    }

    .card-footer {
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      padding-top: 12px;
      font-size: 0.85em;
    }

    .card-meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 10px;
      opacity: 0.75;
    }

    .importance,
    .confidence,
    .category,
    .timestamp,
    .compressed-at {
      font-size: 0.85em;
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .tag {
      display: inline-block;
      background: rgba(102, 126, 234, 0.1);
      color: #667eea;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 0.8em;
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #999;
      font-size: 1.1em;
      background: #f9f9f9;
      border-radius: 8px;
    }

    .crystals-section {
      margin-top: 60px;
      padding-top: 40px;
      border-top: 3px dashed #ddd;
    }

    .crystals-section h2 {
      font-size: 2em;
      color: #764ba2;
      margin-bottom: 30px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    footer {
      background: #f5f5f5;
      color: #666;
      text-align: center;
      padding: 20px;
      font-size: 0.9em;
      border-top: 1px solid #ddd;
    }

    .footer-link {
      color: #667eea;
      text-decoration: none;
    }

    .footer-link:hover {
      text-decoration: underline;
    }

    @media (max-width: 768px) {
      header h1 {
        font-size: 2em;
      }

      .stats-bar {
        gap: 20px;
      }

      main {
        padding: 20px;
      }

      .cards-container {
        grid-template-columns: 1fr;
      }

      .timeline::before {
        display: none;
      }
    }
  `;
}

/**
 * Generate JavaScript for interactivity (inlined)
 */
function generateJS(): string {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      // Filter functionality
      const layerButtons = document.querySelectorAll('[data-layer]');
      const cards = document.querySelectorAll('[data-card-layer]');
      
      layerButtons.forEach(btn => {
        btn.addEventListener('click', function() {
          const layer = this.getAttribute('data-layer');
          
          layerButtons.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          
          cards.forEach(card => {
            if (layer === 'all' || card.getAttribute('data-card-layer') === layer) {
              card.style.display = '';
            } else {
              card.style.display = 'none';
            }
          });
        });
      });

      // Search functionality
      const searchInput = document.getElementById('search-box');
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          const query = this.value.toLowerCase();
          cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query) ? '' : 'none';
          });
        });
      }

      // Scroll animations
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }
        });
      });

      document.querySelectorAll('.memory-card, .crystal-card').forEach(card => {
        observer.observe(card);
      });
    });
  `;
}

/**
 * Main function: Generate complete HTML visualization
 */
export function generateHTML(store: MemoryStore, opts?: GenerateHTMLOptions): string {
  const title = opts?.title || "Temporal Crystal Memory Visualization";
  const description = opts?.description || "An interactive timeline of memories across all layers";

  // Collect all memories from each layer with age information
  const rawMemories: VizMemory[] = store.listLayer(MemoryLayer.RAW).map((m) => {
    const age = calculateAge(m.createdAt);
    return { ...m, ageHours: age.hours, ageDays: age.days };
  });

  const compressedMemories: VizMemory[] = store.listLayer(MemoryLayer.COMPRESSED).map((m) => {
    const age = calculateAge(m.createdAt);
    return { ...m, ageHours: age.hours, ageDays: age.days };
  });

  const abstractMemories: VizMemory[] = store.listLayer(MemoryLayer.ABSTRACT).map((m) => {
    const age = calculateAge(m.createdAt);
    return { ...m, ageHours: age.hours, ageDays: age.days };
  });

  const crystalMemories: VizMemory[] = store.listLayer(MemoryLayer.CRYSTAL).map((m) => {
    const age = calculateAge(m.createdAt);
    return { ...m, ageHours: age.hours, ageDays: age.days };
  });

  const crystals: VizCrystal[] = store.listCrystals().map((c) => {
    const age = calculateAge(c.formedAt);
    return { ...c, ageHours: age.hours, ageDays: age.days };
  });

  // Calculate statistics
  const stats = store.stats();
  const totalMemories =
    rawMemories.length + compressedMemories.length + abstractMemories.length + crystalMemories.length;

  // Generate sections
  const layerSections = [
    generateLayerSection(MemoryLayer.RAW, rawMemories),
    generateLayerSection(MemoryLayer.COMPRESSED, compressedMemories),
    generateLayerSection(MemoryLayer.ABSTRACT, abstractMemories),
    generateLayerSection(MemoryLayer.CRYSTAL, crystalMemories),
  ].join("");

  const crystalsSection =
    crystals.length > 0
      ? `
    <div class="crystals-section">
      <h2>💎 Crystals (Permanent Insights)</h2>
      <div class="cards-container">
        ${crystals.map((c) => generateCrystalCard(c)).join("")}
      </div>
    </div>
  `
      : "";

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    ${generateCSS()}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>✨ Temporal Crystal Memory</h1>
      <p>${escapeHtml(description)}</p>
    </header>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="number">${totalMemories}</span>
        <span class="label">Total Memories</span>
      </div>
      <div class="stat-item">
        <span class="number">${rawMemories.length}</span>
        <span class="label">Raw Layer</span>
      </div>
      <div class="stat-item">
        <span class="number">${compressedMemories.length}</span>
        <span class="label">Compressed</span>
      </div>
      <div class="stat-item">
        <span class="number">${abstractMemories.length}</span>
        <span class="label">Abstract</span>
      </div>
      <div class="stat-item">
        <span class="number">${crystalMemories.length}</span>
        <span class="label">Crystal</span>
      </div>
      <div class="stat-item">
        <span class="number">${crystals.length}</span>
        <span class="label">Insights</span>
      </div>
    </div>

    <main>
      <div class="timeline">
        ${layerSections}
      </div>
      ${crystalsSection}
    </main>

    <footer>
      <p>Generated by Temporal Crystal Memory • ${new Date().toLocaleString("zh-CN")}</p>
    </footer>
  </div>

  <script>
    ${generateJS()}
  </script>
</body>
</html>
`;

  return html;
}
