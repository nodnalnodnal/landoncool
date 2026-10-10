const b = document.getElementById('t');
const show = on => { b.textContent = on ? 'cows: on' : 'cows: off'; b.className = on ? 'on' : ''; };
chrome.storage.local.get({ on: true }, ({ on }) => show(on));
b.onclick = () => chrome.storage.local.get({ on: true }, ({ on }) => {
  chrome.storage.local.set({ on: !on });
  show(!on);
  chrome.tabs.reload?.();
});
