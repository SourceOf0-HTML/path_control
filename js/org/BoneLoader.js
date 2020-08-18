
/**
 * BoneLoader
 * Singleton
 */
var BoneLoader = {
  
  /**
   * @param {String} filePath - binary file path
   */
  load: function(filePath, pathContainer) {
    let request = new XMLHttpRequest();
    let setJSONData =(bone, data)=> {
      if(!bone || !data) return;
      PathCtr.loadState("BONE:" + bone.id);
      
      let parentBone = pathContainer.getBone(data.parent);
      if("parent" in data && !!parentBone) {
        bone.parentID = parentBone.uid;
        PathCtr.loadState("  parentID:" + bone.parentID + "(" + data.parent + ")");
      }
      
      if("isParentPin" in data && (typeof data.isParentPin === "boolean")) {
        bone.isParentPin = data.isParentPin;
        PathCtr.loadState("  isParentPin:" + bone.isParentPin);
      }
      
      if("feedback" in data && (typeof data.feedback === "boolean")) {
        bone.feedback = data.feedback;
        PathCtr.loadState("  feedback:" + bone.feedback);
      }
      
      if("strength" in data && Number.isFinite(data.strength)) {
        bone.strength = data.strength;
        PathCtr.loadState("  strength:" + bone.strength);
      }
      
      if("isSmartBone" in data && (typeof data.isSmartBone === "boolean")) {
        bone.isSmartBone = data.isSmartBone;
        PathCtr.loadState("  isSmartBone:" + bone.isSmartBone);
      }
      
      if("smartBase" in data && Number.isFinite(data.smartBase)) {
        bone.smartBase = data.smartBase/180 * Math.PI;
        PathCtr.loadState("  smartBase:" + bone.smartBase);
      }
      
      if("smartMax" in data && Number.isFinite(data.smartMax)) {
        bone.smartMax = data.smartMax/180 * Math.PI;
        PathCtr.loadState("  smartMax:" + bone.smartMax);
      }
    };
    
    let setFlexiBones =(group, nameList)=> {
      if(!nameList || !Array.isArray(nameList) || nameList.length == 0) return;
      PathCtr.loadState("GROUP:" + group.id);
      
      group.flexi.length = 0;
      
      nameList.forEach(name=> {
        let bone = pathContainer.getBone(name);
        if(!!bone) {
          PathCtr.loadState("  flexi:");
          group.flexi.push(bone.uid);
          PathCtr.loadState("    " + name);
        }
      });
    };
    
    request.onload = function(e) {
      let target = e.target;
      if(target.readyState != 4) return;
      if(target.status != 200 && target.status != 0) return;
      
      let ret = JSON.parse(target.responseText);
      if(!!ret.bones) {
        Object.keys(ret.bones).forEach(id=>{
          let bone = pathContainer.getBone(id);
          if(!bone) {
            console.error("bone is not found : " + id);
            return;
          }
          setJSONData(bone, ret.bones[id]);
        });
      }
      if(!!ret.flexi) {
        Object.keys(ret.flexi).forEach(name=>{
          let group = pathContainer.getGroup(name);
          if(!group) {
            console.error("group is not found : " + name);
            return;
          }
          setFlexiBones(group, ret.flexi[name]);
        });
      }
      
      if(!!ret.smartAction) {
        Object.keys(ret.smartAction).forEach(name=>{
          let action = pathContainer.actionList.find(data=>data.name == name);
          if(!action) {
            console.error("smart action is not found : " + name);
            return;
          }
          let boneName = ret.smartAction[name];
          let bone = pathContainer.getBone(boneName);
          if(!bone) {
            console.error("smart bone is not found : " + boneName);
            return;
          }
          action.smartBoneID = bone.uid;
          PathCtr.loadState("smartAction: " + name + " - " + boneName);
        });
      }
      
      
      let amendBonePos =(id, actionID, frame, boneIDs)=> {
        if(boneIDs.includes(id)) return;
        boneIDs.push(id);
        
        let bone = pathContainer.groups[id];
        if(!bone.defState) return;
        
        let pathDiffList = bone.paths[0].pathDiffList;
        if(!pathDiffList.hasActionID(actionID)) return;
        
        let pathDiffListData = pathDiffList.data[actionID][frame];
        if(typeof pathDiffListData === "undefined") return;
        
        let pathDataList = bone.paths[0].getPathDataList(frame, actionID);
        
        let parentID = bone.parentID;
        if(typeof parentID !== "undefined") {
          let target = pathContainer.groups[parentID];
          amendBonePos(parentID, actionID, frame, boneIDs);
          if(bone.isParentPin) {
            let diffX = target.anchorX - target.defState.x0;
            let diffY = target.anchorY - target.defState.y0;
            pathDiffListData[0][0] -= diffX;
            pathDiffListData[0][1] -= diffY;
            pathDiffListData[1][0] -= diffX;
            pathDiffListData[1][1] -= diffY;
          } else {
            let diffX = target.x - target.defState.x1;
            let diffY = target.y - target.defState.y1;
            let data = [pathDataList[0].pos[0] - diffX, pathDataList[0].pos[1] - diffY, pathDataList[1].pos[0] - diffX, pathDataList[1].pos[1] - diffY];
            target.effectSprite.x = target.effectSprite.anchorX = data[0];
            target.effectSprite.y = target.effectSprite.anchorY = data[1];
            target.effectSprite.getMatrix().applyToArray(data);
            pathDiffListData[0][0] = data[0] - bone.defState.x0;
            pathDiffListData[0][1] = data[1] - bone.defState.y0;
            pathDiffListData[1][0] = data[2] - bone.defState.x1;
            pathDiffListData[1][1] = data[3] - bone.defState.y1;
          }
        }
      };
      
      pathContainer.actionList.forEach(action=> {
        let actionID = action.id;
        for(let frame = 1; frame < action.totalFrames; ++frame) {
          pathContainer.bones.forEach(id=> {
            let bone = pathContainer.groups[id];
            if(!bone.defState) return;
            
            let pathDiffList = bone.paths[0].pathDiffList;
            if(!pathDiffList.hasActionID(actionID)) {
              if(frame != 1) return;
            } else {
              let pathDiffListData = pathDiffList.data[actionID][frame];
              if(typeof pathDiffListData === "undefined") return;
            }
            
            let pathDataList = bone.paths[0].getPathDataList(frame, actionID);
            
            let x0 = bone.anchorX = pathDataList[0].pos[0];
            let y0 = bone.anchorY = pathDataList[0].pos[1];
            let x1 = bone.x = pathDataList[1].pos[0];
            let y1 = bone.y = pathDataList[1].pos[1];
            bone.effectSprite.rotation = bone.defState.angle - Math.atan2(y1 - y0, x1 - x0);
          });
          let boneIDs = [];
          pathContainer.bones.forEach(id=>amendBonePos(id, actionID, frame, boneIDs));
        }
      });
      
      pathContainer.bones.forEach(id=> {
        let bone = pathContainer.groups[id];
        bone.reset();
        if(!bone.defState) return;
        let pathDataList = bone.paths[0].getPathDataList(0, 0);
        let x0 = pathDataList[0].pos[0];
        let y0 = pathDataList[0].pos[1];
        let x1 = pathDataList[1].pos[0];
        let y1 = pathDataList[1].pos[1];
        let distX = x1 - x0;
        let distY = y1 - y0;
        bone.effectSprite.reset();
        bone.defState.x0 = x0;
        bone.defState.y0 = y0;
        bone.defState.x1 = x1;
        bone.defState.y1 = y1;
        bone.defState.distance = Math.sqrt(distX*distX + distY*distY);
        bone.defState.angle = Math.atan2(distY, distX);
      });
      
      PathCtr.loadState("bones JSON load complete.");
      PathCtr.loadState(pathContainer);
      PathWorker.postMessage({cmd: "main-bone-load-complete"});
    }
    request.open("GET", filePath, true);
    request.send();
  },
};
