var charaData = null;

var request = new XMLHttpRequest();
request.addEventListener("load", function(event) {
  let buffer = request.response;
  charaData = PathCtr.initFromBin(buffer);
  console.log("loading completed");
});
request.open("GET", "./src/path_data.bin", true);
request.responseType = "arraybuffer";
request.send();

window.addEventListener("load", function() {
  let svgDataDom = document.getElementById("csvdata");
  let dom = svgDataDom.contentDocument.documentElement;
  
  let canvas = document.getElementById("main-canvas");
  
  if(!canvas.parentNode) return;
  
  let context = canvas.getContext("2d");
  if(!context) return;
  
  let requestAnimationFrame = window.requestAnimationFrame ||
                              window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame ||
                              window.msRequestAnimationFrame;
  let cancelAnimationFrame = window.cancelAnimationFrame ||
                              window.mozCancelAnimationFrame;
  
  var width = document.documentElement.clientWidth;
  var height = document.documentElement.clientHeight;
  canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:100vw;height:100vh;");
  canvas.width = width;
  canvas.height = height;
  
  window.addEventListener("resize", function() {
    width = document.documentElement.clientWidth;
    height = document.documentElement.clientHeight;
    canvas.width = width;
    canvas.height = height;
  });
  
  //charaData = PathCtr.initFromSvg(dom.querySelector("g"));
  
  let prevTimestamp = 0;
  (function draw(timestamp) {
    if(!canvas.parentNode) {
      return cancelAnimationFrame(draw);
    }
    
    let elapsed = (timestamp - prevTimestamp) / 1000;
    let frameTime = 1/24;
    if(!charaData || elapsed <= frameTime) {
      requestAnimationFrame(draw);
      return;
    }
    prevTimestamp = timestamp;
    
    context.clearRect(0, 0, width, height);
    charaData.context = context;
    charaData.draw();
    
    requestAnimationFrame(draw);
  })();
});

