/**
 * Signnith On-Demand News Finder
 * Frontend Business Logic & UI Orchestration
 */

// --- Constants & State ---
const STORAGE_KEY = 'signnith_news_finder_history';
let searchHistory = [];

// --- API Configuration for Serverless edge ---
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? ''
  : 'https://newsfinder.drbrookskim.workers.dev'; // 💡 Replace with your actual Cloudflare Worker URL after deployment!

// DOM Elements
const searchForm = document.getElementById('search-form');
const companyInput = document.getElementById('company-input');
const clearInputBtn = document.getElementById('clear-input');
const submitBtn = document.getElementById('submit-btn');

// Panels
const idlePanel = document.getElementById('idle-panel');
const loadingPanel = document.getElementById('loading-panel');
const resultsPanel = document.getElementById('results-panel');
const errorPanel = document.getElementById('error-panel');

// Loading state elements
const loadingTitle = document.getElementById('loading-title');
const loadingDesc = document.getElementById('loading-desc');
const stepSearch = document.getElementById('step-search');
const stepAnalyze = document.getElementById('step-analyze');
const stepRender = document.getElementById('step-render');

// Result elements
const resultCompanyName = document.getElementById('result-company-name');
const marketImpactBadge = document.getElementById('market-impact-badge');
const insightMarkdown = document.getElementById('insight-markdown');
const sourcesContainer = document.getElementById('sources-container');
const sourcesPanel = document.querySelector('.sources-panel');

// Sidebar and controls
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');
const retryBtn = document.getElementById('retry-btn');
const trendingTags = document.querySelectorAll('.trending-tag-btn');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  setupEventListeners();
  companyInput.focus();
});

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Input clear button behavior
  companyInput.addEventListener('input', () => {
    if (companyInput.value.trim().length > 0) {
      clearInputBtn.style.display = 'flex';
    } else {
      clearInputBtn.style.display = 'none';
    }
  });

  clearInputBtn.addEventListener('click', () => {
    companyInput.value = '';
    clearInputBtn.style.display = 'none';
    companyInput.focus();
  });

  // Submit search query
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = companyInput.value.trim();
    if (query) {
      performAnalysis(query);
    }
  });

  // Trending tags click behavior
  trendingTags.forEach(btn => {
    btn.addEventListener('click', () => {
      const company = btn.getAttribute('data-company');
      companyInput.value = company;
      clearInputBtn.style.display = 'flex';
      performAnalysis(company);
    });
  });

  // History action events
  clearHistoryBtn.addEventListener('click', clearAllHistory);

  // Error panel retry
  retryBtn.addEventListener('click', () => {
    const query = companyInput.value.trim();
    if (query) {
      performAnalysis(query);
    } else {
      switchPanel('idle');
    }
  });
}

// --- Navigation & Panel Orchestration ---
function switchPanel(panelName) {
  // Hide all panels
  idlePanel.classList.remove('active');
  loadingPanel.classList.remove('active');
  resultsPanel.classList.remove('active');
  errorPanel.classList.remove('active');

  // Activate chosen panel
  if (panelName === 'idle') {
    idlePanel.classList.add('active');
  } else if (panelName === 'loading') {
    loadingPanel.classList.add('active');
  } else if (panelName === 'results') {
    resultsPanel.classList.add('active');
  } else if (panelName === 'error') {
    errorPanel.classList.add('active');
  }
}

// --- Search & Analysis Execution ---
async function performAnalysis(companyName) {
  if (!companyName) return;

  // Toggle UI state to loading
  switchPanel('loading');
  submitBtn.disabled = true;
  companyInput.disabled = true;

  // Initialize timeline loading steps
  updateLoadingStep('search');

  // Dynamic timing updates to simulate active processes for better UX
  let stepTimeout1, stepTimeout2;
  
  stepTimeout1 = setTimeout(() => {
    updateLoadingStep('analyze');
  }, 1800);

  stepTimeout2 = setTimeout(() => {
    updateLoadingStep('render');
  }, 3800);

  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyName }),
    });

    // Clear loading timeouts
    clearTimeout(stepTimeout1);
    clearTimeout(stepTimeout2);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || '분석 중 실패했습니다.');
    }

    const data = await response.json();

    // Render results
    renderResults(companyName, data);
    
    // Save to history
    saveToHistory(companyName);

    // Swap panel to results
    switchPanel('results');

  } catch (error) {
    console.error('Analysis failed:', error);
    document.getElementById('error-desc').textContent = error.message || '네트워크 문제 혹은 일시적인 서버 통신 지연이 일어났습니다.';
    switchPanel('error');
  } finally {
    submitBtn.disabled = false;
    companyInput.disabled = false;
  }
}

// --- Loading Panel Progressive Control ---
function updateLoadingStep(step) {
  // Reset timeline classes
  stepSearch.classList.remove('active', 'completed');
  stepAnalyze.classList.remove('active', 'completed');
  stepRender.classList.remove('active', 'completed');

  if (step === 'search') {
    stepSearch.classList.add('active');
    loadingTitle.textContent = '실시간 뉴스 검색 중...';
    loadingDesc.textContent = '구글 뉴스 검색 API를 통해 최신 48시간 이내 소식들을 긁어오고 있습니다.';
  } else if (step === 'analyze') {
    stepSearch.classList.add('completed');
    stepAnalyze.classList.add('active');
    loadingTitle.textContent = '금융 전문 AI 뉴스 분석 중...';
    loadingDesc.textContent = 'Gemini 2.0 Flash가 관련 뉴스를 기반으로 시장 영향 및 리스크를 검토하고 있습니다.';
  } else if (step === 'render') {
    stepSearch.classList.add('completed');
    stepAnalyze.classList.add('completed');
    stepRender.classList.add('active');
    loadingTitle.textContent = '인사이트 도출 및 정리 중...';
    loadingDesc.textContent = '분석된 데이터를 마크다운 포맷으로 가공하여 대시보드 템플릿에 맞추는 중입니다.';
  }
}

// --- Results Rendering ---
function renderResults(companyName, data) {
  // Update header metadata
  resultCompanyName.textContent = companyName;

  // Process and detect market impact from the insight content
  const insightText = data.insight || '';
  const impact = detectMarketImpact(insightText);
  updateImpactBadge(impact);

  // Update tech badge with the actually used model
  if (data.modelUsed) {
    const modelLabel = formatModelName(data.modelUsed);
    const techBadgeText = document.querySelector('.tech-badge span:last-child');
    if (techBadgeText) {
      techBadgeText.textContent = `${modelLabel} Active`;
    }
  }

  // Parse and display markdown body
  insightMarkdown.innerHTML = customMarkdownParser(insightText);

  // Render sources grid
  renderSources(data.sources);
}

// Helper to format model name nicely
function formatModelName(modelName) {
  if (modelName === 'gemini-3.5-flash') return 'Gemini 3.5 Flash';
  if (modelName === 'gemini-2.0-flash') return 'Gemini 2.0 Flash';
  if (modelName === 'gemini-1.5-flash') return 'Gemini 1.5 Flash';
  if (modelName === 'gemini-1.5-pro') return 'Gemini 1.5 Pro';
  return modelName;
}

// Extract market impact classification from AI response
function detectMarketImpact(text) {
  const cleanText = text.toLowerCase();
  
  if (cleanText.includes('시장 영향: 긍정적') || cleanText.includes('전체 시장 영향: 긍정적') || cleanText.includes('시장 영향 카테고리: 긍정적') || cleanText.includes('긍정적')) {
    // Basic verification: since "긍정적" might be referenced elsewhere, let's look closer
    // If "긍정적" appears within the "시장 영향 분석" segment
    if (cleanText.indexOf('긍정적') < cleanText.indexOf('투자자 인사이트')) {
      return 'positive';
    }
  }
  if (cleanText.includes('시장 영향: 우려됨') || cleanText.includes('전체 시장 영향: 우려됨') || cleanText.includes('우려됨') || cleanText.includes('부정적')) {
    if (cleanText.indexOf('우려됨') < cleanText.indexOf('투자자 인사이트') || cleanText.indexOf('부정적') < cleanText.indexOf('투자자 인사이트')) {
      return 'concern';
    }
  }
  
  // Default fallback is neutral
  return 'neutral';
}

function updateImpactBadge(impact) {
  // Reset badge classes
  marketImpactBadge.className = 'impact-badge';
  
  if (impact === 'positive') {
    marketImpactBadge.classList.add('impact-positive');
    marketImpactBadge.textContent = '긍정적 (Positive)';
  } else if (impact === 'concern') {
    marketImpactBadge.classList.add('impact-concern');
    marketImpactBadge.textContent = '우려됨 (Concern)';
  } else {
    marketImpactBadge.classList.add('impact-neutral');
    marketImpactBadge.textContent = '중립적 (Neutral)';
  }
}

// Custom Markdown Compiler (Vanilla JS, Regex based)
function customMarkdownParser(markdown) {
  let html = markdown.trim();

  // Escape HTML entities to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings: ## Heading Title
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');

  // Headings: ### Small Title
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');

  // Bullet items: - **Title**: description or - list item
  // Replace list items first
  html = html.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');

  // Group continuous <li> items into <ul>
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  
  // Clean up nested <ul> that might get created by mistake in regex
  // (Simple grouping regex ensures they are placed neatly)

  // Bold tags: **bold text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Handle line breaks inside paragraphs
  html = html.split('\n\n').map(paragraph => {
    if (paragraph.trim().startsWith('<h') || paragraph.trim().startsWith('<ul') || paragraph.trim().startsWith('<li')) {
      return paragraph; // Keep structures intact
    }
    return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

// Render grounding news sources cards
function renderSources(sources) {
  sourcesContainer.innerHTML = '';
  
  if (!sources || !Array.isArray(sources) || sources.length === 0) {
    sourcesPanel.style.display = 'none';
    return;
  }

  sourcesPanel.style.display = 'block';

  // Remove duplicate URLs to clean up the output
  const uniqueSources = [];
  const seenUrls = new Set();
  
  sources.forEach(src => {
    if (src.url && !seenUrls.has(src.url)) {
      seenUrls.add(src.url);
      uniqueSources.push(src);
    }
  });

  uniqueSources.forEach(source => {
    const domain = extractDomain(source.url);
    
    const card = document.createElement('a');
    card.className = 'source-card';
    card.href = source.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    
    card.innerHTML = `
      <span class="source-title" title="${source.title}">${source.title}</span>
      <span class="source-domain">${domain}</span>
    `;
    
    sourcesContainer.appendChild(card);
  });
}

// Helper to extract cleanly readable domain from URL
function extractDomain(urlStr) {
  try {
    const url = new URL(urlStr);
    let hostname = url.hostname;
    
    // Strip common www prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch (e) {
    return '원본 기사 링크';
  }
}

// --- History Storage & Sidebar List ---
function loadHistory() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (rawData) {
      searchHistory = JSON.parse(rawData);
    }
  } catch (e) {
    console.error('Failed to load search history:', e);
    searchHistory = [];
  }
  renderHistoryUI();
}

function saveToHistory(companyName) {
  const timestamp = new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Filter out existing searches of the same company to move it to top
  searchHistory = searchHistory.filter(item => item.name.toLowerCase() !== companyName.toLowerCase());
  
  // Add new item to front of array
  searchHistory.unshift({
    name: companyName,
    time: timestamp
  });

  // Limit to maximum 10 items
  if (searchHistory.length > 10) {
    searchHistory.pop();
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searchHistory));
  } catch (e) {
    console.error('Failed to write history to storage:', e);
  }

  renderHistoryUI();
}

function renderHistoryUI() {
  historyList.innerHTML = '';

  if (searchHistory.length === 0) {
    historyList.innerHTML = '<li class="history-empty">이력이 존재하지 않습니다</li>';
    return;
  }

  searchHistory.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    
    li.innerHTML = `
      <span class="history-name">${item.name}</span>
      <span class="history-time">${item.time}</span>
      <button class="delete-history-btn" aria-label="이 항목 지우기" data-index="${index}">&times;</button>
    `;

    // Clicking the item triggers a new search
    li.addEventListener('click', (e) => {
      // Prevent triggering if clicked on the delete button
      if (e.target.classList.contains('delete-history-btn')) {
        return;
      }
      companyInput.value = item.name;
      clearInputBtn.style.display = 'flex';
      performAnalysis(item.name);
    });

    // Delete single history item
    const deleteBtn = li.querySelector('.delete-history-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHistoryItem(index);
    });

    historyList.appendChild(li);
  });
}

function deleteHistoryItem(index) {
  searchHistory.splice(index, 1);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searchHistory));
  } catch (e) {
    console.error('Failed to update history in storage:', e);
  }
  renderHistoryUI();
}

function clearAllHistory() {
  searchHistory = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear history from storage:', e);
  }
  renderHistoryUI();
}
