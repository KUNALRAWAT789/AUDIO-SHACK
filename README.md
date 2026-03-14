To Make sense of the code and its workins

// To get audio from the user via the web Api we first need to create an Inatance of AudioContext;
// const audioContext = new AudioContext(); // bare bone example.

//Next we get the element resposible for Starting the Audio gathering Process;
// const button = document.querySelector('#Audio_processing');

//Next we Create an Async Function that Triggers whne thw user clicks the button;
//the Audio context by default is Suspended so we Activate it only when the function is triggered since we only want audio when user clicks on it;
//
 button.addEventListener('click',async ()=>{
    if(audio_context.state === "suspended") audio_context.resume();

// To get the mic and audio Stream
// The navigator.mediaDevices.getUserMedia() method prompts the user for permission to use their microphone.
// Returns a Media Stream Object.
// That Media Stream object is then Passed on to //  createMediaStreamSource(stream) ;
// The MediaStream is to serve as an audio source to be fed into an audio processing graph for use and manipulation.

//Once the Audio stream is secured we Want to process it on a different thread so as to not overload the Main thread.
// To do this we add aur processing file as a module to audiocontext worklet;
// await audio_context.audioWorklet.addModule('audio_processor.js'); 

//We use  const nodeInstance = new AudioWorkletNode(audio_context, 'shack-audio-processor');
// To connect the audio context which has the audio source to aur Shack-audio-processor which is the name given by us to the module we just added;
//First we added the code using the file name and then we an Instance using the name given inside the file;

//now to communicate with this separate file and to get the results of the processing The nodeInstance provides the port property;
// It listens for the postMessage events coming from the background.
// We can also give custom parameters
// Here we are recieving the the data from the separate processing file;
// nodeInstance.port.onmessage = (event)=>{
        const samples = event.data;
    };
   
// Connects the audio Source to the processor instance
// source.connect(nodeInstance);
    
