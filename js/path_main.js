
/**
 * PathMain
 * Static Class
 */
class PathMain {
  static defaultBoneName = "bone";
  static worker = null;
  static isUseMin = false;
  
  /**
   * @param {Function} completeFunc - call when completed load
   * @param {Boolean} isDebug - use debug mode when true
   */
  static initWorker(completeFunc, isDebug) {
    let container = document.getElementById("path-container");
    if(!container) {
      console.error("CanvasContainer is not found.");
      return;
    }
    
    let canvas = document.createElement("canvas");
    
    if(!canvas.transferControlToOffscreen) {
      let text = "this browser is not supported";
      console.error(text);
      let p = document.createElement("p");
      p.textContent = text;
      p.setAttribute("style", "color:red");
      container.appendChild(p);
      return false;
    }
    
    canvas.className = "main-canvas";
    container.appendChild(canvas);
    
    let viewWidth = document.documentElement.clientWidth;
    let viewHeight = document.documentElement.clientHeight;
    
    canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + this.viewWidth + "px;height:" + this.viewHeight + "px;");
    canvas.width = viewWidth;
    canvas.height = viewHeight;
    
    let fileType = this.isUseMin? ".min.js": ".js";
    if(isDebug) {
      fileType = "_debug" + fileType;
    }
    this.worker = new Worker("js/path_control" + fileType);
    
    this.worker.addEventListener("message", function(e) {
      let data = e.data;
      switch(data.cmd) {
        case "init-complete":
          completeFunc();
          break;
          
        case "confirm":
          if(confirm(data.message)) {
            PathMain.worker.postMessage({cmd: data.callback});
          }
          break;
          
        case "download":
          PathMain.downloadData(data.type, data.fileName, data.data);
          break;
          
        default:
          console.error("unknown command: " + data.cmd);
          break;
      }
    }, false);
    
    let offscreenCanvas = canvas.transferControlToOffscreen();
    
    this.worker.postMessage({
      cmd: "init",
      viewWidth: viewWidth,
      viewHeight: viewHeight,
      canvas: offscreenCanvas,
      defaultBoneName: this.defaultBoneName,
    }, [ offscreenCanvas ]);
    
    
    window.addEventListener("resize", function() {
      let viewWidth = document.documentElement.clientWidth;
      let viewHeight = document.documentElement.clientHeight;
      canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + PathMain.viewWidth + "px;height:" + PathMain.viewHeight + "px;");
      PathMain.worker.postMessage({
        cmd: "resize-canvas", 
        viewWidth: viewWidth,
        viewHeight: viewHeight,
      });
    });
    
    window.addEventListener("mousemove", function(e) {
      PathMain.worker.postMessage({
        cmd: "move-mouse", 
        x: e.clientX,
        y: e.clientY,
      });
    });
    
    window.addEventListener("touchmove", function(e) {
      PathMain.worker.postMessage({
        cmd: "move-mouse", 
        x: e.touches[0].pageX,
        y: e.touches[0].pageY,
      });
    });
    
    window.addEventListener("keyup", function(e) {
      PathMain.worker.postMessage({
        cmd: "keyup", 
        code: e.code,
      });
    });
    
    return true;
  };
  
  /**
   * @param {String} type
   * @param {String} fileName
   * @param {String} data
   */
  static downloadData(type, fileName, data) {
    let a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    console.log(a);
    
    let blob = new Blob([data], {type: type});
    
    a.href = window.URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    a.remove();
  };
  
  static outputBin() {
    this.worker.postMessage({cmd: "output-bin"});
  };
  
  /**
   * @param {String} path - file path info
   */
  static loadBone(path) {
    this.worker.postMessage({cmd: "load-bone", path: path});
  };
  
  /**
   * @param {String} path - file path info
   * @param {Function} completeFunc - call when completed load
   * @param {Boolean} isDebug - use debug mode when true
   */
  static init(path, completeFunc, isDebug) {
    if(this.initWorker(completeFunc, isDebug)) {
      this.worker.postMessage({cmd: "load-bin", path: path});
    }
  };
};
