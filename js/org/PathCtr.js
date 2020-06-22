
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
  frameTime: 1 / 24,
  fixFrameTime: 1 / 24,
  totalFrames: 260,
  frameNumber: 0,
  canvas: null,
  subCanvas: null,
  context: null,
  subContext: null,
  requestAnimationIDs: [],
  setTimeoutIDs: [],
  viewWidth: 0,
  viewHeight: 0,
  prevTimestamp: 0,
  average: 0,
  
  cancelFunctions: function() {
    if(PathCtr.requestAnimationIDs.length > 1 || PathCtr.setTimeoutIDs.length > 1) console.log(PathCtr.requestAnimationIDs.length, setTimeoutIDs.length);
    PathCtr.requestAnimationIDs.forEach(window.cancelAnimationFrame);
    PathCtr.requestAnimationIDs.length = 0;
    PathCtr.setTimeoutIDs.forEach(window.clearTimeout);
    PathCtr.setTimeoutIDs.length = 0;
  },
  
  update: function()  {
    PathCtr.cancelFunctions();
    PathCtr.requestAnimationIDs.push(window.requestAnimationFrame(PathCtr.draw));
    PathCtr.setTimeoutIDs.push(window.setTimeout(PathCtr.update, PathCtr.fixFrameTime*1000));
  },
  
  draw: function(timestamp) {
    if(!PathCtr.canvas.parentNode) {
      PathCtr.cancelFunctions();
      return;
    }
    
    if(typeof(timestamp) == "undefined") return;
    
    let elapsed = (timestamp - PathCtr.prevTimestamp) / 1000;
    //this.debugPrint(elapsed, PathCtr.average, PathCtr.fixFrameTime);
    PathCtr.average = (PathCtr.average + elapsed) / 2;
    PathCtr.prevTimestamp = timestamp;
    
    if(!PathCtr.pathContainer) return;
    
    PathCtr.canvas.width = PathCtr.subCanvas.width = PathCtr.viewWidth;
    PathCtr.canvas.height = PathCtr.subCanvas.height = PathCtr.viewHeight;
    
    PathCtr.subContext.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
    PathCtr.pathContainer.draw(PathCtr.frameNumber);
    PathCtr.frameNumber = (PathCtr.frameNumber + 1) % PathCtr.totalFrames;
    
    PathCtr.context.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
    let imagedata = PathCtr.subContext.getImageData(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
    PathCtr.context.putImageData(imagedata, 0, 0);
    imagedata = null;
    
    if(PathCtr.average > PathCtr.frameTime * 2) {
      PathCtr.fixFrameTime *= 0.99;
      PathCtr.debugPrint("up");
    } else if(PathCtr.average < PathCtr.frameTime * 0.5) {
      PathCtr.fixFrameTime *= 1.01;
      PathCtr.debugPrint("down");
    } else {
      PathCtr.fixFrameTime = (PathCtr.frameTime + PathCtr.fixFrameTime) / 2;
    }
  },
  
  init: function() {
    let container = document.getElementById(PathCtr.defaultCanvasContainerID);
    if(!container) {
      console.error("CanvasContainer is not found.");
      return;
    }
    
    this.canvas = document.createElement("canvas");
    this.canvas.className = "main-canvas";
    container.appendChild(this.canvas);
    
    this.subCanvas = document.createElement("canvas");
    this.subCanvas.className = "sub-canvas";
    this.subCanvas.style.cssText = "display:none;";
    container.appendChild(this.subCanvas);
    
    this.context = this.canvas.getContext("2d");
    this.subContext = this.subCanvas.getContext("2d");
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
    
    this.canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + this.viewWidth + "px;height:" + this.viewHeight + "px;");
    this.canvas.width = this.subCanvas.width = this.viewWidth;
    this.canvas.height = this.subCanvas.height = this.viewHeight;
    
    window.addEventListener("resize", function() {
      this.viewWidth = document.documentElement.clientWidth;
      this.viewHeight = document.documentElement.clientHeight;
      this.canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + this.viewWidth + "px;height:" + this.viewHeight + "px;");
      if(!!this.pathContainer) this.pathContainer.setSize(this.viewWidth, this.viewHeight);
    });
    
    //this.debugPrint("base : ", this.frameTime, this.frameTime * 10, this.frameTime * 0.1);
    this.setTimeoutIDs.push(window.setTimeout(this.update, this.fixFrameTime*1000));
  },
};

