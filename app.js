// Event Control Panel - app.js

// Time display
const timeEl = document.getElementById('time');
function updateTime(){
  const d=new Date();
  timeEl.textContent = d.toLocaleTimeString();
}
setInterval(updateTime,1000);
updateTime();

// State
let songs = [];
let currentSongIndex = -1;
let musicAudio = new Audio();
musicAudio.preload = 'auto';
let musicPlaying = false;
let musicLoop = false;

let media = [];
let currentMediaIndex = -1;
let displayWindow = null;
let mediaTimer = null;
let mediaPlaying = false;
let mediaLooping = false;
let mediaProgressInterval = null;

// Elements
const musicFiles = document.getElementById('musicFiles');
const musicQueue = document.getElementById('musicQueue');
const currentSongEl = document.getElementById('currentSong');
const musicPlay = document.getElementById('musicPlay');
const musicPause = document.getElementById('musicPause');
const musicLoopEl = document.getElementById('musicLoop');
const musicShuffleButton = document.getElementById('musicShuffle');

const mediaFiles = document.getElementById('mediaFiles');
const mediaQueue = document.getElementById('mediaQueue');
const currentMediaEl = document.getElementById('currentMedia');
const mediaPlay = document.getElementById('mediaPlay');
const mediaPause = document.getElementById('mediaPause');
const transitionTimeEl = document.getElementById('transitionTime');
const openDisplay = document.getElementById('openDisplay');
const mediaMirrorContent = document.getElementById('mediaMirrorContent');
const statusEl = document.getElementById('status');

const intercomToggle = document.getElementById('intercomToggle');
const inputDeviceSelect = document.getElementById('inputDeviceSelect');
const outputDeviceSelect = document.getElementById('outputDeviceSelect');
const masterVolume = document.getElementById('masterVolume');
const intercomVolume = document.getElementById('intercomVolume');
const pauseMusicDuring = document.getElementById('pauseMusicDuringAnnouncement');
const fadeMusic = document.getElementById('fadeMusic');

let selectedInputDeviceId = '';
let selectedOutputDeviceId = '';

async function refreshAudioDeviceLists(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter(d=>d.kind==='audioinput');
    const outputs = devices.filter(d=>d.kind==='audiooutput');

    const selectedInput = inputDeviceSelect.value || selectedInputDeviceId;
    const selectedOutput = outputDeviceSelect.value || selectedOutputDeviceId;

    inputDeviceSelect.innerHTML = '';
    inputs.forEach(device=>{
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Microphone ${inputDeviceSelect.length+1}`;
      inputDeviceSelect.appendChild(option);
    });

    outputDeviceSelect.innerHTML = '';
    outputs.forEach(device=>{
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Speaker ${outputDeviceSelect.length+1}`;
      outputDeviceSelect.appendChild(option);
    });

    if (selectedInput) inputDeviceSelect.value = selectedInput;
    if (selectedOutput) outputDeviceSelect.value = selectedOutput;
  } catch (err) {
    console.warn('Unable to enumerate devices:', err);
  }
}

if (navigator.mediaDevices && navigator.mediaDevices.addEventListener){
  navigator.mediaDevices.addEventListener('devicechange', refreshAudioDeviceLists);
}

inputDeviceSelect.addEventListener('change', ()=>{
  selectedInputDeviceId = inputDeviceSelect.value;
});
outputDeviceSelect.addEventListener('change', ()=>{
  selectedOutputDeviceId = outputDeviceSelect.value;
});

async function ensureDeviceAccess(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  try {
    await navigator.mediaDevices.getUserMedia({audio:true});
  } catch (err) {
    // ignore permission denial here; devices list may still show if previously granted
  }
  await refreshAudioDeviceLists();
}

// Master volume control
masterVolume.addEventListener('input', ()=>{
  const v = parseFloat(masterVolume.value);
  musicAudio.volume = v;
});

function formatDuration(seconds){
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Unknown';
  const minutes = Math.floor(seconds/60);
  const secs = Math.floor(seconds%60).toString().padStart(2,'0');
  return `${minutes}:${secs}`;
}

function loadFileMetadata(item, callback){
  if (item.type.startsWith('audio/')){
    const audio = new Audio();
    audio.src = item.url;
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', ()=>{
      item.duration = audio.duration;
      item.durationFormatted = formatDuration(audio.duration);
      callback();
    });
    audio.addEventListener('error', ()=>{ callback(); });
  } else if (item.type.startsWith('video/')){
    const video = document.createElement('video');
    video.src = item.url;
    video.preload = 'metadata';
    video.addEventListener('loadedmetadata', ()=>{
      item.duration = video.duration;
      item.durationFormatted = formatDuration(video.duration);
      callback();
    });
    video.addEventListener('error', ()=>{ callback(); });
  } else if (item.type.startsWith('image/')){
    item.pages = 1;
    callback();
  } else {
    callback();
  }
}

async function extractPdfPages(file){
  if (!window.pdfjsLib) throw new Error('pdfjsLib is unavailable');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.246/pdf.worker.min.js';
  pdfjsLib.disableWorker = true;
  const array = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({data:new Uint8Array(array)});
  const pdf = await loadingTask.promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++){
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({scale:1.5});
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({canvasContext:ctx, viewport}).promise;
    pages.push({
      name:`${file.name} - page ${pageNumber}`,
      url:canvas.toDataURL('image/jpeg',0.8),
      type:'image/pdf',
      source:'pdf',
      pageNumber,
      pages:pdf.numPages
    });
  }
  return pages;
}

const EMU_PER_PX = 9525;

function parseXmlString(xml){
  return new DOMParser().parseFromString(xml,'application/xml');
}

function setStatus(message){
  if (statusEl) statusEl.textContent = message;
}

function getElementsByTagNameAnyNS(parent, localName){
  const found = Array.from(parent.getElementsByTagName(localName));
  return found.length ? found : Array.from(parent.getElementsByTagNameNS('*', localName));
}

function getElementByTagNameAnyNS(parent, localName){
  const found = getElementsByTagNameAnyNS(parent, localName);
  return found[0] || null;
}

function normalizePptxPath(base, relative){
  const parts = base.split('/');
  if (parts.length && !base.endsWith('/')) parts.pop();
  for (const segment of relative.split('/')){
    if (segment === '..') parts.pop();
    else if (segment && segment !== '.') parts.push(segment);
  }
  return parts.join('/');
}

function emuToPx(value){
  return Math.round((parseInt(value,10) || 0) / EMU_PER_PX);
}

function getColorFromNode(node){
  if (!node) return null;
  const srgb = node.querySelector('a\:srgbClr, srgbClr');
  if (srgb?.getAttribute('val')) return `#${srgb.getAttribute('val')}`;
  const scheme = node.querySelector('a\:schemeClr, schemeClr');
  const val = scheme?.getAttribute('val');
  if (val === 'bg1') return '#111';
  if (val === 'tx1') return '#eee';
  if (val === 'accent1') return '#7a4fff';
  return null;
}

function getSolidFillColor(node){
  if (!node) return null;
  const solidFill = getElementByTagNameAnyNS(node, 'solidFill');
  return getColorFromNode(solidFill);
}

async function getBackgroundImage(srcTarget, zip){
  if (!srcTarget) return null;
  const targetPath = srcTarget.replace(/^\//,'');
  const file = zip.file(targetPath);
  if (!file) return null;
  const ext = targetPath.split('.').pop().toLowerCase();
  const data = await file.async('base64');
  return `data:image/${ext === 'emf' ? 'png' : ext};base64,${data}`;
}

function getShapeBounds(node){
  const xfrm = getElementByTagNameAnyNS(node, 'xfrm');
  if (!xfrm) return null;
  const off = getElementByTagNameAnyNS(xfrm, 'off');
  const ext = getElementByTagNameAnyNS(xfrm, 'ext');
  if (!off || !ext) return null;
  return {
    x: emuToPx(off.getAttribute('x')),
    y: emuToPx(off.getAttribute('y')),
    width: emuToPx(ext.getAttribute('cx')),
    height: emuToPx(ext.getAttribute('cy'))
  };
}

function getSlideBackgroundColor(doc){
  const bg = getElementByTagNameAnyNS(doc, 'bg');
  if (!bg) return '#111';
  const fill = getElementByTagNameAnyNS(bg, 'solidFill');
  const color = getColorFromNode(fill);
  return color || '#111';
}

function collectSlideText(node){
  return getElementsByTagNameAnyNS(node, 't').map(t=>t.textContent || '').join(' ').trim();
}

async function createImageFromZip(zip, target){
  const file = zip.file(target);
  if (!file) return null;
  const ext = target.split('.').pop().toLowerCase();
  const data = await file.async('base64');
  return `data:image/${ext === 'emf' ? 'png' : ext};base64,${data}`;
}

async function extractPptxSlides(file){
  if (!window.JSZip) throw new Error('JSZip is unavailable');
  const zip = await JSZip.loadAsync(file);
  const presFile = zip.file('ppt/presentation.xml');
  if (!presFile) throw new Error('presentation.xml missing');
  const presXml = await presFile.async('string');
  const presDoc = parseXmlString(presXml);
  let slideRefs = getElementsByTagNameAnyNS(presDoc, 'sldId').map(node => node.getAttribute('r:id')).filter(Boolean);
  if (!slideRefs.length) {
    slideRefs = Array.from(presXml.matchAll(/<p:sldId[^>]+r:id="([^"]+)"/g), m => m[1]);
  }
  const relsFile = zip.file('ppt/_rels/presentation.xml.rels');
  if (!relsFile) throw new Error('presentation rels missing');
  const relsXml = await relsFile.async('string');
  const relsDoc = parseXmlString(relsXml);
  const items = [];

  for (let i=0;i<slideRefs.length;i++){
    const relId = slideRefs[i];
    let rel = Array.from(getElementsByTagNameAnyNS(relsDoc, 'Relationship')).find(node => node.getAttribute('Id') === relId);
    if (!rel) {
      const relMatch = new RegExp(`<Relationship[^>]+Id="${relId}"[^>]+Target="([^"]+)"`).exec(relsXml);
      if (relMatch) {
        const stub = document.createElement('div');
        stub.setAttribute('Id', relId);
        stub.setAttribute('Target', relMatch[1]);
        rel = stub;
      }
    }
    if (!rel) continue;
    const target = rel.getAttribute('Target').replace(/^\//,'');
    const slideFile = zip.file(`ppt/${target}`);
    if (!slideFile) continue;
    const slideXml = await slideFile.async('string');
    const slideDoc = parseXmlString(slideXml);
    const relsPath = target.replace(/[^/]+$/, '_rels/$&.rels').replace(/\.xml$/, '.xml.rels');
    const slideRelFile = zip.file(`ppt/${relsPath}`);
    const slideRelsXml = slideRelFile ? await slideRelFile.async('string').catch(()=>null) : null;
    const slideRelsDoc = slideRelsXml ? parseXmlString(slideRelsXml) : null;
    const imagePromises = [];
    const width = 1280;
    const height = 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const bg = getElementByTagNameAnyNS(slideDoc, 'bg');
    const bgBlip = bg ? getElementByTagNameAnyNS(bg, 'blip') : null;
    let backgroundDrawn = false;
    if (bgBlip && slideRelsDoc) {
      const embed = bgBlip.getAttribute('r:id');
      if (embed) {
        const bgRel = Array.from(getElementsByTagNameAnyNS(slideRelsDoc, 'Relationship')).find(node => node.getAttribute('Id') === embed);
        if (bgRel) {
          const targetImage = bgRel.getAttribute('Target').replace(/^\//,'');
          const bgTarget = targetImage.startsWith('ppt/') ? targetImage : normalizePptxPath(`ppt/${target}`, targetImage);
          const src = await createImageFromZip(zip, bgTarget);
          if (src) {
            await new Promise(resolve => {
              const img = new Image();
              img.onload = ()=>{ ctx.drawImage(img, 0, 0, width, height); resolve(); };
              img.onerror = ()=> resolve();
              img.src = src;
            });
            backgroundDrawn = true;
          }
        }
      }
    }
    if (!backgroundDrawn) {
      ctx.fillStyle = getSlideBackgroundColor(slideDoc);
      ctx.fillRect(0,0,width,height);
    }

    if (slideRelsDoc) {
      const picNodes = getElementsByTagNameAnyNS(slideDoc, 'pic');
      picNodes.forEach(pic => {
        const blip = getElementByTagNameAnyNS(pic, 'blip');
        const bounds = getShapeBounds(pic);
        if (!blip || !bounds) return;
        const embed = blip.getAttribute('r:id');
        if (!embed) return;
        const picRel = Array.from(getElementsByTagNameAnyNS(slideRelsDoc, 'Relationship')).find(node => node.getAttribute('Id') === embed);
        if (!picRel) return;
        const targetImage = picRel.getAttribute('Target').replace(/^\//,'');
        const imageTarget = targetImage.startsWith('ppt/') ? targetImage : normalizePptxPath(`ppt/${target}`, targetImage);
        imagePromises.push(createImageFromZip(zip,imageTarget).then(src=>{
          if (!src) return;
          return new Promise(resolve => {
            const img = new Image();
            img.onload = ()=>{ ctx.drawImage(img,bounds.x,bounds.y,bounds.width,bounds.height); resolve(); };
            img.onerror = ()=> resolve();
            img.src = src;
          });
        }));
      });
    }

    await Promise.all(imagePromises);

    const shapes = getElementsByTagNameAnyNS(slideDoc, 'sp');
    shapes.forEach(shape => {
      const bounds = getShapeBounds(shape) || {x:40,y:40,width:width-80,height:height-80};
      const fillColor = getSolidFillColor(shape);
      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
      const text = collectSlideText(shape);
      if (!text) return;
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 30px system-ui';
      const words = text.split(/\s+/);
      const lineHeight = 34;
      let line = '';
      let y = bounds.y + 10;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > bounds.width - 20 && line) {
          ctx.fillText(line, bounds.x + 10, y);
          line = word;
          y += lineHeight;
          if (y > bounds.y + bounds.height - lineHeight - 10) break;
        } else {
          line = test;
        }
      }
      if (line && y <= bounds.y + bounds.height - lineHeight - 10) ctx.fillText(line, bounds.x + 10, y);
    });

    items.push({
      name:`${file.name} - slide ${i+1}`,
      url:canvas.toDataURL('image/png'),
      type:'image/pptx',
      source:'pptx',
      pageNumber:i+1,
      pages:slideRefs.length
    });
  }
  return items;
}

async function processMediaFile(file){
  const lower = file.name.toLowerCase();
  try {
    if (lower.endsWith('.pdf')){
      setStatus(`Loading PDF: ${file.name}`);
      const pages = await extractPdfPages(file);
      if (pages.length){
        media.push(...pages);
      } else {
        console.warn('PDF extraction produced no pages for', file.name);
        media.push({name:file.name,type:'image/pdf',url:'',source:'pdf',pageNumber:0,pages:0});
      }
      renderQueues();
    } else if (lower.endsWith('.pptx')){
      setStatus(`Loading PPTX: ${file.name}`);
      const slides = await extractPptxSlides(file);
      if (slides.length){
        media.push(...slides);
      } else {
        console.warn('PPTX extraction produced no slides for', file.name);
        media.push({name:file.name,type:'image/pptx',url:'',source:'pptx',pageNumber:0,pages:0});
      }
      renderQueues();
    } else {
      const url = URL.createObjectURL(file);
      const item = {name:file.name,url,type:file.type,file:file,durationFormatted:'Loading...',pages:1};
      media.push(item);
      loadFileMetadata(item, renderQueues);
      renderQueues();
    }
  } catch (error) {
    console.error('Media processing failed for', file.name, error);
    setStatus(`Failed to load ${file.name}: ${error.message || 'unknown error'}`);
    const fallback = {name:`${file.name} (failed)`,url:'',type:'error',source:'error',pageNumber:0,pages:0};
    media.push(fallback);
    renderQueues();
  } finally {
    setTimeout(()=> setStatus(''), 4000);
  }
}

function createListItem(item, index, type){
  const li = document.createElement('li');
  li.dataset.index = index;
  li.classList.toggle('active', index === (type === 'music'? currentSongIndex : currentMediaIndex));

  const underlay = document.createElement('div');
  underlay.className = 'progress-underlay';
  li.appendChild(underlay);

  const content = document.createElement('div');
  content.className = 'item-content';

  const info = document.createElement('div');
  info.className = 'item-info';
  const title = document.createElement('div');
  title.textContent = item.name;
  title.style.fontWeight = '700';
  const details = document.createElement('div');
  details.className = 'detail-group';
  const typeText = document.createElement('span');
  if (item.type.startsWith('audio/')) {
    typeText.textContent = item.durationFormatted || 'Loading...';
  } else if (item.type.startsWith('video/')) {
    typeText.textContent = item.durationFormatted || 'Loading...';
  } else if (item.source === 'pdf') {
    typeText.textContent = `Page ${item.pageNumber}/${item.pages}`;
  } else if (item.source === 'pptx') {
    typeText.textContent = `Slide ${item.pageNumber}/${item.pages}`;
  } else if (item.pages) {
    typeText.textContent = `${item.pages} slide${item.pages===1?'':'s'}`;
  } else {
    typeText.textContent = 'Image';
  }
  details.appendChild(typeText);
  info.appendChild(title);
  info.appendChild(details);

  const actions = document.createElement('div');
  actions.className = 'item-actions';
  const up = document.createElement('button'); up.textContent = '↑';
  const down = document.createElement('button'); down.textContent = '↓';
  const remove = document.createElement('button'); remove.textContent = 'Delete';
  up.addEventListener('click', e=>{ e.stopPropagation(); moveItem(type, index, -1); });
  down.addEventListener('click', e=>{ e.stopPropagation(); moveItem(type, index, 1); });
  remove.addEventListener('click', e=>{ e.stopPropagation(); removeItem(type, index); });
  actions.append(up, down, remove);

  content.append(info, actions);
  li.appendChild(content);

  li.addEventListener('click', ()=>{
    if (type === 'music') playSongAt(index);
    else showMediaAt(index);
  });

  return li;
}

function moveItem(type, index, offset){
  const list = type === 'music' ? songs : media;
  let currentIndex = type === 'music' ? currentSongIndex : currentMediaIndex;
  const newIndex = index + offset;
  if (newIndex < 0 || newIndex >= list.length) return;
  const [item] = list.splice(index, 1);
  list.splice(newIndex, 0, item);
  if (currentIndex === index) {
    currentIndex = newIndex;
  } else if (currentIndex > index && currentIndex <= newIndex) {
    currentIndex -= 1;
  } else if (currentIndex < index && currentIndex >= newIndex) {
    currentIndex += 1;
  }
  if (type === 'music') currentSongIndex = currentIndex;
  else currentMediaIndex = currentIndex;
  renderQueues();
}

function removeItem(type, index){
  const list = type === 'music' ? songs : media;
  const currentIndex = type === 'music' ? currentSongIndex : currentMediaIndex;
  list.splice(index, 1);
  if (type === 'music') {
    if (currentIndex === index) { musicAudio.pause(); musicPlaying = false; currentSongIndex = -1; }
    else if (currentIndex > index) currentSongIndex--;
  } else {
    if (currentIndex === index) { stopMediaLoop(); currentMediaIndex = -1; }
    else if (currentIndex > index) currentMediaIndex--;
  }
  renderQueues();
}

function renderQueues(){
  renderMusicQueue();
  renderMediaQueue();
}

musicFiles.addEventListener('change', e=>{
  const files = Array.from(e.target.files);
  files.forEach(f=>{
    const url = URL.createObjectURL(f);
    const item = {name:f.name,url,type:f.type,file:f, durationFormatted:'Loading...'};
    songs.push(item);
    loadFileMetadata(item, renderQueues);
  });
  renderQueues();
});

function renderMusicQueue(){
  musicQueue.innerHTML = '';
  songs.forEach((s,i)=>{
    const li = createListItem(s,i,'music');
    musicQueue.appendChild(li);
  });
  updateQueueProgress('music');
}

function playSongAt(i){
  if (i<0 || i>=songs.length) return;
  currentSongIndex = i;
  musicAudio.src = songs[i].url;
  musicAudio.play();
  musicPlaying = true;
  updateMusicUI();
  updateButtonStates();
}

musicPlay.addEventListener('click', ()=>{
  if (currentSongIndex===-1 && songs.length) playSongAt(0);
  else musicAudio.play();
  musicPlaying = true;
  updateMusicUI();
  updateButtonStates();
});
musicPause.addEventListener('click', ()=>{ musicAudio.pause(); musicPlaying=false; updateButtonStates(); });
musicLoopEl.addEventListener('change', ()=> musicLoop = musicLoopEl.checked);
musicShuffleButton.addEventListener('click', ()=>{
  const currentSong = songs[currentSongIndex];
  songs = songs.sort(()=>Math.random()-0.5);
  currentSongIndex = currentSong ? songs.indexOf(currentSong) : -1;
  renderMusicQueue();
});

musicAudio.addEventListener('timeupdate', ()=>{
  updateQueueProgress('music');
});

musicAudio.addEventListener('ended', ()=>{
  if (musicLoop){ musicAudio.currentTime = 0; musicAudio.play(); return; }
  const next = currentSongIndex+1;
  if (next < songs.length) playSongAt(next);
  else { musicPlaying=false; updateMusicUI(); updateButtonStates(); }
});

musicAudio.addEventListener('play', ()=>{ updateMusicUI(); updateButtonStates(); });
musicAudio.addEventListener('pause', ()=>{ updateMusicUI(); updateButtonStates(); });

function updateMusicUI(){
  currentSongEl.textContent = (currentSongIndex>=0 && songs[currentSongIndex])? songs[currentSongIndex].name : 'No song';
  const lis = musicQueue.querySelectorAll('li');
  lis.forEach(li=> li.classList.toggle('active', parseInt(li.dataset.index)===currentSongIndex));
}


function updateButtonStates(){
  musicPlay.classList.toggle('active-play', musicPlaying);
  musicPlay.classList.toggle('inactive', !musicPlaying);
  musicPause.classList.toggle('active-pause', !musicPlaying);
  musicPause.classList.toggle('inactive', musicPlaying);

  mediaPlay.classList.toggle('active-play', mediaPlaying);
  mediaPlay.classList.toggle('inactive', !mediaPlaying);
  mediaPause.classList.toggle('active-pause', !mediaPlaying);
  mediaPause.classList.toggle('inactive', mediaPlaying);

  intercomToggle.classList.toggle('active-announcement', intercomActive);
  intercomToggle.classList.toggle('inactive', !intercomActive);
}

// MEDIA
mediaFiles.addEventListener('change', async e=>{
  const files = Array.from(e.target.files);
  for (const f of files) {
    await processMediaFile(f);
  }
});

function renderMediaQueue(){
  mediaQueue.innerHTML='';
  media.forEach((m,i)=>{
    const li = createListItem(m,i,'media');
    mediaQueue.appendChild(li);
  });
  updateQueueProgress('media');
}

function openDisplayWindow(){
  if (displayWindow && !displayWindow.closed) { displayWindow.focus(); return; }
  displayWindow = window.open('media.html','EventDisplay','width=1280,height=720');
}

openDisplay.addEventListener('click', openDisplayWindow);

window.addEventListener('message', e => {
  const msg = e.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'videoEnded') {
    advanceMedia();
  }
});

function showMediaAt(i){
  if (i<0 || i>=media.length) return;
  currentMediaIndex = i;
  updateMediaUI();
  updateMediaMirror(media[i]);
  sendMediaToDisplay(media[i]);
  if (mediaLooping) scheduleMediaAdvance();
  updateButtonStates();
}

function sendMediaToDisplay(item){
  if (!displayWindow || displayWindow.closed) openDisplayWindow();
  const msg = {type:'show', item:{name:item.name,url:item.url,type:item.type}};
  // wait for popup to be ready
  setTimeout(()=> displayWindow.postMessage(msg,'*'),200);
}

function updateMediaUI(){
  currentMediaEl.textContent = (currentMediaIndex>=0 && media[currentMediaIndex])? media[currentMediaIndex].name : 'No media';
  const lis = mediaQueue.querySelectorAll('li');
  lis.forEach(li=> li.classList.toggle('active', parseInt(li.dataset.index)===currentMediaIndex));
  updateQueueProgress('media');
}

function updateQueueProgress(type){
  if (type === 'music'){
    const activeIndex = currentSongIndex;
    const duration = musicAudio.duration || 0;
    const percent = duration > 0 ? (musicAudio.currentTime / duration) * 100 : 0;
    musicQueue.querySelectorAll('li').forEach(li => {
      const underlay = li.querySelector('.progress-underlay');
      if (!underlay) return;
      if (parseInt(li.dataset.index) === activeIndex){
        underlay.style.width = `${percent}%`;
      } else {
        underlay.style.width = '0%';
      }
    });
  } else {
    const activeIndex = currentMediaIndex;
    mediaQueue.querySelectorAll('li').forEach(li => {
      const underlay = li.querySelector('.progress-underlay');
      if (!underlay) return;
      if (parseInt(li.dataset.index) !== activeIndex){
        underlay.style.width = '0%';
        return;
      }
      const current = media[activeIndex];
      if (!current){ underlay.style.width = '0%'; return; }
      if (current.type.startsWith('video/')){
        const videoEl = mediaMirrorContent.querySelector('video');
        const duration = videoEl?.duration || 0;
        const percent = duration > 0 ? (videoEl.currentTime / duration) * 100 : 0;
        underlay.style.width = `${percent}%`;
      } else {
        const transition = Math.max(1, parseFloat(transitionTimeEl.value) || 5);
        if (mediaProgressStart > 0){
          const elapsed = Date.now() - mediaProgressStart;
          const percent = Math.min(100, (elapsed / (transition * 1000)) * 100);
          underlay.style.width = `${percent}%`;
        } else {
          underlay.style.width = '0%';
        }
      }
    });
  }
}

let mediaProgressStart = 0;

function updateMediaMirror(item){
  mediaMirrorContent.innerHTML = '';
  if (!item) {
    mediaMirrorContent.textContent = 'Nothing displayed';
    return;
  }
  if (item.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.name;
    mediaMirrorContent.appendChild(img);
  } else if (item.type.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = item.url;
    video.controls = false;
    video.autoplay = true;
    video.muted = true;
    video.loop = false;
    video.addEventListener('timeupdate', ()=> updateQueueProgress('media'));
    mediaMirrorContent.appendChild(video);
  } else {
    mediaMirrorContent.textContent = item.name;
  }
}

function sendMediaControlToDisplay(command){
  if (!displayWindow || displayWindow.closed) return;
  displayWindow.postMessage({type: command}, '*');
}

function scheduleMediaAdvance(){
  if (mediaTimer) clearTimeout(mediaTimer);
  if (media.length===0 || currentMediaIndex < 0) return;
  const current = media[currentMediaIndex];
  if (!current) return;
  if (current.type.startsWith('video/')) {
    // wait for the video ended event from the display window
    return;
  }
  const transition = Math.max(1, parseFloat(transitionTimeEl.value) || 5) * 1000;
  mediaProgressStart = Date.now();
  mediaTimer = setTimeout(()=> {
    advanceMedia();
  }, transition);
}

function advanceMedia(){
  if (media.length===0) return;
  const nextIndex = (currentMediaIndex + 1) % media.length;
  currentMediaIndex = nextIndex;
  showMediaAt(currentMediaIndex);
}

mediaPlay.addEventListener('click', ()=>{
  if (media.length===0) return;
  if (currentMediaIndex===-1) currentMediaIndex=0;
  mediaPlaying = true;
  mediaLooping = true;
  showMediaAt(currentMediaIndex);
  updateButtonStates();
});
mediaPause.addEventListener('click', ()=>{
  mediaPlaying = false;
  mediaLooping = false;
  stopMediaLoop();
  mediaProgressStart = 0;
  sendMediaControlToDisplay('pause');
  updateButtonStates();
});

function stopMediaLoop(){
  if (mediaTimer) clearTimeout(mediaTimer);
  mediaTimer = null;
  mediaProgressStart = 0;
}

// INTERCOM
let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let intercomActive = false;
let intercomAudioEl = null;

async function startIntercom(){
  const constraints = selectedInputDeviceId ? {audio:{deviceId:{exact:selectedInputDeviceId}}} : {audio:true};
  try{
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  }catch(err){ alert('Microphone access denied or not available: '+err.message); return; }

  const mode = document.querySelector('input[name="mode"]:checked').value;
  if (mode==='live'){
    // passthrough to output
    intercomAudioEl = new Audio();
    intercomAudioEl.srcObject = mediaStream;
    intercomAudioEl.autoplay = true;
    intercomAudioEl.volume = parseFloat(intercomVolume.value);
    if (selectedOutputDeviceId && typeof intercomAudioEl.setSinkId === 'function'){
      try { await intercomAudioEl.setSinkId(selectedOutputDeviceId); } catch (err) { console.warn('Failed to set output device:', err); }
    }
    await intercomAudioEl.play().catch(()=>{});
  } else {
    // recorded mode - start recording
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);
    mediaRecorder.ondataavailable = e=>{ if (e.data && e.data.size) recordedChunks.push(e.data); };
    mediaRecorder.start();
  }

  intercomActive = true;
  intercomToggle.textContent = 'Stop Announcement';
  updateButtonStates();
  // pause/fade music
  handleMusicForAnnouncement(true);
}

async function stopIntercom(){
  const mode = document.querySelector('input[name="mode"]:checked').value;
  if (mode==='live'){
    if (intercomAudioEl){ intercomAudioEl.pause(); intercomAudioEl.srcObject = null; intercomAudioEl = null; }
  } else {
    if (mediaRecorder && mediaRecorder.state !== 'inactive'){
      mediaRecorder.onstop = ()=>{
        const blob = new Blob(recordedChunks,{type:'audio/webm'});
        const url = URL.createObjectURL(blob);
        const a = new Audio(url);
        a.volume = parseFloat(intercomVolume.value);
        a.play();
        // when playback ends, restore music
        a.onended = ()=> handleMusicForAnnouncement(false);
      };
      mediaRecorder.stop();
    }
  }
  // if live, restore music now
  if (mode==='live') handleMusicForAnnouncement(false);
  // stop tracks
  if (mediaStream){ mediaStream.getTracks().forEach(t=>t.stop()); mediaStream=null; }
  intercomActive=false;
  intercomToggle.textContent='Start Announcement';
  updateButtonStates();
}

intercomToggle.addEventListener('click', ()=>{
  if (!intercomActive) startIntercom(); else stopIntercom();
});

function handleMusicForAnnouncement(starting){
  const shouldPause = pauseMusicDuring.checked;
  const shouldFade = fadeMusic.checked;
  if (!shouldPause && !shouldFade) return;
  if (starting){
    if (shouldFade){
      fadeOutMusic(0.5);
    } else if (shouldPause){
      if (!musicAudio.paused) musicAudio.pause();
    }
  } else {
    if (shouldFade){
      fadeInMusic(0.5);
    } else if (shouldPause){
      if (musicPlaying) musicAudio.play();
    }
  }
}

function fadeOutMusic(durationSec=0.5){
  const start = musicAudio.volume;
  const steps = 20;
  let i=0;
  const iv = setInterval(()=>{
    i++; const t=i/steps;
    musicAudio.volume = start*(1-t);
    if (i>=steps){ clearInterval(iv); musicAudio.pause(); musicAudio.volume = start; }
  }, durationSec*1000/steps);
}
function fadeInMusic(durationSec=0.5){
  const target = parseFloat(masterVolume.value)||1;
  musicAudio.volume = 0;
  musicAudio.play().catch(()=>{});
  const steps=20; let i=0;
  const iv=setInterval(()=>{ i++; musicAudio.volume = target*(i/steps); if (i>=steps){ clearInterval(iv); } }, durationSec*1000/steps);
}

// set intercom volume control
intercomVolume.addEventListener('input', ()=>{
  const v = parseFloat(intercomVolume.value);
  if (intercomAudioEl) intercomAudioEl.volume = v;
});

// initial UI
updateMusicUI();
updateMediaUI();
updateButtonStates();
ensureDeviceAccess();
setInterval(()=>{
  updateQueueProgress('music');
  updateQueueProgress('media');
}, 250);

// Cleanup on unload
window.addEventListener('beforeunload', ()=>{
  if (displayWindow && !displayWindow.closed) displayWindow.close();
});

// simple status
setInterval(()=>{
  const s = `music:${musicPlaying? 'playing':'stopped'} songs:${songs.length} media:${media.length}`;
  document.getElementById('status').textContent = s;
},1000);
