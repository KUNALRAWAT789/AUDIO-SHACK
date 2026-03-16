const audio_context = new AudioContext({
    sampleRate:16000
});
const button = document.querySelector('#Audio_processing');

button.addEventListener('click',async ()=>{
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