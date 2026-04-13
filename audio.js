const Meyda = window.Meyda;

// ── Constants — must match bulkaudioprocessor.js exactly ─────────────────────
const FAN_OUT             = 10;    // reduced from 15 — keeps hash count manageable
const TIME_WINDOW         = 2.0;
const FRAME_SIZE          = 512;
const SAMPLE_RATE         = 16000;
const TOP_PEAKS_PER_FRAME = 3;     // reduced from 5 — fewer but higher quality peaks
const MAX_CONSTELLATION   = 200;   // reduced from 600 — tighter cap on points
const RMS_THRESHOLD       = 0.003;

const NOISE_PROFILE_FRAMES = Math.ceil((0.5 * SAMPLE_RATE) / FRAME_SIZE);
const ALPHA        = 1.5;
const NOISE_SMOOTH = 0.85;

// ── Hann window ───────────────────────────────────────────────────────────────
const hannWindow = new Float32Array(FRAME_SIZE);
for (let i = 0; i < FRAME_SIZE; i++) {
  hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FRAME_SIZE - 1)));
}
function applyWindow(frame) {
  const w = new Float32Array(FRAME_SIZE);
  for (let i = 0; i < FRAME_SIZE; i++) w[i] = frame[i] * hannWindow[i];
  return w;
}

// ── Noise profile estimation ──────────────────────────────────────────────────
function estimateNoiseProfile(audioData) {
  const numBins = FRAME_SIZE / 2;
  const profile = new Float32Array(numBins);
  let framesUsed = 0;

  for (let i = 0; i < NOISE_PROFILE_FRAMES; i++) {
    const start = i * FRAME_SIZE;
    if (start + FRAME_SIZE > audioData.length) break;
    const features = Meyda.extract(['amplitudeSpectrum'], applyWindow(audioData.slice(start, start + FRAME_SIZE)));
    if (!features) continue;
    for (let b = 0; b < numBins; b++) profile[b] += features.amplitudeSpectrum[b];
    framesUsed++;
  }
  if (framesUsed > 0) for (let b = 0; b < numBins; b++) profile[b] /= framesUsed;
  console.log(`[DEBUG] Noise profile built from ${framesUsed} frames`);
  return profile;
}

// ── Spectral subtraction ──────────────────────────────────────────────────────
function spectralSubtraction(spectrum, noiseProfile) {
  const cleaned = new Float32Array(spectrum.length);
  for (let b = 0; b < spectrum.length; b++) {
    cleaned[b] = Math.max(spectrum[b] - ALPHA * noiseProfile[b], 0);
  }
  return cleaned;
}

// ── Wiener filter ─────────────────────────────────────────────────────────────
function wienerFilter(spectrum, noiseProfile) {
  const filtered = new Float32Array(spectrum.length);
  for (let b = 0; b < spectrum.length; b++) {
    const sp = spectrum[b] ** 2;
    const np = noiseProfile[b] ** 2;
    filtered[b] = spectrum[b] * (sp / (sp + np + 1e-10));
  }
  return filtered;
}

// ── Result renderers ──────────────────────────────────────────────────────────
function showMatch(title, artist, confidence) {
  const result = document.querySelector('#result');
  result.innerHTML = '';
  const titleEl = document.createElement('div');
  titleEl.className = 'result-title'; titleEl.textContent = title;
  const artistEl = document.createElement('div');
  artistEl.className = 'result-artist'; artistEl.textContent = artist;
  const confEl = document.createElement('div');
  confEl.className = 'result-confidence'; confEl.textContent = `Confidence: ${confidence}`;
  result.appendChild(titleEl);
  result.appendChild(artistEl);
  result.appendChild(confEl);
}
function showNoMatch() {
  const result = document.querySelector('#result');
  result.innerHTML = '';
  const msg = document.createElement('div');
  msg.className = 'result-no-match'; msg.textContent = 'No match found. Try again!';
  result.appendChild(msg);
}
function showError(message) {
  const result = document.querySelector('#result');
  result.innerHTML = '';
  const msg = document.createElement('div');
  msg.className = 'result-error'; msg.textContent = message;
  result.appendChild(msg);
}

// ── Fingerprinting ────────────────────────────────────────────────────────────
function generateHashes(peaks) {
  const hashes = [];
  for (let i = 0; i < peaks.length; i++) {
    const anchor = peaks[i];
    let partnersFound = 0;
    for (let j = i + 1; j < peaks.length && partnersFound < FAN_OUT; j++) {
      const partner = peaks[j];
      const dt = partner.t - anchor.t;
      if (dt <= 0 || dt > TIME_WINDOW) continue;
      const f1  = Math.min(anchor.f,  8000);
      const f2  = Math.min(partner.f, 8000);
      const dtQ = Math.min(Math.round(dt / TIME_WINDOW * 255), 255);
      hashes.push({ hash: `${f1}:${f2}:${dtQ}`, anchorTime: anchor.t });
      partnersFound++;
    }
  }
  return hashes;
}

// ── Main processing pipeline ──────────────────────────────────────────────────
function processMath(audioData) {
  if (!Meyda) { console.error("Meyda not found."); return; }
  Meyda.sampleRate = SAMPLE_RATE;

  const noiseProfile = estimateNoiseProfile(audioData);
  let runningNoise   = new Float32Array(noiseProfile);

  const constellation = [];
  let framesProcessed = 0;
  let framesSilenced  = 0;

  for (let i = NOISE_PROFILE_FRAMES * FRAME_SIZE; i <= audioData.length - FRAME_SIZE; i += FRAME_SIZE) {
    const features = Meyda.extract(['amplitudeSpectrum', 'rms'], applyWindow(audioData.slice(i, i + FRAME_SIZE)));
    framesProcessed++;

    if (!features || typeof features.rms !== 'number' || features.rms <= RMS_THRESHOLD) {
      framesSilenced++;
      continue;
    }

    const cleaned  = spectralSubtraction(features.amplitudeSpectrum, noiseProfile);
    const filtered = wienerFilter(cleaned, runningNoise);

    for (let b = 0; b < runningNoise.length; b++) {
      runningNoise[b] = NOISE_SMOOTH * runningNoise[b] + (1 - NOISE_SMOOTH) * features.amplitudeSpectrum[b];
    }

    const indexed = Array.from(filtered)
      .map((mag, bin) => ({ bin, mag }))
      .sort((a, b) => b.mag - a.mag)
      .filter(p => p.mag > 0)
      .slice(0, TOP_PEAKS_PER_FRAME);

    for (const { bin } of indexed) {
      constellation.push({ f: Math.round(bin * (SAMPLE_RATE / FRAME_SIZE)), t: Number((i / SAMPLE_RATE).toFixed(3)) });
    }
  }

  console.log(`[DEBUG] Frames processed: ${framesProcessed}, silenced: ${framesSilenced}`);
  console.log(`[DEBUG] Constellation points: ${constellation.length}`);

  constellation.sort((a, b) => a.t - b.t);
  const hashes = generateHashes(constellation.slice(0, MAX_CONSTELLATION));
  console.log(`[DEBUG] Hashes generated: ${hashes.length}`);

  if (hashes.length === 0) {
    showError("No hashes generated. Is your mic working?");
    document.querySelector('#status').innerText = "Error";
    return;
  }

  sendToBackend(hashes);
}

// ── Recording ─────────────────────────────────────────────────────────────────
const RECORD_SECONDS = 10;
const audio_context  = new AudioContext({ sampleRate: SAMPLE_RATE });
const button         = document.querySelector('#Audio_processing');

button.addEventListener('click', async () => {
  console.log("[DEBUG] Recording started...");
  let finalRecording       = new Float32Array(SAMPLE_RATE * RECORD_SECONDS);
  let totalSamplesCaptured = 0;

  document.querySelector('#status').innerText = "Listening...";
  document.querySelector('#result').innerHTML = '';

  if (audio_context.state === "suspended") audio_context.resume();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  const source = audio_context.createMediaStreamSource(stream);

  await audio_context.audioWorklet.addModule('audio_processor.js');
  const nodeInstance = new AudioWorkletNode(audio_context, 'shack-audio-processor');

  const recordParam = nodeInstance.parameters.get('isRecording');
  recordParam.setValueAtTime(1, audio_context.currentTime);
  recordParam.setValueAtTime(0, audio_context.currentTime + RECORD_SECONDS);

  nodeInstance.port.onmessage = (event) => {
    const brick = event.data;
    if (totalSamplesCaptured + brick.length <= finalRecording.length) {
      finalRecording.set(brick, totalSamplesCaptured);
      totalSamplesCaptured += brick.length;
    }
  };

  source.connect(nodeInstance);

  setTimeout(() => {
    console.log(`[DEBUG] ${RECORD_SECONDS}s done. Samples: ${totalSamplesCaptured}`);
    stream.getTracks().forEach(t => t.stop());
    nodeInstance.disconnect();
    source.disconnect();
    processMath(finalRecording);
  }, (RECORD_SECONDS * 1000) + 100);
});

// ── Backend ───────────────────────────────────────────────────────────────────
async function sendToBackend(hashes) {
  document.querySelector('#status').innerText = "Identifying...";
  console.log(`[DEBUG] Sending ${hashes.length} hashes to backend...`);

  try {
    const response = await fetch('http://localhost:8000/api/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashes }),
    });

    const result = await response.json();
    console.log("[DEBUG] Backend response:", result);

    if (result.success) {
      showMatch(result.song.title, result.song.artist, result.confidence);
      document.querySelector('#status').innerText = "Match found!";
    } else {
      showNoMatch();
      document.querySelector('#status').innerText = "Ready";
    }
  } catch (error) {
    console.error("[DEBUG] Fetch error:", error);
    showError("Server error. Check if backend is running.");
    document.querySelector('#status').innerText = "Error";
  }
}