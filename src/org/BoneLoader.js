
/**
 * BoneLoader
 * Singleton
 */
var BoneLoader = {
  
  /**
   * @param {Array} filePathList - json file path list
   * @param {PathContainer} pathContainer
   */
  load: function(filePathList, pathContainer) {
    if(!Array.isArray(filePathList)) {
      console.error("filePathList is not array data.");
      console.log(filePathList);
      return;
    }
    
    let loadIndex = 0;
    let request = new XMLHttpRequest();
    let setJSONData =(bone, data)=> {
      if(!bone || !data) return;
      PathCtr.loadState("BONE: " + bone.id);
      
      let parentBone = pathContainer.getBone(data.parent);
      if("parent" in data && !!parentBone) {
        bone.parentID = parentBone.uid;
        PathCtr.loadState("  parentID: " + bone.parentID + "(" + data.parent + ")");
      }
      
      if("isPin" in data && (typeof data.isPin === "boolean")) {
        bone.isPin = data.isPin;
        PathCtr.loadState("  isPin: " + bone.isPin);
      }
      
      if("fixed" in data && (typeof data.fixed === "boolean")) {
        bone.fixed = data.fixed;
        PathCtr.loadState("  fixed: " + bone.fixed);
      }
      
      if("strength" in data && Number.isFinite(data.strength)) {
        bone.strength = data.strength;
        PathCtr.loadState("  strength: " + bone.strength);
      }
      
      if("maxAngle" in data && Number.isFinite(data.maxAngle)) {
        bone.maxAngle = data.maxAngle/180 * Math.PI;
        PathCtr.loadState("  maxAngle: " + bone.maxAngle);
      }
      
      if("minAngle" in data && Number.isFinite(data.minAngle)) {
        bone.minAngle = data.minAngle/180 * Math.PI;
        PathCtr.loadState("  minAngle: " + bone.minAngle);
      }
      
      if("flexiPoint" in data && (typeof data.flexiPoint === "object")) {
        let dataIndex = data.flexiPoint.dataIndex;
        let boneNameList = data.flexiPoint.bones;
        if(!Number.isFinite(dataIndex) || !Array.isArray(boneNameList)) return;
        if(dataIndex >= 2) return;
        
        PathCtr.loadState("  flexiPoint:");
        PathCtr.loadState("    dataIndex: " + dataIndex);
        let bones = [];
        boneNameList.forEach(name=> {
          let bone = pathContainer.getBone(name);
          if(!!bone) {
            bones.push(bone.uid);
            PathCtr.loadState("    bone: " + name);
          }
        });
        bone.flexiPoint = {
          dataIndex: dataIndex,
          bones: bones,
        };
      }
    };
    
    let loadJson = request.onreadystatechange = function(e) {
      let target = e.target;
      if(target.readyState != 4) return;
      if((target.status != 200 && target.status != 0) || target.responseText == "") {
        console.error("failed to read file: " + target.responseURL);
        console.error(target.statusText);
        return;
      }
      
      let ret = JSON.parse(target.responseText);
      if("bones" in ret && (typeof ret.bones === "object")) {
        Object.keys(ret.bones).forEach(id=>{
          let bone = pathContainer.getBone(id);
          if(!bone) {
            console.error("bone is not found : " + id);
            return;
          }
          setJSONData(bone, ret.bones[id]);
        });
      }
      
      if("flexi" in ret && (typeof ret.flexi === "object")) {
        Object.keys(ret.flexi).forEach(name=> {
          let group = pathContainer.getGroup(name);
          if(!group) {
            console.error("group is not found : " + name);
            return;
          }
          let groupNameList = ret.flexi[name];
          if(!groupNameList || !Array.isArray(groupNameList) || groupNameList.length == 0) return;
          PathCtr.loadState("FLEXI GROUP: " + group.id);
          
          group.flexi = [];
          PathCtr.loadState("  flexi:");
          groupNameList.forEach(name=> {
            let bone = pathContainer.getBone(name);
            if(!!bone) {
              group.flexi.push(bone.uid);
              PathCtr.loadState("    " + name);
            }
          });
        });
      }
      
      if("action" in ret && (typeof ret.action === "object")) {
        Object.keys(ret.action).forEach(name=> {
          let action = pathContainer.actionList.find(action=>action.name == name);
          if(!action) {
            console.error("smart action is not found : " + name);
            return;
          }
          let data = ret.action[name]
          let bone = pathContainer.getBone(data.boneName);
          if(!bone) {
            console.error("bone is not found : " + id);
            return;
          }
          action.smartBoneID = bone.uid;
          action.startAngle = data.startAngle/180 * Math.PI;
          action.endAngle = data.endAngle/180 * Math.PI;
          action.smartFrames = data.smartFrames;
          PathCtr.loadState("  smartAction: " + action.name);
          PathCtr.loadState("    boneName: " + bone.id);
          PathCtr.loadState("    startAngle: " + action.startAngle);
          PathCtr.loadState("    endAngle: " + action.endAngle);
          PathCtr.loadState("    smartFrames: " + action.smartFrames);
        });
      }
      
      if(loadIndex < filePathList.length) {
        request.open("GET", filePathList[loadIndex++], true);
        request.onreadystatechange = loadJson;
        request.send();
        return;
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
            let angle = Math.atan2(y1 - y0, x1 - x0);
            if(isNaN(angle)) angle = bone.defState.angle;
            bone.effectSprite.rotation = bone.defState.angle - angle;
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
        bone.effectSprite.reset();
        bone.defState = BoneObj.getDistAndAngle(bone.id + ":load", pathDataList[0].pos[0], pathDataList[0].pos[1], pathDataList[1].pos[0], pathDataList[1].pos[1]);
      });
      
      PathCtr.loadState("bones JSON load complete.");
      PathCtr.loadState(pathContainer);
      PathWorker.postMessage({cmd: "main-bone-load-complete"});
    }
    
    request.open("GET", filePathList[loadIndex++], true);
    request.send();
  },
};
