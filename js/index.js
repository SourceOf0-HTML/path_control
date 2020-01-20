
var svgData = 0;
var context = 0;

window.addEventListener("load", function() {
  let csvdata = document.getElementById("csvdata");
  let dom = csvdata.contentDocument.documentElement;
  svgData = SVG_DATA.makeGroup(dom.querySelector("g"));
  
  let canvas = document.getElementById("main-canvas");
  
  if(canvas.parentNode === null) return;
  
  context = canvas.getContext("2d");
  if(context === null) return;
  
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
  
  let prevTimestamp = 0;
  (function draw(timestamp) {
    if(canvas.parentNode === null) {
      return cancelAnimationFrame(draw);
    }
    
    let elapsed = (timestamp - prevTimestamp) / 1000;
    let frameTime = 1/24;
    if(elapsed <= frameTime) {
      requestAnimationFrame(draw);
      return;
    }
    prevTimestamp = timestamp;
    
    context.clearRect(0, 0, width, height);
    drawGroup(svgData);
    
    requestAnimationFrame(draw);
  })();
});


function drawGroup(group, isMask = false) {
  let isFoundMask = false;
  
  if(!isMask && !!group.maskIdToUse) {
    let mask = SVG_DATA.getMaskGroup(group.maskIdToUse);
    if(!!mask) {
      isFoundMask = true;
      context.save();
      drawGroup(mask, true);
    } else {
      console.log("group is not found : " + group.maskIdToUse);
    }
  }
  
  let region = isMask? (new Path2D()):0;
  
  if(!!group.paths) {
    group.paths.forEach(path=>{
      
      if(path.type == "group") {
        drawGroup(path, isMask);
        return;
      }
      
      let isFoundMaskPath = false;
      
      if(!isMask && !!path.maskIdToUse) {
        let maskPath = SVG_DATA.getMaskGroup(path.maskIdToUse);
        if(!!maskPath) {
          isFoundMaskPath = true;
          context.save();
          drawGroup(maskPath, true);
        } else {
          console.log("mask is not found : " + path.maskIdToUse);
        }
      }
      
      if(!isMask) {
        region = new Path2D();
      }
      
      path.pathDataList.forEach(d=>{
        let i = 0;
        switch(d.type) {
          case "M":
            region.moveTo(d.pos[i++], d.pos[i++]);
            break;
          case "C":
            region.bezierCurveTo(d.pos[i++], d.pos[i++], d.pos[i++], d.pos[i++], d.pos[i++], d.pos[i++]);
            break;
          case "Z":
            region.closePath();
            break;
          default:
            break;
        }
      });
      
      if(!isMask) {
        if(path.lineWidth > 0) {
          context.lineWidth = path.lineWidth;
          context.strokeStyle = path.strokeColor;
          context.stroke(region);
        }
        context.fillStyle = path.fillStyle;
        context.fill(region, path.fillRule);
      }
      
      if(isFoundMaskPath) {
        context.restore();
      }
    });
  }
  
  if(isMask) {
    context.clip(region);
  }
  
  if(isFoundMask) {
    context.restore();
  }
}

