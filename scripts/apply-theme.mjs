// ========== 主题化脚本：给各独立工具页加 dark/light 双主题支持 ==========
// 策略：1) 加 anti-flash 内联脚本到 <head> 最前；2) 在 :root{...} 后追加 :root[data-theme="light"] 覆盖；3) 加切换按钮 + 逻辑。
// 不改动原页面任何样式——完全是附加层。
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, sep } from 'path';

const ROOT = join(import.meta.dirname, '..');

const ANTI_FLASH = `<script>/* theme anti-flash */
(function(){try{var sp=new URLSearchParams(location.search);var t=sp.get('theme')||localStorage.getItem('theme');if(t==='light'){document.documentElement.dataset.theme='light';}}catch(e){}})();
</script>
`;

const TOGGLE_CSS = `<style>
.theme-toggle{position:fixed;top:14px;right:14px;z-index:9999;width:36px;height:36px;border-radius:50%;border:1px solid rgba(128,128,128,.35);background:rgba(40,40,60,.75);color:#e0e0e0;backdrop-filter:blur(10px);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1;transition:transform .2s ease}
.theme-toggle:hover{transform:rotate(20deg)}
.theme-toggle .sun{display:none}.theme-toggle .moon{display:block}
:root[data-theme="light"] .theme-toggle{background:rgba(255,255,255,.9);color:#1a1a2e;border-color:rgba(0,0,0,.12)}
:root[data-theme="light"] .theme-toggle .sun{display:block}:root[data-theme="light"] .theme-toggle .moon{display:none}
</style>
`;

const TOGGLE_HTML = `<button class="theme-toggle" id="themeToggle" aria-label="切换主题" title="切换黑夜 / 白天">
  <span class="moon">☾</span><span class="sun">☀</span>
</button>
<script>(function(){var b=document.getElementById('themeToggle');if(b){b.addEventListener('click',function(){var d=document.documentElement;var isLight=d.dataset.theme==='light';if(isLight)delete d.dataset.theme;else d.dataset.theme='light';try{localStorage.setItem('theme',isLight?'dark':'light');}catch(e){}});}})();</script>
`;

// 每页的 light 主题变量覆盖块（integral / vectors / integral-exp 是 dark 默认，直接加 light 覆盖）
const PAGE_CONFIG = [
  {
    file: 'integral/index.html',
    strategy: 'append',  // 在 :root 后追加 light 覆盖
    lightVars: `:root[data-theme="light"]{
  --bg:#eef2f6;--bg2:#ffffff;--accent:#0088cc;--accent2:#7b2ff7;--text:#1a1a2e;--text2:#5a6572;--border:#c4cbd4;
}`
  },
  {
    file: 'vectors/index.html',
    strategy: 'append',
    lightVars: `:root[data-theme="light"]{
  --bg:#eef2f6;--panel:#ffffff;--accent:#0088cc;--text:#1a1a2e;--dim:#5a6572;--border:#c4cbd4;--err:#cc3333;--ok:#22aa44;--accent2:#cc8800;
}`
  },
  {
    file: 'integral-exp/index.html',
    strategy: 'append',
    lightVars: `:root[data-theme="light"]{
  --bg:#eef2f6;--card:rgba(255,255,255,.85);--card-solid:#ffffff;--line:rgba(0,0,0,.1);--line-strong:rgba(0,0,0,.22);--ink:#1a1a2e;--ink-dim:#5a6572;--ink-faint:#8899aa;
}`
  },
  {
    file: 'complex-calculator/index.html',
    strategy: 'replace',  // 现有 :root 是 light 默认，需要替换成 dual-theme（dark 默认 + light 覆盖）
    replacement: `:root{
  --ink:#e0e0e0;--muted:#8899aa;--line:#2a2a4a;--accent:#2563eb;--card:rgba(22,33,62,.6);--bg:#0f0f1e;
}
:root[data-theme="light"]{
  --ink:#1c2733;--muted:#5b6b7b;--line:#dfe5ea;--accent:#2563eb;--card:#ffffff;--bg:#eef2f6;
}`
  }
];

function findRootBlock(src) {
  // 匹配 :root{ ... } 直到第一个闭合 }（不嵌套）
  const re = /:root\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    // 从 { 的位置开始找对应的 }
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      if (depth === 0) {
        const endIdx = i;
        return { start: m.index, end: endIdx + 1, original: src.substring(m.index, endIdx + 1) };
      }
      i++;
    }
  }
  return null;
}

for (const cfg of PAGE_CONFIG) {
  const path = join(ROOT, cfg.file);
  if (!existsSync(path)) { console.log(`SKIP (not found): ${cfg.file}`); continue; }

  let src = readFileSync(path, 'utf-8');
  console.log(`\n=== ${cfg.file} ===`);

  // 1) Anti-flash (if not already present)
  if (!src.includes('anti-flash')) {
    src = src.replace(/<head>/, '<head>\n' + ANTI_FLASH);
    console.log('  + anti-flash script');
  }

  // 2) Theme variables
  const block = findRootBlock(src);
  if (!block) { console.log('  WARN: no :root block found'); }
  else {
    if (cfg.strategy === 'replace') {
      src = src.substring(0, block.start) + cfg.replacement + src.substring(block.end);
      console.log('  :root replaced with dual-theme block');
    } else if (cfg.strategy === 'append') {
      const newBlock = block.original + '\n\n' + cfg.lightVars;
      src = src.substring(0, block.start) + newBlock + src.substring(block.end);
      console.log('  light override appended after :root');
    }
  }

  // 3) Toggle (if not already present)
  if (!src.includes('theme-toggle')) {
    src = src.replace('</body>', TOGGLE_CSS + '\n' + TOGGLE_HTML + '\n</body>');
    console.log('  + toggle button + logic');
  }

  writeFileSync(path, src, 'utf-8');
  console.log(`  ✓ saved (${src.length} bytes)`);
}
console.log('\nALL DONE');
