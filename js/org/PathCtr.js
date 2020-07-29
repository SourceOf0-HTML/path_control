
/**
 * PathCtr
 * Singleton
 */
var PathCtr = {
  isOutputDebugPrint: false,
  debugPrint: function() {
    if(!this.isOutputDebugPrint) return;
    //console.log("Func : " + this.debugPrint.caller.name);
    for(let i = 0; i < arguments.length; ++i) {
      console.log(arguments[i]);
    }
  },
  
  isOutputLoadState: true,
  loadState: function() {
    if(!this.isOutputLoadState) return;
    for(let i = 0; i < arguments.length; ++i) {
      console.log(arguments[i]);
    }
  },
  
  defaultCanvasContainerID: "path-container",  // default canvas container element name
  defaultActionName: "base",
  initTarget: null,  // instance to be initialized
  binDataPosRange: 20000, // correction value of coordinates when saving to binary data
  
  pathContainer: null,
  canvas: null,
  context: null,
  viewWidth: 0,
  viewHeight: 0,
  
  requestAnimationIDs: [],
  setTimeoutIDs: [],
  
  cancelRequestAnimation: function() {
    if(this.requestAnimationIDs.length > 1 || this.setTimeoutIDs.length > 1) {
      PathCtr.debugPrint("requestAnimationIDs:" + this.requestAnimationIDs.length + ", " + this.setTimeoutIDs.length);
    }
    this.requestAnimationIDs.forEach(cancelAnimationFrame);
    this.requestAnimationIDs.length = 0;
    this.setTimeoutIDs.forEach(clearTimeout);
    this.setTimeoutIDs.length = 0;
  },
  
  /**
   * @param {Number} viewWidth
   * @param {Number} viewHeight
   */
  setSize: function(viewWidth, viewHeight) {
    this.canvas.width = this.viewWidth = viewWidth;
    this.canvas.height = this.viewHeight = viewHeight;
    if(!!this.pathContainer) this.pathContainer.setSize(viewWidth, viewHeight);
  },
  
  /**
   * @param {PathContainer} pathContainer
   */
  loadComplete: function(pathContainer) {
    this.pathContainer = this.initTarget;
    this.pathContainer.context = this.context;
    this.setSize(this.viewWidth, this.viewHeight);
    this.initTarget = null;
  },
  
  /**
   * @param {offscreenCanvas} canvas
   * @param {Number} viewWidth
   * @param {Number} viewHeight
   */
  init: function(canvas, viewWidth, viewHeight) {
    if(!canvas) {
      console.error("canvas is not found.");
      return;
    }
    
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    if(!this.context) {
      console.error("context is not found.");
      return;
    }
    
    canvas.width = this.viewWidth = viewWidth;
    canvas.height = this.viewHeight = viewHeight;
    
    let frameTime = 1 / 24;
    let fixFrameTime = frameTime;
    let totalFrames = 260;
    let frameNumber = 0;
    let prevTimestamp = 0;
    let average = 0;
    
    let update = new Event("update");
    addEventListener("update", function(e) {
      PathCtr.pathContainer.update(frameNumber, "walk");
    });
    
    let draw =(timestamp)=> {
      if(typeof DebugPath !== "undefined" && DebugPath.isStop) {
        if(!DebugPath.isStep) return;
        DebugPath.isStep = false;
        console.log("--STEP--");
      }
      
      if(typeof timestamp === "undefined") return;
      
      let elapsed = (timestamp - prevTimestamp) / 1000;
      average = (average + elapsed) / 2;
      prevTimestamp = timestamp;
      this.debugPrint((average * 100000)^0);
      
      if(!this.pathContainer) return;
      
      this.context.clearRect(0, 0, this.viewWidth, this.viewHeight);
      this.pathContainer.draw();
      frameNumber = frameNumber % totalFrames + 1;
      
      if(average > frameTime * 2) {
        fixFrameTime *= 0.99;
        this.debugPrint("up");
      } else if(average < frameTime * 0.5) {
        fixFrameTime *= 1.01;
        this.debugPrint("down");
      } else {
        fixFrameTime = (frameTime + fixFrameTime) / 2;
      }
      dispatchEvent(update);
    };
    
    let timer =()=> {
      this.cancelRequestAnimation();
      this.requestAnimationIDs.push(requestAnimationFrame(draw));
      this.setTimeoutIDs.push(setTimeout(timer, fixFrameTime*1000));
    };
    
    //this.debugPrint("base : ", frameTime, frameTime * 10, frameTime * 0.1);
    this.setTimeoutIDs.push(setTimeout(timer, fixFrameTime*1000));
  },
};

