
var dom = "";
var csvdata = document.getElementById("csvdata");
csvdata.addEventListener("load", function() {
  let parser = new DOMParser();
  dom = csvdata.contentDocument.documentElement;
});

window.addEventListener("load", function() {
  var canvas = document.getElementById("main-canvas");
  
  if(canvas.parentNode === null) return;
  
  var requestAnimationFrame = window.requestAnimationFrame ||
                              window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame ||
                              window.msRequestAnimationFrame;
  var cancelAnimationFrame = window.cancelAnimationFrame ||
                              window.mozCancelAnimationFrame;
  
  var context = canvas.getContext("2d");
  
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
  
  (function draw() {
    if(canvas.parentNode === null) {
      return cancelAnimationFrame(draw);
    }
    if(!!dom) {
      context.clearRect(0, 0, width, height);
      
      let group = dom.getElementsByTagName("g");
      for(let j = 0; j < group.length; j++) {
        
        let path = group[j].getElementsByTagName("path");
        for(let i = 0; i < path.length; i++) {
          let child = path[i];
          
          if(child.parentNode.nodeName == "clipPath") {
            continue;
          }
          
          let data = child.getAttribute("d").split(" ");
          let getD=()=>parseFloat(data.shift());
          let region = new Path2D();
          let fillmode = "nonzero";
          
          if(child.hasAttribute("fill-rule")) {
            fillmode = "evenodd";
          }
          
          let fillColor = child.getAttribute("fill");
          if(fillColor == "none") {
            context.fillStyle = "transparent";
          } else {
            context.fillStyle = fillColor;
          }
          
          let strokeColor = child.getAttribute("stroke");
          if(strokeColor == "none") {
            context.strokeStyle = "transparent";
          } else {
            context.lineWidth = parseInt(child.getAttribute("stroke-width"));
            context.strokeStyle = strokeColor;
          }
          
          while(data.length > 0) {
            let c = data.shift();
            switch(c) {
              case "M":
                region.moveTo(getD(), getD());
                break;
              case "C":
                region.bezierCurveTo(getD(), getD(), getD(), getD(), getD(), getD());
                break;
              case "Z":
                region.closePath();
              case "":
                context.stroke(region);
                context.fill(region, fillmode);
                break;
            }
          }
        };
      };
    }
    requestAnimationFrame(draw);
  })();
});
