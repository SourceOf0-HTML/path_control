
/**
 * PathCtr
 * Singleton
 */
var PathCtr = {
  isOutputDebugPrint: false,
  debugPrint: function() {
    if(!PathCtr.isOutputDebugPrint) return;
    //console.log("Func : " + PathCtr.debugPrint.caller.name);
    console.log.apply(null, arguments);
  },
  
  isOutputLoadState: true,
  loadState: function() {
    if(!PathCtr.isOutputLoadState) return;
    for(let i = 0; i < arguments.length; ++i) {
      console.log(arguments[i]);
    }
  },
  
  
  defaultCanvasContainerID: "path-container",  // default canvas container element name
  defaultActionName: "base",
  initTarget: null,  // instance to be initialized
  
  pathContainers: [],
  canvas: null,
  subCanvas: null,
  context: null,
  subContext: null,
  viewWidth: 0,
  viewHeight: 0,
  
  fixFrameTime: 1 / 24,
  prevTimestamp: 0,
  average: 0,
  
  requestAnimationIDs: [],
  setTimeoutIDs: [],
  
  cancelRequestAnimation: function() {
    if(PathCtr.requestAnimationIDs.length > 1 || PathCtr.setTimeoutIDs.length > 1) {
      console.error("requestAnimationIDs:" + PathCtr.requestAnimationIDs.length + ", " + PathCtr.setTimeoutIDs.length);
    }
    PathCtr.requestAnimationIDs.forEach(cancelAnimationFrame);
    PathCtr.requestAnimationIDs.length = 0;
    PathCtr.setTimeoutIDs.forEach(clearTimeout);
    PathCtr.setTimeoutIDs.length = 0;
  },
  
  /**
   * @param {Number} viewWidth
   * @param {Number} viewHeight
   */
  setSize: function(viewWidth, viewHeight) {
    PathCtr.canvas.width = PathCtr.subCanvas.width = PathCtr.viewWidth = viewWidth;
    PathCtr.canvas.height = PathCtr.subCanvas.height = PathCtr.viewHeight = viewHeight;
    PathCtr.pathContainers.forEach(pathContainer=> {
      pathContainer.setSize(viewWidth, viewHeight);
    });
    PathCtr.update();
  },
  
  loadComplete: function() {
    let pathContainer = PathCtr.initTarget;
    if(pathContainer.index != null) {
      PathCtr.pathContainers[pathContainer.index] = pathContainer;
    } else {
      PathCtr.pathContainers.push(pathContainer);
    }
    pathContainer.context = PathWorker.isWorker? PathCtr.context : PathCtr.subContext;
    PathCtr.setSize(PathCtr.viewWidth, PathCtr.viewHeight);
    PathCtr.initTarget = null;
    PathCtr.loadState(pathContainer);
    if(typeof DebugPath !== "undefined") {
      DebugPath.init(pathContainer);
    }
    if(typeof setup !== "undefined") setup(pathContainer);
    PathCtr.update();
  },
  
  draw: function(timestamp) {
    if(typeof DebugPath !== "undefined" && DebugPath.isStop) {
      if(!DebugPath.isStep) return;
      DebugPath.isStep = false;
      PathCtr.pathContainers.forEach(pathContainer=> {
        let action = pathContainer.actionList[pathContainer.currentActionID];
        console.log("STEP: " + action.name + " - " + action.currentFrame);
      });
    }
    
    if(typeof timestamp === "undefined") return;
    
    let elapsed = (timestamp - PathCtr.prevTimestamp) / 1000;
    PathCtr.average = (PathCtr.average + elapsed) / 2;
    //PathCtr.debugPrint((PathCtr.average * 100000)^0);
    
    if(PathCtr.pathContainers.length <= 0) return;
    
    let frameTime = 1 / 24;
    
    if(PathWorker.isWorker) {
      PathCtr.context.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
      PathCtr.pathContainers.forEach(pathContainer=> pathContainer.draw());
      if(timestamp - PathCtr.prevTimestamp < frameTime*500) return;
    } else {
      PathCtr.subContext.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
      PathCtr.pathContainers.forEach(pathContainer=> pathContainer.draw());
      PathCtr.context.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
      PathCtr.context.putImageData(PathCtr.subContext.getImageData(0, 0, PathCtr.viewWidth, PathCtr.viewHeight), 0, 0);
    }
    
    PathCtr.pathContainers.forEach(pathContainer=> pathContainer.step());
    
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
    
    PathCtr.pathContainers.forEach(pathContainer=> pathContainer.update());
  },
  
  update: function() {
    PathCtr.cancelRequestAnimation();
    PathCtr.requestAnimationIDs.push(requestAnimationFrame(PathCtr.draw));
    PathCtr.setTimeoutIDs.push(setTimeout(PathCtr.update, PathCtr.fixFrameTime*1000));
  },
  
  /**
   * @param {OffscreenCanvas or Canvas} canvas
   * @param {OffscreenCanvas or Canvas} subCanvas
   * @param {Number} viewWidth
   * @param {Number} viewHeight
   */
  init: function(canvas, subCanvas, viewWidth, viewHeight) {
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
  },
};

