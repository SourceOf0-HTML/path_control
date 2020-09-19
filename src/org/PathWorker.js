
/**
 * PathWorker
 * Singleton
 */
var PathWorker = {
  instance: null,
  isWorker: false,
  
  /**
   * @param {Object} obj
   */
  postMessage: function(obj) {
    if(PathWorker.isWorker) {
      PathWorker.instance.postMessage(obj);
    } else {
      window.dispatchEvent(new CustomEvent("message", {bubbles: true, detail: obj}));
    }
  },
  
  init: function() {
    PathWorker.instance.addEventListener("message", function(e) {
      let data = !e.data? e.detail : e.data;
      switch(data.cmd) {
        case "init":
          PathCtr.loadState("init");
          PathCtr.defaultBoneName = data.defaultBoneName;
          PathCtr.init(data.canvas, data.subCanvas, data.viewWidth, data.viewHeight);
          return false;
          
        case "load-complete":
          PathCtr.loadComplete();
          PathWorker.postMessage({cmd: "main-init-complete"});
          return false;
          
        case "load-bin":
          BinaryLoader.load(data.path, data.index, ()=>{
            PathCtr.loadComplete();
            PathWorker.postMessage({cmd: "main-init-complete"});
          });
          return false;
          
        case "load-bone":
          BoneLoader.load(data.path, PathCtr.pathContainers[PathCtr.pathContainers.length-1]);
          return false;
          
          
          /* ---- input ---- */
          
        case "resize-canvas":
          PathCtr.setSize(data.viewWidth, data.viewHeight);
          return false;
          
        case "change-action":
          PathCtr.pathContainers[0].setAction(data.name, data.frame);
          return false;
          
        case "mouse-move":
          InputInfo.setMousePos(data.x, data.y);
          return false;
          
        case "mouse-enter":
          InputInfo.isValidPointer = true;
          return false;
          
        case "mouse-leave":
          InputInfo.isValidPointer = false;
          return false;
          
        case "touch-move":
          InputInfo.setTouch(data.touches);
          return false;
          
        case "keyup":
          if(typeof DebugPath !== "undefined") {
            DebugPath.keyUp(PathCtr.pathContainers[0], data.code);
          }
          return false;
          
        case "set-control":
          importScripts(data.path);
          return false;
          
          
          /* ---- output ---- */
          
        case "output-path-container":
          DebugPath.outputJSON(PathCtr.pathContainers[0]);
          return false;
          
        case "output-bin":
          DebugPath.outputBin(PathCtr.pathContainers[0]);
          return false;
          
          
          /* ---- create data ---- */
          
        case "create-path-container":
          PathCtr.loadState("init path container");
          PathCtr.initTarget = new PathContainer(data.name, data.width, data.height);
          PathCtr.initTarget.index = data.index;
          return false;
          
        case "add-action":
          PathCtr.loadState("load action: " + data.actionName + " - " + data.totalFrames);
          PathCtr.initTarget.addAction(data.actionName, data.frame, data.totalFrames);
          return false;
          
        case "add-root-group":
          PathCtr.initTarget.rootGroups.push(data.id);
          return false;
          
        case "new-group":
          PathCtr.initTarget.groups[data.uid] = new GroupObj(
            data.uid,
            data.name,
            [],
            [],
            data.maskID
          );
          return false;
          
        case "new-bone":
          PathCtr.initTarget.groups[data.uid] = new BoneObj(
            data.uid,
            data.name,
            [],
            []
          );
          PathCtr.initTarget.bones.push(data.uid);
          return false;
          
        case "add-group-action":
          if(!PathCtr.initTarget.bones.includes(data.uid)) {
            PathCtr.initTarget.groups[data.uid].addAction(
              data.childGroups,
              data.frame,
              PathCtr.initTarget.getAction(data.actionName).id
            );
          }
          return false;
          
        case "set-child-group-id":
          if(PathCtr.initTarget.bones.includes(data.uid)) {
            PathCtr.initTarget.groups[data.uid].childGroups = data.childGroups;
          } else {
            PathCtr.initTarget.groups[data.uid].childGroups.setData(data.childGroups);
          }
          return false;
          
        case "new-path":
          PathCtr.initTarget.groups[data.uid].paths.push(new PathObj(
            data.maskID,
            data.pathDataList,
            data.pathDiffList,
            data.fillRule,
            data.fillStyle,
            data.lineWidth,
            data.strokeStyle
          ));
          return false;
          
        case "new-bone-path":
          PathCtr.initTarget.groups[data.uid].paths.push(new PathObj(
            null,
            data.pathDataList,
            data.pathDiffList,
            "nonzero",
            "transparent",
            2,
            "rgb(0, 255, 0)"
          ));
          if(PathCtr.initTarget.groups[data.uid].paths.length == 1) {
            let bone = PathCtr.initTarget.groups[data.uid];
            BoneObj.setPath(bone, bone.paths[0]);
          }
          return false;
          
        case "add-path-action":
          PathCtr.initTarget.groups[data.uid].paths[data.pathID].addAction(
            data.pathDataList,
            data.fillStyle,
            data.lineWidth,
            data.strokeStyle,
            data.frame,
            PathCtr.initTarget.getAction(data.actionName).id
          );
          return false;
          
        case "add-bone-path-action":
          PathCtr.initTarget.groups[data.uid].paths[data.pathID].addAction(
            data.pathDataList,
            "transparent",
            2,
            "rgb(0, 255, 0)",
            data.frame,
            PathCtr.initTarget.getAction(data.actionName).id
          );
          return false;
          
        case "set-unvisible-path-action":
          PathCtr.initTarget.groups[data.uid].paths.forEach(path=>{
            path.addAction(
              null,
              "transparent",
              0,
              "transparent",
              data.frame,
              PathCtr.initTarget.getAction(data.actionName).id
            );
          });
          return false;
          
          
        default:
          if(!e.bubbles) console.error("unknown command: " + data.cmd);
          return true;
      };
    }, false);
  },
};

PathWorker.isWorker = typeof DedicatedWorkerGlobalScope !== "undefined";
if(PathWorker.isWorker) {
  PathWorker.instance = this;
  PathWorker.init();
} else {
  PathWorker.instance = window;
  PathWorker.init();
  PathMain.initWorker();
}

