class ShackAudioProcessor extends AudioWorkletProcessor {


  process(inputList, outputList, parameters) {
    const input = inputList[0];
    if(input.length > 0){
        const sample = input[0]; 
        
    }

    return true;    
  }
  
}

registerProcessor("shack-audio-processor", ShackAudioProcessor);