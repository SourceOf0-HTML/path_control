var pathContainer = null;
var frameTime = 1 / 24;
var fixFrameTime = frameTime;
var totalFrames = 260;
var frameNumber = 0;
var canvas = null;
var subCanvas = null;
var context = null;
var subContext = null;
var requestAnimationIDs = [];
var setTimeoutIDs = [];
var viewWidth = 0;
var viewHeight = 0;
var prevTimestamp = 0;
var elapsed = 0;
var average = 0;

function setPathContainer(data) {
  pathContainer = data;
  pathContainer.context = subContext;
  pathContainer.setFitSize(viewWidth, viewHeight);
}

PathFactory.binFileLoad("./src/path_data.bin", setPathContainer);

function cancelFunctions() {
  if(requestAnimationIDs.length > 2 || setTimeoutIDs.length > 2) console.log(requestAnimationIDs.length, setTimeoutIDs.length);
  requestAnimationIDs.forEach(window.cancelAnimationFrame);
  requestAnimationIDs.length = 0;
  setTimeoutIDs.forEach(window.clearTimeout);
  setTimeoutIDs.length = 0;
};

function timer() {
  cancelFunctions();
  requestAnimationIDs.push(window.requestAnimationFrame(draw));
  setTimeoutIDs.push(window.setTimeout(timer, fixFrameTime*1000));
}
  
function draw(timestamp) {
  if(!canvas.parentNode) {
    cancelFunctions();
    return;
  }
  
  if(typeof(timestamp) == "undefined") return;
  
  elapsed = (timestamp - prevTimestamp) / 1000;
  //console.log(elapsed, average, fixFrameTime);
  average = (average + elapsed) / 2;
  prevTimestamp = timestamp;
  
  if(!pathContainer) return;
  
  canvas.width = subCanvas.width = viewWidth;
  canvas.height = subCanvas.height = viewHeight;
  
  subContext.clearRect(0, 0, viewWidth, viewHeight);
  pathContainer.draw(frameNumber);
  frameNumber = (frameNumber + 1) % totalFrames;
  
  context.clearRect(0, 0, viewWidth, viewHeight);
  let imagedata = subContext.getImageData(0, 0, viewWidth, viewHeight);
  context.putImageData(imagedata, 0, 0);
  imagedata = null;
  
  if(average > frameTime * 2) {
    fixFrameTime *= 0.99;
    console.log("up");
  } else if(average < frameTime * 0.5) {
    fixFrameTime *= 1.01;
    console.log("down");
  } else {
    fixFrameTime = (frameTime + fixFrameTime) / 2;
  }
}

window.addEventListener("load", function() {
  canvas = document.getElementById("main-canvas");
  subCanvas = document.getElementById("sub-canvas");
  
  if(!canvas.parentNode) return;
  
  context = canvas.getContext("2d");
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
    if(!!pathContainer) pathContainer.setFitSize(viewWidth, viewHeight);
  });
  
  //console.log("base : ", frameTime, frameTime * 10, frameTime * 0.1);
  setTimeoutIDs.push(window.setTimeout(timer, fixFrameTime*1000));
});

