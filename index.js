import Hls from 'hls.js';

const video = document.getElementById('video');
const channelsDiv = document.getElementById('channels');
const statusDiv = document.getElementById('status');
const input = document.getElementById('m3uInput');
const loadBtn = document.getElementById('loadBtn');
let hls = null;

function setStatus(msg) { statusDiv.textContent = msg; }

function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const channels = [];
  let name = 'Channel';
  let logo = '';
  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const nameMatch = line.match(/,(.*)$/);
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      name = nameMatch ? nameMatch[1].trim() : 'Channel';
      logo = logoMatch ? logoMatch[1] : '';
    } else if (line && !line.startsWith('#')) {
      channels.push({ name, logo, url: line.trim() });
    }
  }
  return channels;
}

function play(url) {
  setStatus('Loading stream...');
  if (hls) { hls.destroy(); hls = null; }

  if (window.webapis && window.webapis.avplay) {
    try {
      webapis.avplay.close();
      webapis.avplay.open(url);
      webapis.avplay.setDisplayRect(320, 0, 960, 720);
      webapis.avplay.prepareAsync(() => {
        webapis.avplay.play();
        setStatus('Playing with AVPlay');
      }, err => setStatus('AVPlay error: ' + JSON.stringify(err)));
      return;
    } catch (e) {
      setStatus('AVPlay failed, trying HTML5...');
    }
  }

  if (Hls.isSupported() && url.includes('.m3u8')) {
    hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    setStatus('Playing with hls.js');
  } else {
    video.src = url;
    video.play().then(() => setStatus('Playing with HTML5')).catch(e => setStatus('Play failed: ' + e.message));
  }
}

async function loadPlaylist() {
  const url = input.value.trim();
  if (!url) return setStatus('Paste M3U URL first');
  setStatus('Fetching playlist...');
  try {
    const res = await fetch(url);
    const text = await res.text();
    const channels = parseM3U(text);
    channelsDiv.innerHTML = '';
    channels.forEach((ch, i) => {
      const btn = document.createElement('button');
      btn.className = 'channel';
      btn.textContent = `${i + 1}. ${ch.name}`;
      btn.onclick = () => play(ch.url);
      channelsDiv.appendChild(btn);
    });
    setStatus(`Loaded ${channels.length} channels`);
  } catch (e) {
    setStatus('Playlist load failed: ' + e.message);
  }
}

loadBtn.onclick = loadPlaylist;
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.activeElement.click();
});
