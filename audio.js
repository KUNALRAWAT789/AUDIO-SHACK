const audio_context = new AudioContext({
    sampleRate:16000
});
const button = document.querySelector('#Audio_processing');

button.addEventListener('click',async ()=>{
    if(audio_context.state === "suspended") audio_context.resume();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const source = audio_context.createMediaStreamSource(stream);

    await audioContext.audioWorklet.addModule('audio_processor.js'); 
    const nodeInstance = new AudioWorkletNode(audioContext, 'shack-audio-processor');
    
});