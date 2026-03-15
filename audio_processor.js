class ShackAudioProcessor extends AudioWorkletProcessor {
  constructor(){
    super();
    this.buffersize = 4096;
    this.buffer = new Float32Array(this.buffersize);
    this.currentindex = 0;
  }
  static get parameterDescriptors(){
   return[{name : 'isRecording',
    defaultValue : 0
   }] 
  }

  process(inputList, outputList, parameters) {
    const inputchannel = inputList[0][0];
    const isRecording = parameters.isRecording[0];

    if(isRecording===1 && inputchannel){

      if(this.currentindex + 128 <= this.buffersize){
        this.buffer.set(inputchannel,this.currentindex);
        this.currentindex += 128;
      }

      if(this.currentindex >= this.buffersize){
        this.port.postMessage(new Float32Array(this.buffer));
        this.currentindex = 0;
      }
    }

    return true;    
  }
  
}

registerProcessor("shack-audio-processor", ShackAudioProcessor);