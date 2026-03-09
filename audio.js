const audio_context = new AudioContext();
const button = document.querySelector('Audio_processing');

button.addEventListener('click',()=>{
    if(audio_context.state === "suspended") audio_context.resume();
});