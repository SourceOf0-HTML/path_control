var pathContainer = null;
var frameTime = 1 / 30;
var fixFrameTime = frameTime;
var totalFrames = 260;
var frameNumber = 0;
var canvas = null;
var subCanvas = null;
var subContext = null;
var requestAnimationIDs = [];
var setTimeoutIDs = [];
var viewWidth = 0;
var viewHeight = 0;

var request = new XMLHttpRequest();
request.addEventListener("load", function(event) {
  if(request.readyState != 4) return;
  if(request.status != 200 && request.status != 0) return;
  
  let buffer = request.response;
  pathContainer = PathCtr.initFromBin(buffer);
  console.log("loading completed");
  pathContainer.context = subContext;
  pathContainer.setFitSize(viewWidth, viewHeight);
  //console.log(pathContainer);
  request = null;
});
request.open("GET", "./src/path_data.bin", true);
request.responseType = "arraybuffer";
request.send();

window.addEventListener("load", function() {
  canvas = document.getElementById("main-canvas");
  subCanvas = document.getElementById("sub-canvas");
  
  if(!canvas.parentNode) return;
  
  let context = canvas.getContext("2d");
  subContext = subCanvas.getContext("2d");
  if(!context || !subContext) return;
  
  let requestAnimationFrame = window.requestAnimationFrame ||
                              window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame ||
                              window.msRequestAnimationFrame;
  let cancelAnimationFrame = window.cancelAnimationFrame ||
                              window.mozCancelAnimationFrame;
  
  viewWidth = document.documentElement.clientWidth;
  viewHeight = document.documentElement.clientHeight;
  
  canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + viewWidth + "px;height:" + viewHeight + "px;");
  canvas.width = subCanvas.width = viewWidth;
  canvas.height = subCanvas.height = viewHeight;
  
  window.addEventListener("resize", function() {
    viewWidth = document.documentElement.clientWidth;
    viewHeight = document.documentElement.clientHeight;
    canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + viewWidth + "px;height:" + viewHeight + "px;");
    canvas.width = subCanvas.width = viewWidth;
    canvas.height = subCanvas.height = viewHeight;
    if(!!pathContainer) pathContainer.setFitSize(viewWidth, viewHeight);
  });
  
  let cancelFunctions=()=>{
    if(requestAnimationIDs.length > 2 || setTimeoutIDs.length > 2) console.log(requestAnimationIDs.length, setTimeoutIDs.length);
    requestAnimationIDs.forEach(window.cancelAnimationFrame);
    requestAnimationIDs.length = 0;
    setTimeoutIDs.forEach(window.clearTimeout);
    setTimeoutIDs.length = 0;
  };
  console.log("base : ", frameTime, frameTime * 10, frameTime * 0.1);
  let prevTimestamp = 0;
  let elapsed = 0;
  let average = 0;
  (function draw(timestamp) {
    if(!canvas.parentNode) {
      cancelFunctions();
      return;
    }
    
    if(typeof(timestamp) == "undefined") {
      cancelFunctions();
      requestAnimationIDs.push(window.requestAnimationFrame(draw));
      return;
    }
    
    elapsed = (timestamp - prevTimestamp) / 1000;
    console.log(elapsed, average, fixFrameTime);
    average = (average + elapsed) / 2;
    prevTimestamp = timestamp;
    
    setTimeoutIDs.push(window.setTimeout(function() {
      cancelFunctions();
      requestAnimationIDs.push(window.requestAnimationFrame(draw));
      
      if(!pathContainer) return;
      
      subContext.clearRect(0, 0, viewWidth, viewHeight);
      pathContainer.draw(frameNumber);
      frameNumber = (frameNumber + 1) % totalFrames;
      
      context.clearRect(0, 0, viewWidth, viewHeight);
      let imagedata = subContext.getImageData(0, 0, viewWidth, viewHeight);
      context.putImageData(imagedata, 0, 0);
      
      if(average > frameTime * 2) {
        fixFrameTime *= 0.99;
        console.log("up");
      } else if(average < frameTime * 0.5) {
        fixFrameTime *= 1.01;
        console.log("down");
      } else {
        fixFrameTime = (frameTime + fixFrameTime) / 2;
      }
    }, fixFrameTime*1000));
    
  })();
});

