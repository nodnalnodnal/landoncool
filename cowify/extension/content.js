// cowify: every image becomes a cow
(() => {
  const NAMES = ['cow', 'cow-0', 'cow-1', 'cow-2', 'cow-3', 'cow-4', 'cow-5', 'cow-6'];
  const COWS = NAMES.map(n => chrome.runtime.getURL(`cows/${n}.png`));
  const isCow = s => COWS.some(c => s && s.startsWith(c));
  // same image always gets the same cow, so lazy loaders don't flicker between cows
  const pick = key => {
    let h = 0;
    for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return COWS[Math.abs(h) % COWS.length];
  };

  function cowImg(img) {
    const orig = img.currentSrc || img.src || img.dataset.src || '';
    if (isCow(img.src) && !img.srcset) return;
    const cow = pick(orig || Math.random());
    // keep the layout the site expects
    if (img.width && img.height && !img.style.width) {
      img.style.width = img.width + 'px';
      img.style.height = img.height + 'px';
    }
    img.style.objectFit = 'contain';
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.src = cow;
    img.closest('picture')?.querySelectorAll('source').forEach(s => s.remove());
  }

  function cowBg(el) {
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none' || !bg.includes('url(') || bg.includes('gradient') || isCow(bg.slice(5))) return;
    const cow = pick(bg);
    el.style.setProperty('background-image', `url("${cow}")`, 'important');
    el.style.setProperty('background-size', 'contain', 'important');
    el.style.setProperty('background-repeat', 'no-repeat', 'important');
    el.style.setProperty('background-position', 'center', 'important');
  }

  function scan(root) {
    if (!(root instanceof Element)) return;
    if (root.tagName === 'IMG') cowImg(root);
    else if (root.tagName === 'VIDEO' && root.poster && !isCow(root.poster)) root.poster = pick(root.poster);
    cowBg(root);
    root.querySelectorAll('img').forEach(cowImg);
    root.querySelectorAll('video[poster]').forEach(v => { if (!isCow(v.poster)) v.poster = pick(v.poster); });
    root.querySelectorAll('[style*="background"], div, section, a, span, header, figure').forEach(cowBg);
  }

  function start() {
    scan(document.documentElement);
    new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'childList') m.addedNodes.forEach(scan);
        else if (m.target.tagName === 'IMG' && !isCow(m.target.src)) cowImg(m.target);
        else if (m.attributeName === 'style' || m.attributeName === 'class') cowBg(m.target);
      }
    }).observe(document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['src', 'srcset', 'style', 'class'],
    });
  }

  chrome.storage.local.get({ on: true }, ({ on }) => { if (on) start(); });
})();
