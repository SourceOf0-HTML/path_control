
/**
 * PathCtr
 * Static Class
 */
class PathCtr {
  static isOutputDebugPrint = false;
  static debugPrint() {
    if(!PathCtr.isOutputDebugPrint) return;
    //console.log("Func : " + PathCtr.debugPrint.caller.name);
    for(let i = 0; i < arguments.length; ++i) {
      console.log(arguments[i]);
    }
  };
  
  static isOutputLoadState = true;
  static loadState() {
    if(!PathCtr.isOutputLoadState) return;
    for(let i = 0; i < arguments.length; ++i) {
      console.log(arguments[i]);
    }
  };
  
  static defaultCanvasContainerID = "path-container";  // default canvas container element name
  static defaultActionName = "base";
  static initTarget = null;  // instance to be initialized
  static binDataPosRange = 20000; // correction value of coordinates when saving to binary data
  
  static pathContainer = null;
  static canvas = null;
  static context = null;
  static viewWidth = 0;
  static viewHeight = 0;
  
  static fixFrameTime = 1 / 24;
  static frameNumber = 0;
  static prevTimestamp = 0;
  static average = 0;
  static updateEvent = new Event("update");
  
  static requestAnimationIDs = [];
  static setTimeoutIDs = [];
  
  static cancelRequestAnimation() {
    if(PathCtr.requestAnimationIDs.length > 1 || PathCtr.setTimeoutIDs.length > 1) {
      PathCtr.debugPrint("requestAnimationIDs:" + PathCtr.requestAnimationIDs.length + ", " + PathCtr.setTimeoutIDs.length);
    }
    PathCtr.requestAnimationIDs.forEach(cancelAnimationFrame);
    PathCtr.requestAnimationIDs.length = 0;
    PathCtr.setTimeoutIDs.forEach(clearTimeout);
    PathCtr.setTimeoutIDs.length = 0;
  };
  
  /**
   * @param {Number} viewWidth
   * @param {Number} viewHeight
   */
  static setSize(viewWidth, viewHeight) {
    PathCtr.canvas.width = PathCtr.viewWidth = viewWidth;
    PathCtr.canvas.height = PathCtr.viewHeight = viewHeight;
    if(!!PathCtr.pathContainer) PathCtr.pathContainer.setSize(viewWidth, viewHeight);
    PathCtr.update();
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  static loadComplete(pathContainer) {
    PathCtr.pathContainer = PathCtr.initTarget;
    PathCtr.pathContainer.context = PathCtr.context;
    PathCtr.setSize(PathCtr.viewWidth, PathCtr.viewHeight);
    PathCtr.initTarget = null;
    PathCtr.update();
  };
  
  static draw(timestamp) {
    if(typeof DebugPath !== "undefined" && DebugPath.isStop) {
      if(!DebugPath.isStep) return;
      DebugPath.isStep = false;
      console.log("--STEP--");
    }
    
    if(typeof timestamp === "undefined") return;
    
    let elapsed = (timestamp - PathCtr.prevTimestamp) / 1000;
    PathCtr.average = (PathCtr.average + elapsed) / 2;
    PathCtr.debugPrint((PathCtr.average * 100000)^0);
    
    if(!PathCtr.pathContainer) return;
    
    PathCtr.context.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
    PathCtr.pathContainer.draw();
    
    let frameTime = 1 / 24;
    let totalFrames = 260;
    
    if(timestamp - PathCtr.prevTimestamp < frameTime*500) return;
    
    PathCtr.frameNumber = PathCtr.frameNumber % totalFrames + 1;
    
    PathCtr.prevTimestamp = timestamp;
    if(PathCtr.average > frameTime * 2) {
      PathCtr.fixFrameTime *= 0.99;
      PathCtr.debugPrint("up");
    } else if(PathCtr.average < frameTime * 0.5) {
      PathCtr.fixFrameTime *= 1.01;
      PathCtr.debugPrint("down");
    } else {
      PathCtr.fixFrameTime = (frameTime + PathCtr.fixFrameTime) / 2;
    }
    
    dispatchEvent(PathCtr.updateEvent);
  };
  
  static update() {
    PathCtr.cancelRequestAnimation();
    PathCtr.requestAnimationIDs.push(requestAnimationFrame(PathCtr.draw));
    PathCtr.setTimeoutIDs.push(setTimeout(PathCtr.update, PathCtr.fixFrameTime*1000));
  };
  
  /**
   * @param {offscreenCanvas} canvas
   * @param {Number} viewWidth
   * @param {Number} viewHeight
   */
  static init(canvas, viewWidth, viewHeight) {
    if(!canvas) {
      console.error("canvas is not found.");
      return;
    }
    
    PathCtr.canvas = canvas;
    PathCtr.context = canvas.getContext("2d");
    if(!PathCtr.context) {
      console.error("context is not found.");
      return;
    }
    
    canvas.width = PathCtr.viewWidth = viewWidth;
    canvas.height = PathCtr.viewHeight = viewHeight;
    
    addEventListener("update", function(e) {
      PathCtr.pathContainer.update(PathCtr.frameNumber, "walk");
    });
  };
};

