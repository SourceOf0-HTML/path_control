
/**
 * PathMain
 * Singleton
 */
var PathMain = {
  defaultBoneName: "bone",
  isUseMin: false,
  
  worker: null,
  useWorker: false,
  
  path: null,
  canvas: null,
  subCanvas: null,
  completeFunc: null,
  
  /**
   * @param {Object} obj
   * @param {Array} opt - postMessage option
   */
  postMessage: function(obj, opt) {
    if(PathMain.useWorker) {
      PathMain.worker.postMessage(obj, opt);
    } else {
      window.dispatchEvent(new CustomEvent("message", {bubbles: true, detail: obj}));
    }
  },
  
  initWorker: function() {
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
        case "main-bone-load-complete":
          PathMain.completeFunc();
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
    
    document.addEventListener("mousemove", function(e) {
      PathMain.postMessage({
        cmd: "mouse-move", 
        x: e.clientX,
        y: e.clientY,
      });
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener("mouseenter", function(e) {
      PathMain.postMessage({
        cmd: "mouse-enter", 
      });
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener("mouseleave", function(e) {
      PathMain.postMessage({
        cmd: "mouse-leave", 
      });
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener("touchmove", function(e) {
      let touches = [];
      for(let i = 0; i < e.touches.length; ++i) {
        let touch = e.touches[i];
        touches.push({
          identifier: touch.identifier,
          pageX: touch.pageX,
          pageY: touch.pageY,
        });
      }
      PathMain.postMessage({
        cmd: "touch-move", 
        touches: touches,
      });
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener("keyup", function(e) {
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
  },
  
  /**
   * @param {String} type
   * @param {String} fileName
   * @param {String} data
   */
  downloadData: function(type, fileName, data) {
    let a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    console.log(a);
    
    let blob = new Blob([data], {type: type});
    
    a.href = window.URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    a.remove();
  },
  
  outputBin: function() {
    PathMain.postMessage({cmd: "output-bin"});
  },
  
  /**
   * @param {String} path - file path info
   * @param {Function} completeFunc - callback when loading complete
   */
  loadBone: function(path, completeFunc) {
    PathMain.completeFunc = completeFunc;
    //console.log(new URL(path, window.location.href).href);
    PathMain.postMessage({cmd: "load-bone", path: new URL(path, window.location.href).href});
  },
  
  /**
   * @param {String} path - file path info
   * @param {Function} completeFunc - callback when loading complete
   * @param {String} jsPath - file path to webworker
   * @param {Boolean} isDebug - use debug mode when true
   */
  init: function(path, completeFunc = null, jsPath = null, isDebug = false) {
    let container = document.getElementById("path-container");
    if(!container) {
      console.error("CanvasContainer is not found.");
      return;
    }
    
    if(!!path) {
      PathMain.path = new URL(path, window.location.href).href;
    }
    
    PathMain.completeFunc = completeFunc;
    
    let currentPath = document.currentScript.src;
    let blob = new Blob([path_control], {type: "text/javascript"});
    let filePath = window.URL.createObjectURL(blob);
    
    let canvas = PathMain.canvas = document.createElement("canvas");
    canvas.className = "main-canvas";
    container.appendChild(canvas);
    
    let subCanvas = PathMain.subCanvas = document.createElement("canvas");
    subCanvas.className = "sub-canvas";
    subCanvas.setAttribute("style", "display:none;");
    container.appendChild(subCanvas);
    
    PathMain.useWorker = !!Worker && !!canvas.transferControlToOffscreen;
    
    if(PathMain.useWorker) {
      PathMain.worker = new Worker(filePath);
      PathMain.initWorker();
      if(!!jsPath) {
        PathMain.postMessage({
          cmd: "set-control",
          path: new URL(jsPath, window.location.href).href,
        });
      }
    } else {
      console.log("this browser is not supported");
      PathMain.worker = window;
      
      let mainScript = document.createElement("script");
      mainScript.src = filePath;
      document.body.appendChild(mainScript);
      
      if(!!jsPath) {
        let subScript = document.createElement("script");
        subScript.src = jsPath;
        document.body.appendChild(subScript);
      }
    }
  },
};