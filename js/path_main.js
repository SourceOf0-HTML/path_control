
/**
 * PathMain
 * Static Class
 */
class PathMain {
  static defaultBoneName = "bone";
  static isUseMin = false;
  
  static worker = null;
  static useWorker = false;
  
  static path = null;
  static canvas = null;
  static subCanvas = null;
  static completeFunc = null;
  
  /**
   * @param {Object} obj
   * @param {Array} opt - postMessage option
   */
  static postMessage(obj, opt) {
    if(PathMain.useWorker) {
      PathMain.worker.postMessage(obj, opt);
    } else {
      window.dispatchEvent(new CustomEvent("message", {bubbles: true, detail: obj}));
    }
  };
  
  static initWorker() {
    let canvas = PathMain.canvas;
    let subCanvas = PathMain.subCanvas;
    let viewWidth = document.documentElement.clientWidth;
    let viewHeight = document.documentElement.clientHeight;
    canvas.width = subCanvas.width = viewWidth;
    canvas.height = subCanvas.height = viewHeight;
    
    canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + viewWidth + "px;height:" + viewHeight + "px;");
    
    PathMain.worker.addEventListener("message", function(e) {
      let data = !e.data? e.detail : e.data;
      switch(data.cmd) {
        case "main-init-complete":
          PathMain.completeFunc();
          PathMain.completeFunc = null;
          return false;
          
        case "main-confirm":
          if(confirm(data.message)) {
            PathMain.postMessage({cmd: data.callback});
          }
          return false;
          
        case "main-download":
          PathMain.downloadData(data.type, data.fileName, data.data);
          return false;
          
        default:
          if(!e.bubbles) console.error("unknown command: " + data.cmd);
          return true;
      }
    }, false);
    
    window.addEventListener("resize", function() {
      let viewWidth = document.documentElement.clientWidth;
      let viewHeight = document.documentElement.clientHeight;
      PathMain.canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + PathMain.viewWidth + "px;height:" + PathMain.viewHeight + "px;");
      PathMain.postMessage({
        cmd: "resize-canvas", 
        viewWidth: viewWidth,
        viewHeight: viewHeight,
      });
    });
    
    window.addEventListener("mousemove", function(e) {
      PathMain.postMessage({
        cmd: "move-mouse", 
        x: e.clientX,
        y: e.clientY,
      });
    });
    
    window.addEventListener("touchmove", function(e) {
      PathMain.postMessage({
        cmd: "move-mouse", 
        x: e.touches[0].pageX,
        y: e.touches[0].pageY,
      });
    });
    
    window.addEventListener("keyup", function(e) {
      PathMain.postMessage({
        cmd: "keyup", 
        code: e.code,
      });
    });
    
    let targetCanvas = PathMain.canvas;
    let targetSubCanvas = PathMain.subCanvas;
    if(PathMain.useWorker) {
      targetCanvas = targetCanvas.transferControlToOffscreen();
      targetSubCanvas = targetSubCanvas.transferControlToOffscreen();
    }
    
    PathMain.postMessage({
      cmd: "init",
      viewWidth: viewWidth,
      viewHeight: viewHeight,
      canvas: targetCanvas,
      subCanvas: targetSubCanvas,
      defaultBoneName: PathMain.defaultBoneName,
    }, [ targetCanvas, targetSubCanvas ]);
    
    if(!!PathMain.path) {
      PathMain.postMessage({cmd: "load-bin", path: PathMain.path});
    }
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
    PathMain.postMessage({cmd: "output-bin"});
  };
  
  /**
   * @param {String} path - file path info
   */
  static loadBone(path) {
    PathMain.postMessage({cmd: "load-bone", path: path});
  };
  
  /**
   * @param {String} path - file path info
   * @param {Function} completeFunc - call when completed load
   * @param {Boolean} isDebug - use debug mode when true
   */
  static init(path, completeFunc, isDebug) {
    let container = document.getElementById("path-container");
    if(!container) {
      console.error("CanvasContainer is not found.");
      return;
    }
    PathMain.path = path;
    PathMain.completeFunc = completeFunc;
    
    let fileType = PathMain.isUseMin? ".min.js": ".js";
    if(isDebug) {
      fileType = "_debug" + fileType;
    }
    let filePath = "js/path_control" + fileType;
    
    let canvas = PathMain.canvas = document.createElement("canvas");
    canvas.className = "main-canvas";
    container.appendChild(canvas);
    
    let subCanvas = PathMain.subCanvas = document.createElement("canvas");
    subCanvas.className = "sub-canvas";
    subCanvas.style.cssText = "display:none;";
    container.appendChild(subCanvas);
    
    PathMain.useWorker = !!canvas.transferControlToOffscreen;
    
    if(PathMain.useWorker) {
      PathMain.worker = new Worker(filePath);
      PathMain.initWorker();
    } else {
      console.log("this browser is not supported");
      PathMain.worker = window;
      let script = document.createElement("script");
      script.src = filePath;
      document.body.appendChild(script);
    }
  };
};
