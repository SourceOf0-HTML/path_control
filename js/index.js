var pathContainer = null;
var frameTime = 1 / 30;
var totalFrames = 1120;
var frameNumber = 0;
var canvas = null;
var subCanvas = null;
var requestAnimationIDs = [];

var request = new XMLHttpRequest();
request.addEventListener("load", function(event) {
  if(request.readyState != 4) return;
  if(request.status != 200 && request.status != 0) return;
  
  let buffer = request.response;
  pathContainer = PathCtr.initFromBin(buffer);
  console.log("loading completed");
  //console.log(pathContainer);
});
request.open("GET", "./src/path_data.bin", true);
request.responseType = "arraybuffer";
request.send();

window.addEventListener("load", function() {
  canvas = document.getElementById("main-canvas");
  subCanvas = document.getElementById("sub-canvas");
  
  if(!canvas.parentNode) return;
  
  let context = canvas.getContext("2d");
  let subContext = subCanvas.getContext("2d");
  if(!context || !subContext) return;
  
  let requestAnimationFrame = window.requestAnimationFrame ||
                              window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame ||
                              window.msRequestAnimationFrame;
  let cancelAnimationFrame = window.cancelAnimationFrame ||
                              window.mozCancelAnimationFrame;
  
  let viewWidth = document.documentElement.clientWidth;
  let viewHeight = document.documentElement.clientHeight;
  
  canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + viewWidth + "px;height:" + viewHeight + "px;");
  canvas.width = subCanvas.width = viewWidth;
  canvas.height = subCanvas.height = viewHeight;
  
  window.addEventListener("resize", function() {
    viewWidth = document.documentElement.clientWidth;
    viewHeight = document.documentElement.clientHeight;
    canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + viewWidth + "px;height:" + viewHeight + "px;");
    canvas.width = subCanvas.width = viewWidth;
    canvas.height = subCanvas.height = viewHeight;
  });
  
  let cancelAnimationFrames =()=>{
    requestAnimationIDs.forEach(id=>{
      cancelAnimationFrame(id);
    });
    requestAnimationIDs.length = 0;
  };
  
  let prevTimestamp = 0;
  (function draw(timestamp) {
    if(!canvas.parentNode) {
      cancelAnimationFrames();
      return;
    }
    
    let elapsed = (timestamp - prevTimestamp) / 1000;
    //console.log(elapsed, frameTime);
    
    if(!pathContainer || elapsed <= frameTime) {
      cancelAnimationFrames();
      requestAnimationIDs.push(requestAnimationFrame(draw));
      return;
    }
    prevTimestamp = timestamp;
    
    cancelAnimationFrames();
    requestAnimationIDs.push(requestAnimationFrame(draw));
    
    pathContainer.context = subContext;
    subContext.clearRect(0, 0, viewWidth, viewHeight);
    pathContainer.setFitSize(viewWidth, viewHeight);
    pathContainer.draw(frameNumber);
    frameNumber = (frameNumber + 1) % totalFrames;
    
    context.clearRect(0, 0, viewWidth, viewHeight);
    let imagedata = subContext.getImageData(0, 0, viewWidth, viewHeight);
    context.putImageData(imagedata, 0, 0);
    
  })();
});

