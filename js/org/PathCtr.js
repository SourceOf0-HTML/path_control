
/**
 * PathCtr
 * Singleton
 */
var PathCtr = {
  isDebug: false,
  debugPrint: function() {
    if(!this.isDebug) return;
    //console.log("Func : " + this.debugPrint.caller.name);
    for(let i = 0; i < arguments.length; ++i) {
      console.log(arguments[i]);
    }
  },
  
  defaultCanvasContainerID: "path-container",  // default canvas container element name
  defaultActionName: "base",
  defaultBoneName: "bone",
  initTarget: null,  // instance to be initialized
  currentFrame: 0,
  currentActionID: -1,
  binDataPosRange: 20000, // correction value of coordinates when saving to binary data
  
  pathContainer: null,
  context: null,
  subContext: null,
  viewWidth: 0,
  viewHeight: 0,
  
  requestAnimationIDs: [],
  setTimeoutIDs: [],
  
  cancelFunctions: function() {
    if(this.requestAnimationIDs.length > 1 || this.setTimeoutIDs.length > 1) {
      console.log("requestAnimationIDs:" + this.requestAnimationIDs.length + ", " + setTimeoutIDs.length);
    }
    this.requestAnimationIDs.forEach(window.cancelAnimationFrame);
    this.requestAnimationIDs.length = 0;
    this.setTimeoutIDs.forEach(window.clearTimeout);
    this.setTimeoutIDs.length = 0;
  },
  
  init: function() {
    let container = document.getElementById(this.defaultCanvasContainerID);
    if(!container) {
      console.error("CanvasContainer is not found.");
      return;
    }
    
    let canvas = document.createElement("canvas");
    canvas.className = "main-canvas";
    container.appendChild(canvas);
    
    let subCanvas = document.createElement("canvas");
    subCanvas.className = "sub-canvas";
    subCanvas.style.cssText = "display:none;";
    container.appendChild(subCanvas);
    
    this.context = canvas.getContext("2d");
    this.subContext = subCanvas.getContext("2d");
    if(!this.context || !this.subContext) {
      console.error("context is not found.");
      return;
    }
    
    let requestAnimationFrame = window.requestAnimationFrame ||
                                window.mozRequestAnimationFrame ||
                                window.webkitRequestAnimationFrame ||
                                window.msRequestAnimationFrame;
    let cancelAnimationFrame = window.cancelAnimationFrame ||
                                window.mozCancelAnimationFrame;
    
    this.viewWidth = document.documentElement.clientWidth;
    this.viewHeight = document.documentElement.clientHeight;
    
    canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + this.viewWidth + "px;height:" + this.viewHeight + "px;");
    canvas.width = subCanvas.width = this.viewWidth;
    canvas.height = subCanvas.height = this.viewHeight;
    
    window.addEventListener("resize", ()=> {
      this.viewWidth = document.documentElement.clientWidth;
      this.viewHeight = document.documentElement.clientHeight;
      canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + this.viewWidth + "px;height:" + this.viewHeight + "px;");
      if(!!this.pathContainer) this.pathContainer.setSize(this.viewWidth, this.viewHeight);
    });
    
    
    let frameTime = 1 / 24;
    let fixFrameTime = frameTime;
    let totalFrames = 260;
    let frameNumber = 0;
    let prevTimestamp = 0;
    let average = 0;
    
    let draw =(timestamp)=> {
      if(!canvas.parentNode) {
        this.cancelFunctions();
        return;
      }
      
      if(typeof(timestamp) == "undefined") return;
      
      let elapsed = (timestamp - prevTimestamp) / 1000;
      //this.debugPrint(elapsed, average, fixFrameTime);
      average = (average + elapsed) / 2;
      prevTimestamp = timestamp;
      
      if(!this.pathContainer) return;
      
      canvas.width = subCanvas.width = this.viewWidth;
      canvas.height = subCanvas.height = this.viewHeight;
      
      this.subContext.clearRect(0, 0, this.viewWidth, this.viewHeight);
      this.pathContainer.draw(frameNumber);
      frameNumber = (frameNumber + 1) % totalFrames;
      
      this.context.clearRect(0, 0, this.viewWidth, this.viewHeight);
      let imagedata = this.subContext.getImageData(0, 0, this.viewWidth, this.viewHeight);
      this.context.putImageData(imagedata, 0, 0);
      imagedata = null;
      
      if(average > frameTime * 2) {
        fixFrameTime *= 0.99;
        this.debugPrint("up");
      } else if(average < frameTime * 0.5) {
        fixFrameTime *= 1.01;
        this.debugPrint("down");
      } else {
        fixFrameTime = (frameTime + fixFrameTime) / 2;
      }
    };
    
    let update =()=> {
      this.cancelFunctions();
      this.requestAnimationIDs.push(window.requestAnimationFrame(draw));
      this.setTimeoutIDs.push(window.setTimeout(update, fixFrameTime*1000));
    };
    
    //this.debugPrint("base : ", frameTime, frameTime * 10, frameTime * 0.1);
    this.setTimeoutIDs.push(window.setTimeout(update, fixFrameTime*1000));
  },
};

