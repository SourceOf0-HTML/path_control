
/**
 * PathWorker
 * Worker events
 */
addEventListener("message", function(e) {
  let data = e.data;
  switch (data.cmd) {
    case "init":
      PathCtr.defaultBoneName = data.defaultBoneName;
      PathCtr.init(data.canvas, data.viewWidth, data.viewHeight);
      break;
      
    case "load-bin":
      BinaryLoader.load(data.path, ()=>{
        postMessage({"cmd": "init-complete"});
      });
      break;
      
    case "load-bone":
      BoneLoader.load(data.path, PathCtr.pathContainer);
      break;
      
    case "resize-canvas":
      PathCtr.setSize(data.viewWidth, data.viewHeight);
      break;
      
    case "move-mouse":
      if(typeof DebugPath !== "undefined") {
        DebugPath.moveMouse(PathCtr.pathContainer, data.x, data.y);
      }
      break;
      
    case "keyup":
      if(typeof DebugPath !== "undefined") {
        DebugPath.keyUp(PathCtr.pathContainer, data.code);
      }
      break;
      
    case "output-path-container":
      DebugPath.outputJSON(PathCtr.pathContainer);
      break;
      
    case "output-bin":
      DebugPath.outputBin(PathCtr.pathContainer);
      break;
      
    case "create-path-container":
      PathCtr.loadState("init path container");
      PathCtr.initTarget = new PathContainer(data.width, data.height);
      break;
      
    case "add-action":
      PathCtr.loadState("load action: " + data.actionName + " - " + data.totalFrames);
      PathCtr.initTarget.addAction(data.actionName, data.frame, data.totalFrames);
      break;
      
    case "add-root-group":
      PathCtr.initTarget.rootGroups.push(data.id);
      break;
      
    case "new-group":
      PathCtr.initTarget.groups[data.uid] = new GroupObj(
        data.uid,
        data.name,
        [],
        [],
        data.maskID
      );
      break;
      
    case "new-bone":
      PathCtr.initTarget.groups[data.uid] = new BoneObj(
        data.uid,
        data.name,
        [],
        []
      );
      PathCtr.initTarget.bones.push(data.uid);
      break;
      
    case "add-group-action":
      if(!PathCtr.initTarget.bones.includes(data.uid)) {
        PathCtr.initTarget.groups[data.uid].addAction(
          data.childGroups,
          data.frame,
          PathCtr.initTarget.getAction(data.actionName).id
        );
      }
      break;
      
    case "set-child-group-id":
      if(PathCtr.initTarget.bones.includes(data.uid)) {
        PathCtr.initTarget.groups[data.uid].childGroups = data.childGroups;
      } else {
        PathCtr.initTarget.groups[data.uid].childGroups.setData(data.childGroups);
      }
      break;
      
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
      break;
      
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
      break;
      
    case "add-path-action":
      PathCtr.initTarget.groups[data.uid].paths[data.pathID].addAction(
        data.pathDataList,
        data.fillStyle,
        data.lineWidth,
        data.strokeStyle,
        data.frame,
        PathCtr.initTarget.getAction(data.actionName).id
      );
      break;
      
    case "add-bone-path-action":
      PathCtr.initTarget.groups[data.uid].paths[data.pathID].addAction(
        data.pathDataList,
        "transparent",
        2,
        "rgb(0, 255, 0)",
        data.frame,
        PathCtr.initTarget.getAction(data.actionName).id
      );
      break;
      
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
      break;
      
    case "load-complete":
      PathCtr.loadComplete();
      postMessage({"cmd": "init-complete"});
      break;
      
      
    default:
      console.error("unknown command: " + data.cmd);
      break;
  };
}, false);
