// Event Control Panel - app.js

// Time display
const timeEl = document.getElementById('time');
function updateTime(){
  const d=new Date();
  if (timeEl) timeEl.textContent = d.toLocaleTimeString();
}
setInterval(updateTime,1000);
updateTime();

// State
let songs = [];
let currentSongIndex = -1;
let musicAudio = new Audio();
musicAudio.preload = 'auto';
let musicPlaying = false;
let musicLoopMode = 'off';

let soundboardSounds = [];

let media = [];
let currentMediaIndex = -1;
let displayWindow = null;
let mediaTimer = null;
let mediaPlaying = false;
let mediaLooping = false;
let mediaLoopMode = 'off';
let mediaProgressInterval = null;

// Elements
const musicFiles = document.getElementById('musicFiles');
const musicQueue = document.getElementById('musicQueue');
const currentSongEl = document.getElementById('currentSong');
const musicPlay = document.getElementById('musicPlay');
const musicPause = document.getElementById('musicPause');
const musicPrev = document.getElementById('musicPrev');
const musicNext = document.getElementById('musicNext');
const musicLoopModeSelect = document.getElementById('musicLoopMode');
const musicShuffleButton = document.getElementById('musicShuffle');
const soundboardFiles = document.getElementById('soundboardFiles');
const soundboardGrid = document.getElementById('soundboardGrid');
const ecpExport = document.getElementById('ecpExport');
const ecpExportAll = document.getElementById('ecpExportAll');
const ecpImportFile = document.getElementById('ecpImportFile');
const presetSelect = document.getElementById('presetSelect');
const sessionNotes = document.getElementById('sessionNotes');

const mediaFiles = document.getElementById('mediaFiles');
const mediaQueue = document.getElementById('mediaQueue');
const currentMediaEl = document.getElementById('currentMedia');
const mediaPlay = document.getElementById('mediaPlay');
const mediaPause = document.getElementById('mediaPause');
const mediaPrev = document.getElementById('mediaPrev');
const mediaNext = document.getElementById('mediaNext');
const mediaLoopModeSelect = document.getElementById('mediaLoopMode');
const mediaNotes = document.getElementById('mediaNotes');
const mediaMirror = document.getElementById('mediaMirror');
const transitionTimeEl = document.getElementById('transitionTime');
const openDisplay = document.getElementById('openDisplay');
const mediaMirrorContent = document.getElementById('mediaMirrorContent');
const mediaPrevPreview = document.getElementById('mediaPrevPreview');
const mediaNextPreview = document.getElementById('mediaNextPreview');
const statusEl = document.getElementById('status');
const appBanner = document.getElementById('appBanner');

const intercomToggle = document.getElementById('intercomToggle');
const inputDeviceSelect = document.getElementById('inputDeviceSelect');
const outputDeviceSelect = document.getElementById('outputDeviceSelect');
const masterVolume = document.getElementById('masterVolume');
const intercomVolume = document.getElementById('intercomVolume');
const musicVolume = document.getElementById('musicVolume');
const soundboardVolume = document.getElementById('soundboardVolume');
const mediaMuteAudio = document.getElementById('mediaMuteAudio');
const pauseMusicDuring = document.getElementById('pauseMusicDuringAnnouncement');
const fadeMusic = document.getElementById('fadeMusic');

// CP Sidebar controls selectors
const cpMusicPlay = document.getElementById('cpMusicPlay');
const cpMusicPause = document.getElementById('cpMusicPause');
const cpMusicPrev = document.getElementById('cpMusicPrev');
const cpMusicNext = document.getElementById('cpMusicNext');
const cpMusicVolume = document.getElementById('cpMusicVolume');
const cpMediaPrev = document.getElementById('cpMediaPrev');
const cpMediaNext = document.getElementById('cpMediaNext');
const cpMediaNotes = document.getElementById('cpMediaNotes');

// Play on finish checkboxes selectors
const musicPlayOnFinish = document.getElementById('musicPlayOnFinish');
const cpMusicPlayOnFinish = document.getElementById('cpMusicPlayOnFinish');
const musicTransition = document.getElementById('musicTransition');
const cpMusicTransition = document.getElementById('cpMusicTransition');
const mediaPlayOnFinish = document.getElementById('mediaPlayOnFinish');
const cpMediaPlayOnFinish = document.getElementById('cpMediaPlayOnFinish');
const mediaTransition = document.getElementById('mediaTransition');
const cpMediaTransition = document.getElementById('cpMediaTransition');

// Stopwatch / Timer tabs & displays selectors
const btnClockMode = document.getElementById('btnClockMode');
const btnStopwatchMode = document.getElementById('btnStopwatchMode');
const btnTimerMode = document.getElementById('btnTimerMode');
const clockDisplay = document.getElementById('clockDisplay');
const stopwatchDisplay = document.getElementById('stopwatchDisplay');
const timerDisplay = document.getElementById('timerDisplay');

const btnStopwatchStart = document.getElementById('btnStopwatchStart');
const btnStopwatchReset = document.getElementById('btnStopwatchReset');
const stopwatchTime = document.getElementById('stopwatchTime');

const btnTimerStart = document.getElementById('btnTimerStart');
const btnTimerReset = document.getElementById('btnTimerReset');
const timerTime = document.getElementById('timerTime');
const timerInputMin = document.getElementById('timerInputMin');
const timerInputSec = document.getElementById('timerInputSec');
const stopwatchPanel = document.getElementById('stopwatchPanel');

let selectedInputDeviceId = '';
let selectedOutputDeviceId = '';

if (appBanner) {
  appBanner.addEventListener('click', () => window.location.reload());
}

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
    void applyOutputDeviceToAllAudio();
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
  void applyOutputDeviceToAllAudio();
});

async function applyAudioOutputDevice(audio){
  if (!audio || !selectedOutputDeviceId || typeof audio.setSinkId !== 'function') return;
  try {
    await audio.setSinkId(selectedOutputDeviceId);
  } catch (err) {
    console.warn('Unable to route audio to selected output device:', err);
  }
}

async function applyOutputDeviceToAllAudio(){
  await applyAudioOutputDevice(musicAudio);
  if (intercomAudioEl) await applyAudioOutputDevice(intercomAudioEl);
}

function pauseAllAudio(){
  if (musicAudio){ musicAudio.pause(); }
  document.querySelectorAll('audio').forEach(a=>{ try { a.pause(); } catch {} });
  if (mediaMirrorContent){ mediaMirrorContent.querySelectorAll('video').forEach(v=>{ try { v.pause(); } catch {} }); }
  if (displayWindow && !displayWindow.closed) sendMediaControlToDisplay('pause');
  stopMediaLoop();
  mediaPlaying = false;
  mediaLooping = false;
  mediaProgressStart = 0;
  if (intercomActive) stopIntercom();
  musicPlaying = false;
  updateButtonStates();
}

async function ensureDeviceAccess(){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  try {
    await navigator.mediaDevices.getUserMedia({audio:true});
  } catch (err) {
    // ignore permission denial here; devices list may still show if previously granted
  }
  await refreshAudioDeviceLists();
}

// Master / channel volume controls
function applyVolumeSettings(){
  const m = parseFloat(masterVolume?.value) || 1;
  const mv = parseFloat(musicVolume?.value) || 1;
  const sv = parseFloat(soundboardVolume?.value) || 1;
  // effective volumes
  try { musicAudio.volume = m * mv; } catch {}
  // (soundboard volumes applied on play)
}

masterVolume.addEventListener('input', applyVolumeSettings);
if (musicVolume) musicVolume.addEventListener('input', applyVolumeSettings);
if (soundboardVolume) soundboardVolume.addEventListener('input', applyVolumeSettings);

function readBlobAsDataURL(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function readFileAsDataURL(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function getItemDataUrl(item){
  if (typeof item.url === 'string' && item.url.startsWith('data:')) return item.url;
  if (item.file) return await readFileAsDataURL(item.file);
  if (item.url) {
    try {
      const response = await fetch(item.url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return await readBlobAsDataURL(blob);
    } catch {
      return null;
    }
  }
  return null;
}

async function serializeSessionItems(items){
  const list = [];
  for (const item of items){
    const dataUrl = await getItemDataUrl(item);
    list.push({
      name:item.name,
      type:item.type || '',
      source:item.source || '',
      pageNumber:item.pageNumber || 0,
      pages:item.pages || 0,
      notes:item.notes || '',
      durationFormatted:item.durationFormatted || '',
      skip: !!item.skip,
      dataUrl:dataUrl || ''
    });
  }
  return list;
}

async function createEcpPayload(sessionState){
  const state = sessionState || {
    notes: sessionNotes?.value || '',
    settings: {
      masterVolume: parseFloat(masterVolume.value),
      musicVolume: parseFloat(musicVolume?.value) || 1,
      soundboardVolume: parseFloat(soundboardVolume?.value) || 1,
      mediaMuteAudio: !!(mediaMuteAudio?.checked),
      intercomVolume: parseFloat(intercomVolume.value),
      pauseMusicDuringAnnouncement: pauseMusicDuring.checked,
      fadeMusic: fadeMusic.checked,
      musicLoop: musicLoopMode === 'all',
      musicLoopMode: musicLoopMode,
      mediaLoopMode: mediaLoopMode,
      transitionTime: parseFloat(transitionTimeEl.value) || 5,
      intercomMode: document.querySelector('input[name="mode"]:checked')?.value || 'live',
      selectedInputDeviceId,
      selectedOutputDeviceId,
      currentSongIndex,
      currentMediaIndex
    },
    music: songs,
    soundboard: soundboardSounds,
    media: media
  };

  const musicItems = state.music || state.songs || [];
  const soundboardItems = state.soundboard || state.soundboardSounds || [];
  const mediaItems = state.media || [];

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: state.notes || state.sessionNotes || '',
    settings: state.settings,
    music: await serializeSessionItems(musicItems),
    soundboard: await serializeSessionItems(soundboardItems),
    media: await serializeSessionItems(mediaItems)
  };
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=> URL.revokeObjectURL(url), 100);
}

function downloadJson(data, filename){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=> URL.revokeObjectURL(url), 100);
}

let presets = [];
let selectedPresetIndex = -1;

function createSessionItem(serialized){
  const item = {
    name: serialized.name || 'Unknown',
    type: serialized.type || 'application/octet-stream',
    url: serialized.dataUrl || serialized.url || '',
    source: serialized.source || '',
    pageNumber: serialized.pageNumber || 0,
    pages: serialized.pages || 0,
    notes: serialized.notes || '',
    durationFormatted: serialized.durationFormatted || 'Unknown',
    skip: !!serialized.skip
  };
  return item;
}

function buildPresetFromPayload(payload, fileName){
  return {
    name: fileName || payload.notes || 'Preset',
    notes: payload.notes || payload.sessionNotes || '',
    settings: payload.settings || {},
    music: (payload.music || []).map(createSessionItem),
    soundboard: (payload.soundboard || []).map(createSessionItem),
    media: (payload.media || []).map(createSessionItem)
  };
}

function updatePresetSelect(){
  if (!presetSelect) return;
  presetSelect.innerHTML = '';
  if (presets.length === 0){
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No presets loaded';
    presetSelect.appendChild(option);
    return;
  }

  presets.forEach((preset, index)=>{
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = preset.name || `Preset ${index + 1}`;
    if (index === selectedPresetIndex) option.selected = true;
    presetSelect.appendChild(option);
  });
}

function applyPreset(preset){
  pauseAllAudio();

  songs = (preset.music || []).map(item => ({ ...item }));
  soundboardSounds = (preset.soundboard || []).map(item => ({ ...item }));
  media = (preset.media || []).map(item => ({ ...item }));
  if (sessionNotes) sessionNotes.value = preset.notes || '';

  if (preset.settings){
    masterVolume.value = preset.settings.masterVolume ?? 1;
    if (musicVolume) musicVolume.value = preset.settings.musicVolume ?? 1;
    if (soundboardVolume) soundboardVolume.value = preset.settings.soundboardVolume ?? 1;
    if (mediaMuteAudio) mediaMuteAudio.checked = !!preset.settings.mediaMuteAudio;
    applyVolumeSettings();
    intercomVolume.value = preset.settings.intercomVolume ?? 1;
    pauseMusicDuring.checked = preset.settings.pauseMusicDuringAnnouncement === true;
    fadeMusic.checked = preset.settings.fadeMusic === true;
    transitionTimeEl.value = preset.settings.transitionTime || 5;
    if (preset.settings.intercomMode){
      const modeRadio = document.querySelector(`input[name="mode"][value="${preset.settings.intercomMode}"]`);
      if (modeRadio) modeRadio.checked = true;
    }
    selectedInputDeviceId = preset.settings.selectedInputDeviceId || '';
    selectedOutputDeviceId = preset.settings.selectedOutputDeviceId || '';
    musicLoopMode = preset.settings.musicLoopMode || (preset.settings.musicLoop === true ? 'all' : 'off');
    if (musicLoopModeSelect) musicLoopModeSelect.value = musicLoopMode;
    mediaLoopMode = preset.settings.mediaLoopMode || 'off';
    if (mediaLoopModeSelect) mediaLoopModeSelect.value = mediaLoopMode;
    currentSongIndex = Number.isInteger(preset.settings.currentSongIndex) && preset.settings.currentSongIndex >= 0 && preset.settings.currentSongIndex < songs.length ? preset.settings.currentSongIndex : -1;
  } else {
    currentSongIndex = -1;
  }

  currentMediaIndex = media.length > 0 ? 0 : -1;

  renderQueues();
  renderSoundboardGrid();
  updateMusicUI();
  updateMediaUI();

  if (currentSongIndex >= 0 && songs[currentSongIndex]){
    musicAudio.src = songs[currentSongIndex].url;
  }

  if (selectedOutputDeviceId){
    void applyOutputDeviceToAllAudio();
  }

  if (currentMediaIndex >= 0 && media[currentMediaIndex]){
    showMediaAt(currentMediaIndex, false);
  } else {
    updateMediaUI();
  }
}

async function loadPresetFile(file){
  const text = await file.text();
  const payload = JSON.parse(text);
  if (!payload || payload.version !== 1) throw new Error('Unsupported session file');
  const preset = buildPresetFromPayload(payload, file.name);
  presets.push(preset);
  if (selectedPresetIndex === -1){
    selectedPresetIndex = 0;
    applyPreset(preset);
  }
  updatePresetSelect();
}

async function exportSelectedPreset(){
  const payload = await createEcpPayload();
  const currentPreset = selectedPresetIndex >= 0 ? presets[selectedPresetIndex] : null;
  const filename = currentPreset ? `${currentPreset.name.replace(/\.ecp$/i, '') || 'preset'}.ecp` : 'session.ecp';
  downloadJson(payload, filename);
}

async function exportAllPresets(){
  if (presets.length === 0) {
    setStatus('No presets to export.');
    return;
  }

  const zip = new JSZip();
  for (const preset of presets){
    const payload = await createEcpPayload(preset);
    const fileName = `${preset.name.replace(/\.ecp$/i, '') || 'preset'}.ecp`;
    zip.file(fileName, JSON.stringify(payload, null, 2));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'presets.zip');
}

async function applyImportedSession(payload){
  if (!payload || payload.version !== 1) throw new Error('Unsupported session file');
  songs = (payload.music || []).map(createSessionItem);
  soundboardSounds = (payload.soundboard || []).map(createSessionItem);
  media = (payload.media || []).map(createSessionItem);
  if (sessionNotes) sessionNotes.value = payload.notes || payload.sessionNotes || '';

  if (payload.settings){
    masterVolume.value = payload.settings.masterVolume ?? 1;
    if (musicVolume) musicVolume.value = payload.settings.musicVolume ?? 1;
    if (soundboardVolume) soundboardVolume.value = payload.settings.soundboardVolume ?? 1;
    if (mediaMuteAudio) mediaMuteAudio.checked = !!payload.settings.mediaMuteAudio;
    applyVolumeSettings();
    intercomVolume.value = payload.settings.intercomVolume ?? 1;
    pauseMusicDuring.checked = payload.settings.pauseMusicDuringAnnouncement === true;
    fadeMusic.checked = payload.settings.fadeMusic === true;
    transitionTimeEl.value = payload.settings.transitionTime || 5;
    if (payload.settings.intercomMode){
      const modeRadio = document.querySelector(`input[name="mode"][value="${payload.settings.intercomMode}"]`);
      if (modeRadio) modeRadio.checked = true;
    }
    selectedInputDeviceId = payload.settings.selectedInputDeviceId || '';
    selectedOutputDeviceId = payload.settings.selectedOutputDeviceId || '';
    musicLoopMode = payload.settings.musicLoopMode || (payload.settings.musicLoop === true ? 'all' : 'off');
    if (musicLoopModeSelect) musicLoopModeSelect.value = musicLoopMode;
    mediaLoopMode = payload.settings.mediaLoopMode || 'off';
    if (mediaLoopModeSelect) mediaLoopModeSelect.value = mediaLoopMode;
    currentSongIndex = Number.isInteger(payload.settings.currentSongIndex) && payload.settings.currentSongIndex >= 0 && payload.settings.currentSongIndex < songs.length ? payload.settings.currentSongIndex : -1;
    currentMediaIndex = Number.isInteger(payload.settings.currentMediaIndex) && payload.settings.currentMediaIndex >= 0 && payload.settings.currentMediaIndex < media.length ? payload.settings.currentMediaIndex : -1;
  }

  renderQueues();
  renderSoundboardGrid();
  updateMusicUI();
  updateMediaUI();
  if (currentSongIndex >= 0 && songs[currentSongIndex]){
    musicAudio.src = songs[currentSongIndex].url;
  }
  if (currentMediaIndex >= 0 && media[currentMediaIndex]){
    updateMediaMirror(media[currentMediaIndex]);
    sendMediaToDisplay(media[currentMediaIndex]);
  }
  await refreshAudioDeviceLists();
}

ecpExport.addEventListener('click', async ()=>{
  ecpExport.disabled = true;
  try {
    setStatus('Preparing preset export...');
    await exportSelectedPreset();
    setStatus('Preset export ready.');
  } catch (err) {
    console.error(err);
    setStatus(`Export failed: ${err.message || 'unknown error'}`);
  } finally {
    ecpExport.disabled = false;
    setTimeout(()=> setStatus(''), 4000);
  }
});

ecpExportAll.addEventListener('click', async ()=>{
  ecpExportAll.disabled = true;
  try {
    setStatus('Preparing all presets zip...');
    await exportAllPresets();
    setStatus('All presets exported successfully.');
  } catch (err) {
    console.error(err);
    setStatus(`Export failed: ${err.message || 'unknown error'}`);
  } finally {
    ecpExportAll.disabled = false;
    setTimeout(()=> setStatus(''), 4000);
  }
});

if (presetSelect) {
  presetSelect.addEventListener('change', ()=>{
    const index = Number(presetSelect.value);
    if (!Number.isFinite(index) || index < 0 || index >= presets.length) return;
    selectedPresetIndex = index;
    applyPreset(presets[selectedPresetIndex]);
  });
}

ecpImportFile.addEventListener('change', async e=>{
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  let importedCount = 0;
  let failedCount = 0;
  for (const file of files){
    try {
      setStatus(`Importing ${file.name}...`);
      await loadPresetFile(file);
      importedCount += 1;
    } catch (err) {
      console.error(err);
      failedCount += 1;
    }
  }

  if (importedCount > 0) {
    setStatus(`Imported ${importedCount} preset${importedCount === 1 ? '' : 's'}.`);
  }
  if (failedCount > 0) {
    setStatus(`${failedCount} preset${failedCount === 1 ? '' : 's'} failed to import.`);
  }
  e.target.value = '';
  setTimeout(()=> setStatus(''), 5000);
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
  return convertPdfFromFile(file, 1.5, 'jpeg');
}

const EMU_PER_PX = 9525;
const PPTX_PRES_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const PPTX_DRAW_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const PPTX_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PDFJS_GLOBAL_SCRIPT_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.246/pdf.min.js';
const PDFJS_GLOBAL_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.246/pdf.worker.min.js';
const PDFJS_MODULE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const PDFJS_MODULE_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
let pdfJsReadyPromise = null;
const loadedPptxFontFamilies = new Set();

function parseXmlString(xml){
  return new DOMParser().parseFromString(xml,'application/xml');
}

// Utility from converter: canvas -> Blob
function canvasToBlob(canvas, mimeType) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), mimeType, 0.92);
  });
}

function configurePdfJs(pdfjs, workerSrc){
  if (!pdfjs || !pdfjs.getDocument) throw new Error('PDF.js loaded without getDocument');
  if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  }
  try {
    if ('disableWorker' in pdfjs) pdfjs.disableWorker = true;
  } catch {
    // Module namespace objects may be read-only; workerSrc is enough for modern builds.
  }
  window.pdfjsLib = pdfjs;
  return pdfjs;
}

function loadScript(src){
  return new Promise((resolve, reject)=>{
    const existing = Array.from(document.scripts).find(script => script.src === src);
    if (existing && window.pdfjsLib) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadPdfJs(){
  if (window.pdfjsLib?.getDocument) return configurePdfJs(window.pdfjsLib, PDFJS_GLOBAL_WORKER_SRC);

  try {
    await loadScript(PDFJS_GLOBAL_SCRIPT_SRC);
    if (window.pdfjsLib?.getDocument) return configurePdfJs(window.pdfjsLib, PDFJS_GLOBAL_WORKER_SRC);
  } catch (error) {
    console.warn('PDF.js global build failed to load:', error);
  }

  try {
    const modulePdfJs = await import(PDFJS_MODULE_SRC);
    return configurePdfJs(modulePdfJs, PDFJS_MODULE_WORKER_SRC);
  } catch (error) {
    console.warn('PDF.js module build failed to load:', error);
  }

  throw new Error('PDF.js failed to load. Check your connection and try importing the PDF again.');
}

async function ensurePdfJsConfigured(){
  if (window.pdfjsLib?.getDocument) return configurePdfJs(window.pdfjsLib, PDFJS_GLOBAL_WORKER_SRC);
  if (!pdfJsReadyPromise) pdfJsReadyPromise = loadPdfJs();
  return pdfJsReadyPromise;
}

// Convert a PDF File to slide items (uses pdfjsLib already loaded)
async function convertPdfFromFile(file, scale = 1.5, format = 'jpeg'){
  const pdfjs = await ensurePdfJsConfigured();
  setStatus(`Converting PDF: ${file.name}`);
  const array = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({data:new Uint8Array(array)}).promise;
  const total = pdf.numPages;
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';
  const items = [];
  try {
    for (let i=1;i<=total;i++){
      setStatus(`Rendering page ${i} of ${total}...`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({scale});
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (format === 'jpeg'){ ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); }
      await page.render({canvasContext:ctx, viewport}).promise;
      const blob = await canvasToBlob(canvas, mimeType);
      const url = URL.createObjectURL(blob);
      items.push({ name: `${file.name} - page ${i}`, url, type: mimeType, source:'pdf', pageNumber:i, pages:total, notes:'', file: null, filename:`page-${String(i).padStart(3,'0')}.${ext}` });
      page.cleanup?.();
    }
  } finally {
    await pdf.destroy?.();
  }
  return items;
}

// Convert PPTX using JSZip and canvas renderer (adapted from converter.html)
async function convertPptxFromFile(file, scale = 1, format = 'jpeg'){
  setStatus(`Converting PPTX: ${file.name}`);
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';
  const results = [];

  const parser = new DOMParser();
  const slides = await getPptxSlideEntries(zip, parser);
  const slideCount = slides.length;
  await loadPptxFonts(zip);

  for (let i=0;i<slideCount;i++){
    setStatus(`Rendering slide ${i+1} of ${slideCount}...`);
    const blob = await renderSlideToCanvas(zip, slides[i], scale, mimeType);
    if (blob) results.push({ blob, filename: `slide-${String(i+1).padStart(3,'0')}.${ext}`, pageNumber: i+1 });
  }
  if (results.length === 0) throw new Error('Could not extract any slides from this PPTX.');
  return results.map(r=>{
    const url = URL.createObjectURL(r.blob);
    return { name: `${file.name} - slide ${r.pageNumber}`, url, type:mimeType, source:'pptx', pageNumber: r.pageNumber, pages: slideCount, notes:'', file: null };
  });
}

// Helper: render a single slide to canvas blob (from converter)
async function renderSlideToCanvas(zip, slideRef, scale, mimeType){
  const slidePath = typeof slideRef === 'object' ? slideRef.path : `ppt/slides/slide${slideRef}.xml`;
  const relsPath = typeof slideRef === 'object' ? slideRef.relsPath : getPptxRelsPath(slidePath);
  const slideXml = await zip.file(slidePath)?.async('string');
  if (!slideXml) return null;
  const presXml = await zip.file('ppt/presentation.xml')?.async('string');
  const parser = new DOMParser();

  let slideWidthEmu  = 9144000;
  let slideHeightEmu = 6858000;
  if (presXml){
    const presDoc = parser.parseFromString(presXml, 'application/xml');
    const sldSz = presDoc.getElementsByTagNameNS(PPTX_PRES_NS, 'sldSz')[0];
    if (sldSz){ slideWidthEmu  = parseInt(sldSz.getAttribute('cx')) || slideWidthEmu; slideHeightEmu = parseInt(sldSz.getAttribute('cy')) || slideHeightEmu; }
  }

  const EMU_TO_PX = 96 / 914400;
  const W = Math.round(slideWidthEmu  * EMU_TO_PX * scale);
  const H = Math.round(slideHeightEmu * EMU_TO_PX * scale);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,W,H);
  const slideDoc = parser.parseFromString(slideXml, 'application/xml');
  await applyBackground(ctx, zip, slideDoc, slidePath, relsPath, W, H, scale, parser);
  await renderImages(ctx, zip, slideDoc, slidePath, relsPath, W, H, slideWidthEmu, slideHeightEmu, scale, parser);
  renderTextShapes(ctx, slideDoc, W, H, slideWidthEmu, slideHeightEmu, scale);
  const blob = await canvasToBlob(canvas, mimeType);
  return blob;
}

async function applyBackground(ctx, zip, slideDoc, slidePath, relsPath, W, H, scale, parser){
  const drawNS = PPTX_DRAW_NS;
  const presNS = PPTX_PRES_NS;
  const bgElements = slideDoc.getElementsByTagNameNS(presNS, 'bg');
  if (bgElements.length === 0) { await tryLayoutBackground(ctx, zip, slidePath, relsPath, W, H, parser); return; }
  const bg = bgElements[0];
  const solidFill = bg.getElementsByTagNameNS(drawNS, 'solidFill')[0];
  if (solidFill){ const color = extractColor(solidFill, drawNS); if (color){ ctx.fillStyle = color; ctx.fillRect(0,0,W,H); } }
  const gradFill = bg.getElementsByTagNameNS(drawNS, 'gradFill')[0];
  if (gradFill){ const gsLst = gradFill.getElementsByTagNameNS(drawNS, 'gs'); if (gsLst.length>=2){ const grad = ctx.createLinearGradient(0,0,W,H); for (const gs of gsLst){ const pos = parseInt(gs.getAttribute('pos')||'0')/100000; const c = extractColor(gs, drawNS); if (c) grad.addColorStop(pos, c); } ctx.fillStyle = grad; ctx.fillRect(0,0,W,H); } }
  const blip = bg.getElementsByTagNameNS(drawNS, 'blip')[0];
  if (blip){
    const relId = getPptxRelationshipId(blip, 'embed');
    const relMap = await readPptxRelationships(zip, relsPath, parser);
    if (relId && relMap[relId]){
      await drawZipImage(ctx, zip, resolvePptxPath(slidePath, relMap[relId]), 0, 0, W, H);
    }
  }
}

async function tryLayoutBackground(ctx, zip, slidePath, relsPath, W, H, parser){
  const relsXml = await zip.file(relsPath)?.async('string'); if (!relsXml) return;
  const relsDoc = parser.parseFromString(relsXml, 'application/xml');
  const rels = relsDoc.getElementsByTagName('Relationship'); let layoutPath = null;
  for (const rel of rels){ if ((rel.getAttribute('Type')||'').includes('slideLayout')){ const target = rel.getAttribute('Target')||''; layoutPath = resolvePptxPath(slidePath, target); break; } }
  if (!layoutPath) return; const layoutXml = await zip.file(layoutPath)?.async('string'); if (!layoutXml) return;
  const drawNS = PPTX_DRAW_NS; const presNS = PPTX_PRES_NS; const layoutDoc = parser.parseFromString(layoutXml,'application/xml'); const bg = layoutDoc.getElementsByTagNameNS(presNS,'bg')[0]; if (!bg) return; const solidFill = bg.getElementsByTagNameNS(drawNS,'solidFill')[0]; if (solidFill){ const color = extractColor(solidFill, drawNS); if (color){ ctx.fillStyle = color; ctx.fillRect(0,0,W,H); } }
  const blip = bg.getElementsByTagNameNS(drawNS, 'blip')[0];
  if (blip){
    const relId = getPptxRelationshipId(blip, 'embed');
    const relMap = await readPptxRelationships(zip, getPptxRelsPath(layoutPath), parser);
    if (relId && relMap[relId]) await drawZipImage(ctx, zip, resolvePptxPath(layoutPath, relMap[relId]), 0, 0, W, H);
  }
}

function extractColor(el, drawNS){ const srgb = el.getElementsByTagNameNS(drawNS,'srgbClr')[0]; if (srgb) return '#' + srgb.getAttribute('val'); const preset = el.getElementsByTagNameNS(drawNS,'prstClr')[0]; if (preset){ const presetMap = { white:'#ffffff', black:'#000000', red:'#ff0000', blue:'#0000ff', green:'#008000', yellow:'#ffff00', orange:'#ffa500', purple:'#800080', gray:'#808080', grey:'#808080', lightGray:'#d3d3d3', darkGray:'#a9a9a9', navy:'#000080', teal:'#008080' }; return presetMap[preset.getAttribute('val')] || null; } return null; }

async function renderImages(ctx, zip, slideDoc, slidePath, relsPath, W, H, ewEmu, ehEmu, scale, parser){
  const drawNS  = PPTX_DRAW_NS;
  const presNS  = PPTX_PRES_NS;
  const pics = slideDoc.getElementsByTagNameNS(presNS,'pic'); if (pics.length===0) return;
  const relMap = await readPptxRelationships(zip, relsPath, parser);
  const EMU = 1 / 914400 * 96 * scale;
  for (const pic of pics){ try{ const blipFill = pic.getElementsByTagNameNS(drawNS,'blipFill')[0]; if (!blipFill) continue; const blip = blipFill.getElementsByTagNameNS(drawNS,'blip')[0]; if (!blip) continue; const rId = getPptxRelationshipId(blip, 'embed'); if (!rId) continue; const target = relMap[rId]; if (!target) continue; const mediaPath = resolvePptxPath(slidePath, target);
      const spPr = pic.getElementsByTagNameNS(drawNS,'spPr')[0] || pic.getElementsByTagNameNS(presNS,'spPr')[0]; if (!spPr) continue;
      const xfrm = spPr.getElementsByTagNameNS(drawNS,'xfrm')[0]; if (!xfrm) continue;
      const off = xfrm.getElementsByTagNameNS(drawNS,'off')[0]; const ext = xfrm.getElementsByTagNameNS(drawNS,'ext')[0]; if (!off || !ext) continue;
      const x = parseInt(off.getAttribute('x')||'0') * EMU; const y = parseInt(off.getAttribute('y')||'0') * EMU; const w = parseInt(ext.getAttribute('cx')||'0') * EMU; const h = parseInt(ext.getAttribute('cy')||'0') * EMU;
      await drawZipImage(ctx, zip, mediaPath, x, y, w, h);
    } catch (e) { /* skip */ } }
}

function normalizePptxTypeface(typeface){
  const clean = (typeface || '').trim();
  if (!clean || clean.startsWith('+')) return '';
  return clean.replace(/["\\]/g, '');
}

function getTypefaceFromNode(node, drawNS){
  if (!node) return '';
  for (const localName of ['latin', 'ea', 'cs', 'sym']){
    const fontNode = node.getElementsByTagNameNS(drawNS, localName)[0];
    const typeface = normalizePptxTypeface(fontNode?.getAttribute('typeface'));
    if (typeface) return typeface;
  }
  return '';
}

function getTextStyleFromProperties(rPr, drawNS, fallback, scale){
  const style = {...fallback};
  if (!rPr) return style;
  const sz = parseInt(rPr.getAttribute('sz') || '', 10);
  if (Number.isFinite(sz) && sz > 0) style.fontSize = sz / 100 * scale;
  if (rPr.hasAttribute('b')) style.bold = ['1', 'true'].includes((rPr.getAttribute('b') || '').toLowerCase());
  if (rPr.hasAttribute('i')) style.italic = ['1', 'true'].includes((rPr.getAttribute('i') || '').toLowerCase());
  const typeface = getTypefaceFromNode(rPr, drawNS);
  if (typeface) style.typeface = typeface;
  const fillEl = rPr.getElementsByTagNameNS(drawNS, 'solidFill')[0];
  if (fillEl) {
    const color = extractColor(fillEl, drawNS);
    if (color) style.color = color;
  }
  return style;
}

function getRunText(run, drawNS){
  return Array.from(run.getElementsByTagNameNS(drawNS, 't')).map(t => t.textContent || '').join('');
}

function buildCanvasFont(style){
  const family = style.typeface
    ? `"${style.typeface}", "Segoe UI", Arial, sans-serif`
    : '"Segoe UI", Arial, sans-serif';
  const fontStyle = style.italic ? 'italic ' : '';
  const weight = style.bold ? '700' : '400';
  return `${fontStyle}${weight} ${Math.max(style.fontSize, 8)}px ${family}`;
}

function collectPptxFontsFromXml(xml, families){
  for (const match of xml.matchAll(/\btypeface="([^"]+)"/g)){
    const typeface = normalizePptxTypeface(match[1]);
    if (typeface) families.add(typeface);
  }
}

async function loadPptxFonts(zip){
  if (!document.fonts) return;
  const families = new Set();
  const xmlPaths = Object.keys(zip.files).filter(path =>
    (/^ppt\/(slides|slideLayouts|slideMasters)\//.test(path) && path.endsWith('.xml')) || path === 'ppt/presentation.xml'
  );
  for (const path of xmlPaths){
    const file = zip.file(path);
    if (!file) continue;
    try {
      collectPptxFontsFromXml(await file.async('string'), families);
    } catch {
      // Ignore unreadable non-slide parts.
    }
  }

  const loads = [];
  for (const family of families){
    if (loadedPptxFontFamilies.has(family)) continue;
    loadedPptxFontFamilies.add(family);
    loads.push(document.fonts.load(`400 24px "${family}"`));
    loads.push(document.fonts.load(`700 24px "${family}"`));
    loads.push(document.fonts.load(`italic 400 24px "${family}"`));
    loads.push(document.fonts.load(`italic 700 24px "${family}"`));
  }
  if (!loads.length) return;
  await Promise.race([
    Promise.allSettled(loads),
    new Promise(resolve => setTimeout(resolve, 1600))
  ]);
}

function renderTextShapes(ctx, slideDoc, W, H, ewEmu, ehEmu, scale){
  const drawNS = PPTX_DRAW_NS;
  const presNS = PPTX_PRES_NS;
  const EMU    = 1 / 914400 * 96 * scale;
  const shapes = slideDoc.getElementsByTagNameNS(presNS, 'sp');
  for (const sp of shapes){
    try{
      const spPr = sp.getElementsByTagNameNS(drawNS,'spPr')[0] || sp.getElementsByTagNameNS(presNS,'spPr')[0];
      const txBody = sp.getElementsByTagNameNS(presNS,'txBody')[0] || sp.getElementsByTagNameNS(drawNS,'txBody')[0];
      if (!spPr || !txBody) continue;
      const xfrm = spPr.getElementsByTagNameNS(drawNS,'xfrm')[0];
      if (!xfrm) continue;
      const off = xfrm.getElementsByTagNameNS(drawNS,'off')[0];
      const ext = xfrm.getElementsByTagNameNS(drawNS,'ext')[0];
      if (!off || !ext) continue;

      const x = parseInt(off.getAttribute('x')||'0') * EMU;
      const y = parseInt(off.getAttribute('y')||'0') * EMU;
      const w = parseInt(ext.getAttribute('cx')||'0') * EMU;
      const h = parseInt(ext.getAttribute('cy')||'0') * EMU;
      const solidFill = spPr.getElementsByTagNameNS(drawNS,'solidFill')[0];
      if (solidFill){
        const color = extractColor(solidFill, drawNS);
        if (color){ ctx.fillStyle = color; ctx.fillRect(x,y,w,h); }
      }

      const paras = txBody.getElementsByTagNameNS(drawNS,'p');
      let curY = y + 4 * scale;
      const baseStyle = {fontSize:18 * scale, bold:false, italic:false, color:'#222222', typeface:''};
      for (const para of paras){
        const runs = para.getElementsByTagNameNS(drawNS,'r');
        if (runs.length===0){ curY += 14 * scale; continue; }
        const endParaRPr = para.getElementsByTagNameNS(drawNS, 'endParaRPr')[0];
        const paraStyle = getTextStyleFromProperties(endParaRPr, drawNS, baseStyle, scale);
        const fragments = [];

        for (const run of runs){
          const text = getRunText(run, drawNS);
          if (!text) continue;
          const rPr = run.getElementsByTagNameNS(drawNS,'rPr')[0];
          fragments.push({text, style:getTextStyleFromProperties(rPr, drawNS, paraStyle, scale)});
        }

        const paraText = fragments.map(fragment => fragment.text).join('');
        const textStyle = fragments.find(fragment => fragment.text.trim())?.style || paraStyle;
        if (!paraText.trim()){ curY += textStyle.fontSize * 1.2; continue; }

        ctx.save();
        ctx.font = buildCanvasFont(textStyle);
        ctx.fillStyle = textStyle.color;
        ctx.textBaseline = 'top';
        const words = paraText.split(/\s+/);
        let line = '';
        const lineHeight = textStyle.fontSize * 1.35;
        for (const word of words){
          const test = line ? line + ' ' + word : word;
          const metrics = ctx.measureText(test);
          if (metrics.width > w - 8 * scale && line){
            if (curY + lineHeight < y + h){
              ctx.fillText(line, x + 4 * scale, curY);
              curY += lineHeight;
            }
            line = word;
          } else {
            line = test;
          }
        }
        if (line && curY + lineHeight < y + h){
          ctx.fillText(line, x + 4 * scale, curY);
          curY += lineHeight;
        }
        ctx.restore();
      }
    } catch(e){ /* skip */ }
  }
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

function resolvePptxPath(base, target){
  const clean = (target || '').replace(/\\/g,'/').split('#')[0];
  if (!clean) return '';
  if (clean.startsWith('/')) return clean.slice(1);
  if (clean.startsWith('ppt/')) return clean;
  return normalizePptxPath(base, clean);
}

function getPptxRelsPath(partPath){
  const clean = partPath.replace(/\\/g,'/');
  const slash = clean.lastIndexOf('/');
  const dir = slash === -1 ? '' : clean.slice(0, slash);
  const filename = slash === -1 ? clean : clean.slice(slash + 1);
  return dir ? `${dir}/_rels/${filename}.rels` : `_rels/${filename}.rels`;
}

function getPptxRelationshipId(node, name){
  return node.getAttributeNS(PPTX_REL_NS, name) || node.getAttribute(`r:${name}`) || node.getAttribute(name);
}

async function readPptxRelationships(zip, relsPath, parser){
  const relsXml = await zip.file(relsPath)?.async('string');
  if (!relsXml) return {};
  const relsDoc = parser.parseFromString(relsXml, 'application/xml');
  const map = {};
  for (const rel of getElementsByTagNameAnyNS(relsDoc, 'Relationship')){
    const id = rel.getAttribute('Id');
    const target = rel.getAttribute('Target');
    if (id && target) map[id] = target;
  }
  return map;
}

function getPptxSlideRelIds(presDoc, presXml){
  let ids = getElementsByTagNameAnyNS(presDoc, 'sldId')
    .map(node => node.getAttributeNS(PPTX_REL_NS, 'id') || node.getAttribute('r:id'))
    .filter(Boolean);
  if (!ids.length) ids = Array.from(presXml.matchAll(/<[^>]*sldId[^>]*\sr:id="([^"]+)"/g), m => m[1]);
  return ids;
}

function getPptxSlideNumber(path){
  return parseInt(/\/slide(\d+)\.xml$/i.exec(path)?.[1] || '0', 10);
}

async function getPptxSlideEntries(zip, parser){
  const presXml = await zip.file('ppt/presentation.xml')?.async('string');
  if (!presXml) throw new Error('Not a valid PPTX file (missing ppt/presentation.xml)');
  const presDoc = parser.parseFromString(presXml, 'application/xml');
  const slideRelIds = getPptxSlideRelIds(presDoc, presXml);
  const relMap = await readPptxRelationships(zip, 'ppt/_rels/presentation.xml.rels', parser);
  let entries = slideRelIds
    .map(relId => relMap[relId] ? resolvePptxPath('ppt/presentation.xml', relMap[relId]) : '')
    .filter(path => path && zip.file(path))
    .map(path => ({ path, relsPath: getPptxRelsPath(path) }));

  if (!entries.length) {
    entries = Object.keys(zip.files)
      .filter(path => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
      .sort((a,b)=>getPptxSlideNumber(a)-getPptxSlideNumber(b))
      .map(path => ({ path, relsPath: getPptxRelsPath(path) }));
  }
  if (!entries.length) throw new Error('No slides found in this PPTX.');
  return entries;
}

function getImageMimeFromPath(path){
  const ext = path.split('.').pop().toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'bmp') return 'image/bmp';
  return 'image/jpeg';
}

async function drawZipImage(ctx, zip, imagePath, x, y, width, height){
  if (!imagePath || width <= 0 || height <= 0) return false;
  const mediaFile = zip.file(imagePath);
  if (!mediaFile) return false;
  const imgBytes = await mediaFile.async('uint8array');
  const imgBlob = new Blob([imgBytes], { type: getImageMimeFromPath(imagePath) });
  const imgUrl = URL.createObjectURL(imgBlob);
  return new Promise(resolve=>{
    const img = new Image();
    img.onload = ()=>{
      ctx.drawImage(img, x, y, width, height);
      URL.revokeObjectURL(imgUrl);
      resolve(true);
    };
    img.onerror = ()=>{
      URL.revokeObjectURL(imgUrl);
      resolve(false);
    };
    img.src = imgUrl;
  });
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
  return convertPptxFromFile(file, 1, 'jpeg');
}

async function processMediaFile(file){
  const lower = file.name.toLowerCase();
  try {
    if (lower.endsWith('.pdf')){
      setStatus(`Loading PDF: ${file.name}`);
      const pages = await convertPdfFromFile(file, 1.5, 'jpeg');
      if (pages.length){
        media.push(...pages);
      } else {
        console.warn('PDF conversion produced no pages for', file.name);
        media.push({name:file.name,type:'image/pdf',url:'',source:'pdf',pageNumber:0,pages:0,notes:''});
      }
      renderQueues();
    } else if (lower.endsWith('.pptx')){
      setStatus(`Loading PPTX: ${file.name}`);
      const slides = await convertPptxFromFile(file, 1, 'jpeg');
      if (slides.length){
        media.push(...slides);
      } else {
        console.warn('PPTX conversion produced no slides for', file.name);
        media.push({name:file.name,type:'image/pptx',url:'',source:'pptx',pageNumber:0,pages:0,notes:''});
      }
      renderQueues();
    } else {
      const url = URL.createObjectURL(file);
      const item = {name:file.name,url,type:file.type,file:file,durationFormatted:'Loading...',pages:1,notes:''};
      media.push(item);
      loadFileMetadata(item, renderQueues);
      renderQueues();
    }
  } catch (error) {
    console.error('Media processing failed for', file.name, error);
    setStatus(`Failed to load ${file.name}: ${error.message || 'unknown error'}`);
    const fallback = {name:`${file.name} (failed)`,url:'',type:'error',source:'error',pageNumber:0,pages:0,notes:''};
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
  if (item.skip && (type === 'music' || type === 'media')) li.classList.add('skipped');

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

  if (type === 'music' || type === 'media') {
    const skipLabel = document.createElement('label');
    skipLabel.className = 'skip-toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!item.skip;
    checkbox.addEventListener('click', e => {
      e.stopPropagation();
      item.skip = checkbox.checked;
      li.classList.toggle('skipped', !!item.skip);
      updateButtonStates();
    });
    skipLabel.appendChild(checkbox);
    skipLabel.appendChild(document.createTextNode('Skip'));
    actions.appendChild(skipLabel);
  }

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
  updateMediaNotesUI();
}

function getSelectedMediaItem(){
  return currentMediaIndex >= 0 && currentMediaIndex < media.length ? media[currentMediaIndex] : null;
}

function updateMediaNotesUI(){
  if (!mediaNotes) return;
  const item = getSelectedMediaItem();
  mediaNotes.disabled = !item;
  mediaNotes.value = item?.notes || '';
  mediaNotes.placeholder = item ? `Notes for ${item.name}` : 'Select an image or slide to edit notes';
}

if (mediaNotes) {
  mediaNotes.addEventListener('input', ()=>{
    const item = getSelectedMediaItem();
    if (item) item.notes = mediaNotes.value;
  });
}

musicFiles.addEventListener('change', e=>{
  const files = Array.from(e.target.files);
  files.forEach(f=>{
    const url = URL.createObjectURL(f);
    const item = {name:f.name,url, type:f.type,file:f, durationFormatted:'Loading...'};
    songs.push(item);
    loadFileMetadata(item, renderQueues);
  });
  renderQueues();
});

soundboardFiles.addEventListener('change', e=>{
  const files = Array.from(e.target.files);
  files.forEach(f=>{
    const url = URL.createObjectURL(f);
    const item = {name:f.name,url, type:f.type,file:f, durationFormatted:'Loading...'};
    soundboardSounds.push(item);
    loadFileMetadata(item, renderSoundboardGrid);
  });
  renderSoundboardGrid();
});

function renderMusicQueue(){
  musicQueue.innerHTML = '';
  songs.forEach((s,i)=>{
    const li = createListItem(s,i,'music');
    musicQueue.appendChild(li);
  });
  updateQueueProgress('music');
}

function renderSoundboardGrid(){
  if (!soundboardGrid) return;
  soundboardGrid.innerHTML = '';
  soundboardSounds.forEach((s,i)=>{
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'soundboard-button';
    button.textContent = s.name;
    button.addEventListener('click', ()=>{
      const sound = new Audio(s.url);
      const m = parseFloat(masterVolume?.value) || 1;
      const sv = parseFloat(soundboardVolume?.value) || 1;
      sound.volume = m * sv;
      if (selectedOutputDeviceId && typeof sound.setSinkId === 'function'){
        sound.setSinkId(selectedOutputDeviceId).catch(err=>{ console.warn('Unable to route soundboard audio:', err); });
      }
      sound.play().catch(()=>{});
    });
    soundboardGrid.appendChild(button);
  });
}

function playSongAt(i){
  if (i<0 || i>=songs.length) return;
  
  const useTransition = musicTransition && musicTransition.checked;
  const isPlaying = musicPlaying && musicAudio.src && !musicAudio.paused;
  
  currentSongIndex = i;
  
  if (useTransition && isPlaying) {
    // Fade out current song
    const oldVolume = musicAudio.volume;
    const steps = 15;
    let step = 0;
    const fadeInterval = setInterval(() => {
      step++;
      musicAudio.volume = Math.max(0, oldVolume * (1 - step / steps));
      if (step >= steps) {
        clearInterval(fadeInterval);
        
        musicAudio.src = songs[i].url;
        musicAudio.volume = 0;
        musicAudio.play().catch(() => {});
        
        // Fade in new song
        const targetVolume = (parseFloat(masterVolume?.value) || 1) * (parseFloat(musicVolume?.value) || 1);
        let inStep = 0;
        const fadeInInterval = setInterval(() => {
          inStep++;
          musicAudio.volume = Math.min(targetVolume, targetVolume * (inStep / steps));
          if (inStep >= steps) {
            clearInterval(fadeInInterval);
            musicAudio.volume = targetVolume;
          }
        }, 300 / steps);
      }
    }, 300 / steps);
  } else {
    musicAudio.src = songs[i].url;
    musicAudio.play().catch(() => {});
    applyVolumeSettings();
  }
  
  musicPlaying = true;
  updateMusicUI();
  updateButtonStates();
}

function findNextPlayableSongIndex(startIndex){
  let i = startIndex + 1;
  while (i < songs.length){
    if (!songs[i].skip) return i;
    i += 1;
  }
  return -1;
}

function findPreviousPlayableSongIndex(startIndex){
  let i = startIndex - 1;
  while (i >= 0){
    if (!songs[i].skip) return i;
    i -= 1;
  }
  return -1;
}

musicPlay.addEventListener('click', ()=>{
  if (currentSongIndex === -1 || songs[currentSongIndex]?.skip) {
    const startIndex = findNextPlayableSongIndex(currentSongIndex);
    if (startIndex !== -1) playSongAt(startIndex);
  } else {
    musicAudio.play();
  }
  musicPlaying = true;
  updateMusicUI();
  updateButtonStates();
});
musicPause.addEventListener('click', ()=>{ musicAudio.pause(); musicPlaying=false; updateButtonStates(); });

if (musicLoopModeSelect) {
  musicLoopModeSelect.addEventListener('change', ()=>{
    musicLoopMode = musicLoopModeSelect.value || 'off';
  });
}

musicShuffleButton.addEventListener('click', ()=>{
  const currentSong = songs[currentSongIndex];
  songs = songs.sort(()=>Math.random()-0.5);
  currentSongIndex = currentSong ? songs.indexOf(currentSong) : -1;
  renderMusicQueue();
});

// Music previous/next navigation
musicPrev.addEventListener('click', ()=>{
  const prevIndex = currentSongIndex === -1 ? findPreviousPlayableSongIndex(songs.length) : findPreviousPlayableSongIndex(currentSongIndex);
  if (prevIndex !== -1) playSongAt(prevIndex);
});
musicNext.addEventListener('click', ()=>{
  const nextIndex = currentSongIndex === -1 ? findNextPlayableSongIndex(-1) : findNextPlayableSongIndex(currentSongIndex);
  if (nextIndex !== -1) playSongAt(nextIndex);
});

musicAudio.addEventListener('timeupdate', ()=>{
  updateQueueProgress('music');
  updateMusicProgression();
});

musicAudio.addEventListener('ended', ()=>{
  if (musicLoopMode === 'single'){
    musicAudio.currentTime = 0;
    musicAudio.play();
    return;
  }
  // Play on finish logic
  if (musicPlayOnFinish && !musicPlayOnFinish.checked) {
    musicPlaying = false;
    updateMusicUI();
    updateButtonStates();
    return;
  }
  const next = findNextPlayableSongIndex(currentSongIndex);
  if (next !== -1) {
    playSongAt(next);
    return;
  }
  if (musicLoopMode === 'all') {
    const first = findNextPlayableSongIndex(-1);
    if (first !== -1) {
      playSongAt(first);
      return;
    }
  }
  musicPlaying=false;
  updateMusicUI();
  updateButtonStates();
});

musicAudio.addEventListener('play', ()=>{ updateMusicUI(); updateButtonStates(); });
musicAudio.addEventListener('pause', ()=>{ updateMusicUI(); updateButtonStates(); });

function updateMusicProgression(){
  const cpProgression = document.getElementById('cpMusicProgression');
  if (!cpProgression) return;
  const current = musicAudio.currentTime || 0;
  const duration = musicAudio.duration || 0;
  const currentStr = current > 0 ? formatDuration(current) : '0:00';
  const durationStr = duration > 0 ? formatDuration(duration) : '0:00';
  cpProgression.textContent = `${currentStr} / ${durationStr}`;
}

function updateMusicUI(){
  const name = (currentSongIndex>=0 && songs[currentSongIndex])? songs[currentSongIndex].name : 'No song';
  if (currentSongEl) currentSongEl.textContent = name;
  // Sync CP mini panel
  const cpSong = document.getElementById('cpCurrentSong');
  if (cpSong) cpSong.textContent = name;
  const lis = musicQueue.querySelectorAll('li');
  lis.forEach(li=> li.classList.toggle('active', parseInt(li.dataset.index)===currentSongIndex));
  updateMusicProgression();
}


function updateButtonStates(){
  musicPlay.classList.toggle('active-play', musicPlaying);
  musicPlay.classList.toggle('inactive', !musicPlaying);
  musicPause.classList.toggle('active-pause', !musicPlaying);
  musicPause.classList.toggle('inactive', musicPlaying);

  if (cpMusicPlay) {
    cpMusicPlay.classList.toggle('active-play', musicPlaying);
    cpMusicPlay.classList.toggle('inactive', !musicPlaying);
  }
  if (cpMusicPause) {
    cpMusicPause.classList.toggle('active-pause', !musicPlaying);
    cpMusicPause.classList.toggle('inactive', musicPlaying);
  }

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

function isPlayableMediaIndex(index){
  return index >= 0 && index < media.length && !media[index].skip;
}

function findNextPlayableMediaIndex(startIndex, direction){
  let i = startIndex + direction;
  while (i >= 0 && i < media.length){
    if (!media[i].skip) return i;
    i += direction;
  }
  return -1;
}

function openDisplayWindow(){
  if (displayWindow && !displayWindow.closed) { displayWindow.focus(); return; }
  displayWindow = window.open('media.html','EventDisplay','width=1280,height=720');
}

openDisplay.addEventListener('click', openDisplayWindow);
mediaPrevPreview?.addEventListener('click', () => showMediaAt(Math.max(0, currentMediaIndex - 1)));
mediaNextPreview?.addEventListener('click', () => showMediaAt(Math.min(media.length - 1, currentMediaIndex + 1)));
window.addEventListener('resize', refreshMediaPreviewSize);

window.addEventListener('message', e => {
  const msg = e.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'videoEnded') {
    advanceMedia();
  }
});

function showMediaAt(i, autoplay = true){
  if (i<0 || i>=media.length) return;
  currentMediaIndex = i;
  updateMediaUI();
  
  const useTransition = mediaTransition && mediaTransition.checked;
  if (useTransition) {
    const mirror1 = mediaMirrorContent;
    const mirror2 = document.getElementById('cpMediaMirrorContent');
    [mirror1, mirror2].forEach(m => {
      if (m) {
        m.style.transition = 'opacity 0.15s ease';
        m.style.opacity = '0';
      }
    });
    setTimeout(() => {
      updateMediaMirror(media[i], autoplay);
      [mirror1, mirror2].forEach(m => {
        if (m) m.style.opacity = '1';
      });
    }, 150);
  } else {
    updateMediaMirror(media[i], autoplay);
  }
  
  sendMediaToDisplay(media[i], autoplay, useTransition);
  if (mediaLooping) scheduleMediaAdvance();
  updateButtonStates();
}

function sendMediaToDisplay(item, autoplay = true, transition = false){
  if (!displayWindow || displayWindow.closed) openDisplayWindow();
  const msg = {type:'show', item:{name:item.name,url:item.url,type:item.type, muted: (mediaMuteAudio ? !!mediaMuteAudio.checked : true), autoplay}, transition};
  // wait for popup to be ready
  setTimeout(()=> displayWindow.postMessage(msg,'*'),200);
}

function updateMediaUI(){
  const name = (currentMediaIndex>=0 && media[currentMediaIndex])? media[currentMediaIndex].name : 'No media';
  if (currentMediaEl) currentMediaEl.textContent = name;
  // Sync CP mini panel
  const cpMedia = document.getElementById('cpCurrentMedia');
  if (cpMedia) cpMedia.textContent = name;
  const lis = mediaQueue.querySelectorAll('li');
  lis.forEach(li=> li.classList.toggle('active', parseInt(li.dataset.index)===currentMediaIndex));
  updateMediaNotesUI();
  updateQueueProgress('media');
  refreshMediaPreviewSize();
  updateMediaPreviewCards();
  syncCpMirror();
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

function updateMediaMirror(item, autoplay = true){
  if (mediaMirrorContent) {
    mediaMirrorContent.innerHTML = '';
    if (!item) {
      mediaMirrorContent.textContent = 'Nothing displayed';
      refreshMediaPreviewSize();
    } else if (item.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = item.name;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      mediaMirrorContent.appendChild(img);
    } else if (item.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = item.url;
      video.controls = false;
      video.autoplay = autoplay;
      video.muted = (mediaMuteAudio ? !!mediaMuteAudio.checked : true);
      video.loop = false;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'contain';
      video.addEventListener('timeupdate', ()=> updateQueueProgress('media'));
      mediaMirrorContent.appendChild(video);
    } else {
      mediaMirrorContent.textContent = item.name;
    }
    refreshMediaPreviewSize();
  }
  syncCpMirror(item);
}

function updateMediaPreviewCards(){
  refreshMediaPreviewSize();
  const prevItem = currentMediaIndex > 0 ? media[currentMediaIndex - 1] : null;
  const nextItem = currentMediaIndex >= 0 && currentMediaIndex < media.length - 1 ? media[currentMediaIndex + 1] : null;
  renderPreviewCard(mediaPrevPreview, prevItem, 'Previous');
  renderPreviewCard(mediaNextPreview, nextItem, 'Next');
}

function refreshMediaPreviewSize(){
  if (!mediaMirror || !mediaMirrorContent) return;
  const rect = mediaMirrorContent.getBoundingClientRect();
  mediaMirror.style.setProperty('--mirror-display-width', `${rect.width}px`);
  mediaMirror.style.setProperty('--mirror-display-height', `${rect.height}px`);
}

function renderPreviewCard(button, item, label){
  if (!button) return;
  button.style.width = '';
  button.style.height = '';
  button.style.flex = '0 0 auto';
  const rect = mediaMirrorContent ? mediaMirrorContent.getBoundingClientRect() : null;
  if (rect && rect.width > 0 && rect.height > 0) {
    const halfWidth = Math.max(0, Math.round(rect.width / 2 - 5));
    const halfHeight = Math.max(0, Math.round(rect.height / 2 - 5));
    button.style.width = `${halfWidth}px`;
    button.style.height = `${halfHeight}px`;
  }
  button.disabled = !item;
  const labelEl = button.querySelector('.preview-label');
  const contentEl = button.querySelector('.preview-content');
  if (labelEl) labelEl.textContent = label;
  if (!contentEl) return;
  contentEl.innerHTML = '';
  if (!item){
    contentEl.textContent = 'No preview';
    return;
  }
  const thumbWrapper = document.createElement('div');
  thumbWrapper.className = 'preview-thumb';
  if (item.type.startsWith('image/')){
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.name || 'Image preview';
    thumbWrapper.appendChild(img);
  } else {
    const icon = document.createElement('div');
    icon.className = 'preview-icon';
    icon.textContent = item.type.startsWith('video/') ? 'Video' : item.type === 'slide' ? 'Slide' : 'Media';
    thumbWrapper.appendChild(icon);
  }
  const title = document.createElement('div');
  title.className = 'preview-title';
  title.textContent = item.name || 'Untitled';
  contentEl.appendChild(thumbWrapper);
  contentEl.appendChild(title);
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
  if (mediaLoopMode === 'single') {
    showMediaAt(currentMediaIndex);
    return;
  }
  // Play on finish logic
  if (mediaPlayOnFinish && !mediaPlayOnFinish.checked) {
    mediaPlaying = false;
    mediaLooping = false;
    stopMediaLoop();
    updateButtonStates();
    return;
  }
  const nextIndex = findNextPlayableMediaIndex(currentMediaIndex, 1);
  if (nextIndex !== -1) {
    currentMediaIndex = nextIndex;
    showMediaAt(currentMediaIndex);
    return;
  }
  if (mediaLoopMode === 'all') {
    const firstIndex = findNextPlayableMediaIndex(-1, 1);
    if (firstIndex !== -1) {
      currentMediaIndex = firstIndex;
      showMediaAt(currentMediaIndex);
      return;
    }
  }
  mediaPlaying = false;
  mediaLooping = false;
  stopMediaLoop();
  updateButtonStates();
}

mediaPlay.addEventListener('click', ()=>{
  if (media.length===0) return;
  if (currentMediaIndex === -1 || media[currentMediaIndex]?.skip) {
    const startIndex = findNextPlayableMediaIndex(currentMediaIndex, 1);
    if (startIndex === -1) return;
    currentMediaIndex = startIndex;
  }
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

if (mediaLoopModeSelect) {
  mediaLoopModeSelect.addEventListener('change', ()=>{
    mediaLoopMode = mediaLoopModeSelect.value || 'off';
  });
}

// Media previous/next navigation
mediaPrev.addEventListener('click', ()=>{
  const prevIndex = currentMediaIndex === -1 ? findNextPlayableMediaIndex(media.length, -1) : findNextPlayableMediaIndex(currentMediaIndex, -1);
  if (prevIndex !== -1) showMediaAt(prevIndex);
});
mediaNext.addEventListener('click', ()=>{
  const nextIndex = currentMediaIndex === -1 ? findNextPlayableMediaIndex(-1, 1) : findNextPlayableMediaIndex(currentMediaIndex, 1);
  if (nextIndex !== -1) showMediaAt(nextIndex);
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
  const target = (parseFloat(masterVolume.value)||1) * (parseFloat(musicVolume?.value)||1);
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
applyVolumeSettings();
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
  const statusEl2 = document.getElementById('status');
  if (statusEl2) statusEl2.textContent = s;
},1000);

// ===== PAGE NAVIGATION =====
(function initPageNav(){
  const tabs = document.querySelectorAll('.page-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Hide all pages
      document.querySelectorAll('.page').forEach(p => p.classList.add('page--hidden'));
      // Deactivate all tabs
      tabs.forEach(t => t.classList.remove('page-tab--active'));
      // Show target page
      const target = tab.dataset.page;
      const page = document.getElementById(target);
      if (page) page.classList.remove('page--hidden');
      tab.classList.add('page-tab--active');
      // Trigger resize for mirror display after page switch
      setTimeout(refreshMediaPreviewSize, 50);
    });
  });
})();

// ===== CP MINI PANEL SYNC =====

// Sync CP mirror display with current media
function syncCpMirror(item){
  const cpMirrorContent = document.getElementById('cpMediaMirrorContent');
  if (!cpMirrorContent) return;
  const current = item !== undefined ? item : (currentMediaIndex >= 0 ? media[currentMediaIndex] : null);
  cpMirrorContent.innerHTML = '';
  if (!current) {
    cpMirrorContent.textContent = 'Nothing displayed';
    return;
  }
  if (current.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = current.url;
    img.alt = current.name;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block';
    cpMirrorContent.appendChild(img);
  } else if (current.type.startsWith('video/')) {
    const icon = document.createElement('div');
    icon.textContent = '▶ ' + current.name;
    icon.style.cssText = 'color:#888;font-size:.75rem;text-align:center;padding:8px';
    cpMirrorContent.appendChild(icon);
  } else {
    cpMirrorContent.textContent = current.name;
  }
}

// CP Music controls
if (cpMusicPlay) cpMusicPlay.addEventListener('click', () => musicPlay.click());
if (cpMusicPause) cpMusicPause.addEventListener('click', () => musicPause.click());
if (cpMusicPrev) cpMusicPrev.addEventListener('click', () => musicPrev.click());
if (cpMusicNext) cpMusicNext.addEventListener('click', () => musicNext.click());
if (cpMusicVolume) {
  cpMusicVolume.addEventListener('input', () => {
    if (musicVolume) musicVolume.value = cpMusicVolume.value;
    applyVolumeSettings();
  });
  // Keep in sync when audio page slider changes
  if (musicVolume) musicVolume.addEventListener('input', () => { cpMusicVolume.value = musicVolume.value; });
}

// CP Media controls
if (cpMediaPrev) cpMediaPrev.addEventListener('click', () => mediaPrev.click());
if (cpMediaNext) cpMediaNext.addEventListener('click', () => mediaNext.click());

// Sync CP notes with the main notes textarea
if (cpMediaNotes && mediaNotes) {
  // When main notes change, sync to CP
  mediaNotes.addEventListener('input', () => {
    cpMediaNotes.value = mediaNotes.value;
  });
  // When CP notes change, sync back to main
  cpMediaNotes.addEventListener('input', () => {
    mediaNotes.value = cpMediaNotes.value;
    const item = getSelectedMediaItem();
    if (item) item.notes = cpMediaNotes.value;
  });
}

// Patch updateMediaNotesUI to also update CP notes
const _origUpdateMediaNotesUI = updateMediaNotesUI;
updateMediaNotesUI = function(){
  _origUpdateMediaNotesUI();
  if (!cpMediaNotes || !mediaNotes) return;
  cpMediaNotes.disabled = mediaNotes.disabled;
  cpMediaNotes.value = mediaNotes.value;
  cpMediaNotes.placeholder = mediaNotes.placeholder;
};

// Sync Music checkboxes
if (musicPlayOnFinish && cpMusicPlayOnFinish) {
  musicPlayOnFinish.addEventListener('change', () => { cpMusicPlayOnFinish.checked = musicPlayOnFinish.checked; });
  cpMusicPlayOnFinish.addEventListener('change', () => { musicPlayOnFinish.checked = cpMusicPlayOnFinish.checked; });
}
if (musicTransition && cpMusicTransition) {
  musicTransition.addEventListener('change', () => { cpMusicTransition.checked = musicTransition.checked; });
  cpMusicTransition.addEventListener('change', () => { musicTransition.checked = cpMusicTransition.checked; });
}

// Sync Slides checkboxes
if (mediaPlayOnFinish && cpMediaPlayOnFinish) {
  mediaPlayOnFinish.addEventListener('change', () => { cpMediaPlayOnFinish.checked = mediaPlayOnFinish.checked; });
  cpMediaPlayOnFinish.addEventListener('change', () => { mediaPlayOnFinish.checked = cpMediaPlayOnFinish.checked; });
}
if (mediaTransition && cpMediaTransition) {
  mediaTransition.addEventListener('change', () => { cpMediaTransition.checked = mediaTransition.checked; });
  cpMediaTransition.addEventListener('change', () => { mediaTransition.checked = cpMediaTransition.checked; });
}

// Clock Widget tab toggling
function showClockPane(pane) {
  [clockDisplay, stopwatchDisplay, timerDisplay].forEach(d => d?.classList.add('hidden'));
  [btnClockMode, btnStopwatchMode, btnTimerMode].forEach(b => b?.classList.remove('active'));
  
  if (pane === 'clock') {
    clockDisplay?.classList.remove('hidden');
    btnClockMode?.classList.add('active');
  } else if (pane === 'stopwatch') {
    stopwatchDisplay?.classList.remove('hidden');
    btnStopwatchMode?.classList.add('active');
  } else if (pane === 'timer') {
    timerDisplay?.classList.remove('hidden');
    btnTimerMode?.classList.add('active');
  }
}

btnClockMode?.addEventListener('click', () => showClockPane('clock'));
btnStopwatchMode?.addEventListener('click', () => showClockPane('stopwatch'));
btnTimerMode?.addEventListener('click', () => showClockPane('timer'));

// Stopwatch Logic
let stopwatchRunning = false;
let stopwatchTimeMs = 0;
let stopwatchInterval = null;

function updateStopwatchDisplay() {
  if (!stopwatchTime) return;
  const elapsedSec = Math.floor(stopwatchTimeMs / 1000);
  const min = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
  const sec = (elapsedSec % 60).toString().padStart(2, '0');
  const tenths = Math.floor((stopwatchTimeMs % 1000) / 100).toString();
  stopwatchTime.textContent = `${min}:${sec}.${tenths}`;
}

btnStopwatchStart?.addEventListener('click', () => {
  if (!stopwatchRunning) {
    stopwatchRunning = true;
    if (btnStopwatchStart) btnStopwatchStart.textContent = 'Pause';
    const startTime = Date.now() - stopwatchTimeMs;
    stopwatchInterval = setInterval(() => {
      stopwatchTimeMs = Date.now() - startTime;
      updateStopwatchDisplay();
    }, 100);
  } else {
    stopwatchRunning = false;
    if (btnStopwatchStart) btnStopwatchStart.textContent = 'Start';
    clearInterval(stopwatchInterval);
  }
});

btnStopwatchReset?.addEventListener('click', () => {
  stopwatchRunning = false;
  clearInterval(stopwatchInterval);
  stopwatchTimeMs = 0;
  updateStopwatchDisplay();
  if (btnStopwatchStart) btnStopwatchStart.textContent = 'Start';
});

// Timer Logic
let timerRunning = false;
let timerSecondsRemaining = 300;
let timerInterval = null;
let timerFlashInterval = null;

function updateTimerDisplay() {
  if (!timerTime) return;
  const min = Math.floor(timerSecondsRemaining / 60).toString().padStart(2, '0');
  const sec = (timerSecondsRemaining % 60).toString().padStart(2, '0');
  timerTime.textContent = `${min}:${sec}`;
}

btnTimerStart?.addEventListener('click', () => {
  if (!timerRunning) {
    const minInput = parseInt(timerInputMin?.value) || 0;
    const secInput = parseInt(timerInputSec?.value) || 0;
    const totalSec = minInput * 60 + secInput;
    
    if (timerSecondsRemaining <= 0 || timerSecondsRemaining === 300) {
      timerSecondsRemaining = totalSec;
    }
    
    if (timerSecondsRemaining <= 0) return;
    
    timerRunning = true;
    if (btnTimerStart) btnTimerStart.textContent = 'Pause';
    
    timerInterval = setInterval(() => {
      timerSecondsRemaining--;
      updateTimerDisplay();
      
      if (timerSecondsRemaining <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        if (btnTimerStart) btnTimerStart.textContent = 'Start';
        flashTimerAlert();
      }
    }, 1000);
  } else {
    timerRunning = false;
    if (btnTimerStart) btnTimerStart.textContent = 'Start';
    clearInterval(timerInterval);
  }
});

btnTimerReset?.addEventListener('click', () => {
  timerRunning = false;
  clearInterval(timerInterval);
  const minInput = parseInt(timerInputMin?.value) || 5;
  const secInput = parseInt(timerInputSec?.value) || 0;
  timerSecondsRemaining = minInput * 60 + secInput;
  updateTimerDisplay();
  if (btnTimerStart) btnTimerStart.textContent = 'Start';
  stopFlashTimerAlert();
});

function flashTimerAlert() {
  stopFlashTimerAlert();
  if (!stopwatchPanel) return;
  stopwatchPanel.classList.add('timer-alarm');
}

function stopFlashTimerAlert() {
  if (stopwatchPanel) {
    stopwatchPanel.classList.remove('timer-alarm');
  }
}
