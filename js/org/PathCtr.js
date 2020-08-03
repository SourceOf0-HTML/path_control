
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
  static subCanvas = null;
  static context = null;
  static subContext = null;
  static viewWidth = 0;
  static viewHeight = 0;
  
  static fixFrameTime = 1 / 24;
  static frameNumber = 0;
  static prevTimestamp = 0;
  static average = 0;
  
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
    PathCtr.canvas.width = PathCtr.subCanvas.width = PathCtr.viewWidth = viewWidth;
    PathCtr.canvas.height = PathCtr.subCanvas.height = PathCtr.viewHeight = viewHeight;
    if(!!PathCtr.pathContainer) PathCtr.pathContainer.setSize(viewWidth, viewHeight);
    PathCtr.update();
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  static loadComplete(pathContainer) {
    PathCtr.pathContainer = PathCtr.initTarget;
    PathCtr.pathContainer.context = PathCtr.subContext;
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
    
    let actionName = "walk";
    let frameTime = 1 / 24;
    let totalFrames = PathCtr.pathContainer.getAction(actionName).totalFrames;
    
    PathCtr.subContext.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
    PathCtr.pathContainer.draw();
    
    PathCtr.context.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
    PathCtr.context.putImageData(PathCtr.subContext.getImageData(0, 0, PathCtr.viewWidth, PathCtr.viewHeight), 0, 0);
    
    if(PathWorker.isWorker && timestamp - PathCtr.prevTimestamp < frameTime*500) return;
    
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
    
    PathCtr.pathContainer.update(PathCtr.frameNumber, actionName);
  };
  
  static update() {
    PathCtr.cancelRequestAnimation();
    PathCtr.requestAnimationIDs.push(requestAnimationFrame(PathCtr.draw));
    PathCtr.setTimeoutIDs.push(setTimeout(PathCtr.update, PathCtr.fixFrameTime*1000));
  };
  
  /**
   * @param {OffscreenCanvas or Canvas} canvas
   * @param {OffscreenCanvas or Canvas} subCanvas
   * @param {Number} viewWidth
   * @param {Number} viewHeight
   */
  static init(canvas, subCanvas, viewWidth, viewHeight) {
    if(!canvas || !subCanvas) {
      console.error("canvas is not found.");
      return;
    }
    
    PathCtr.canvas = canvas;
    PathCtr.context = canvas.getContext("2d");
    
    PathCtr.subCanvas = subCanvas;
    PathCtr.subContext = subCanvas.getContext("2d");
    
    if(!PathCtr.context || !PathCtr.subContext) {
      console.error("context is not found.");
      return;
    }
    
    canvas.width = subCanvas.width = PathCtr.viewWidth = viewWidth;
    canvas.height = subCanvas.height = PathCtr.viewHeight = viewHeight;
  };
};

