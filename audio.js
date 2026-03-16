import Meyda from "meyda";

function processMath(audioData){
const bufferSize = 4096;
const constellation = [];
Meyda.sampleRate = 16000;

for(let i=0;i<=audioData.length - bufferSize;i+=bufferSize){
    const chunk = audioData.slice(i,i + bufferSize);
    const features = Meyda.extract(['spectralPeak','rms'], chunk); 
 
    if(features.rms > 0.01){
        constellation.push({
            f: Math.round(features.spectralPeak),
            t: Number((i/16000).toFixed(2)),
            mag: features.rms
        });
    }     
}
const topPeaks = constellation
  .sort((a,b) => b.mag - a.mag)
  .slice(0,30)
  .map(p => ({f: p.f , t: p.t}));

  sendToBackend(topPeaks);

}

const audio_context = new AudioContext({
    sampleRate:16000
});
const button = document.querySelector('#Audio_processing');

button.addEventListener('click',async ()=>{
    let finalRecording = new Float32Array(80000);
    let totalSamplesCaptured = 0; 

    if(audio_context.state === "suspended") audio_context.resume();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const source = audio_context.createMediaStreamSource(stream);

    await audio_context.audioWorklet.addModule('audio_processor.js'); 
    const nodeInstance = new AudioWorkletNode(audio_context, 'shack-audio-processor');

    const recordParam = nodeInstance.parameters.get('isRecording');
    recordParam.setValueAtTime(1, audio_context.currentTime);
    recordParam.setValueAtTime(0, audio_context.currentTime + 5);
    
    nodeInstance.port.onmessage = (event)=>{
        const SampleBrick = event.data;
       if(totalSamplesCaptured + SampleBrick.length <= finalRecording.length){
        finalRecording.set(SampleBrick,totalSamplesCaptured);
        totalSamplesCaptured += SampleBrick.length;
       } 
    };
    source.connect(nodeInstance);
});