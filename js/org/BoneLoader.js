
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
      
      PathCtr.loadState("bones JSON load complete.");
      PathCtr.loadState(pathContainer);
    }
    request.open("GET", filePath, true);
    request.send();
  },
};
