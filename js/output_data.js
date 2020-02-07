var pathContainer = null;
var frameTime = 1000 / 24;
var totalFrames = 1120;
var frameNumber = 0;
var domList = [];
var loadIndex = 1;
var filePath = "./img/base_single/original_single_";
//var filePath = "./img/base/original_";

var getFrameNum=i=>{
  return "00000".substr(0, 5 - i.toString().length) + i + ".svg";
};
var request = new XMLHttpRequest();
var loadSVG = request.onreadystatechange = function(e) {
  let target = e.target;
  if(target.readyState != 4) return;
  if(target.status != 200 && target.status != 0) return;
  let ret = target.responseText;
  
  let div = document.createElement("div");
  div.setAttribute("style", "display:none;");
  div.innerHTML = ret;
  let svg = div.firstElementChild;
  document.body.append(div);
  domList[parseInt(ret.match(/id="Frame_(\d+)"/)[1]) - 1] = svg;
  div = svg = null;
  
  if(loadIndex <= totalFrames) {
    request = new XMLHttpRequest();
    request.open("GET", filePath + getFrameNum(loadIndex++), true);
    request.onreadystatechange = loadSVG;
    request.send();
    delete request;
  } else {
    delete request;
  }
};
request.open("GET", filePath + getFrameNum(loadIndex++), true);
request.send();

window.addEventListener("load", function() {
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
  /*
  let width = document.documentElement.clientWidth;
  let height = document.documentElement.clientHeight;
  /**/
  let width = 1280;
  let height = 720;
  canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + width + "px;height:" + height + "px;");
  canvas.width = width;
  canvas.height = height;
  /*
  window.addEventListener("resize", function() {
    width = document.documentElement.clientWidth;
    height = document.documentElement.clientHeight;
    canvas.width = width;
    canvas.height = height;
  });
  /**/
  
  let prevTimestamp = 0;
  (function draw(timestamp) {
    let elapsed = (timestamp - prevTimestamp) / 1000;
    prevTimestamp = timestamp;
    //console.log(elapsed, frameTime / 1000);
    
    if(!canvas.parentNode) {
      return cancelAnimationFrame(draw);
    }
    
    setTimeout(function() {
      requestAnimationFrame(draw);
      if(!pathContainer) {
        let loadFileNum = Object.keys(domList).length;
        console.log("load file : " + loadFileNum);
        if(loadFileNum < totalFrames) return;
        
        pathContainer = PathCtr.initFromSvg(domList[0]);
        pathContainer.context = context;
        PathCtr.addActionFromSvgList(pathContainer, domList);
        console.log("loading completed");
        console.log(pathContainer);
        
        domList.forEach(dom=>dom.parentNode.remove());
        document.getElementById("output-btn").disabled = "";
        return;
      }
      
      context.clearRect(0, 0, width, height);
      pathContainer.draw(frameNumber);
      frameNumber = (frameNumber + 1) % totalFrames;
      
    }, frameTime);
  })();
});

function output_data() {
  if(!pathContainer) return;
  
  let buffer = PathCtr.dataTobin(pathContainer);
  
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  console.log(a);
  
  var blob = new Blob([buffer], {type: "octet/stream"}),
  url = window.URL.createObjectURL(blob);
  
  a.href = url;
  a.download = "path_data.bin";
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}
