
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
          bone.setJSONData(pathContainer, ret.bones[id]);
        });
      }
      if(!!ret.flexi) {
        Object.keys(ret.flexi).forEach(name=>{
          let group = pathContainer.getGroup(name);
          if(!group) {
            console.error("group is not found : " + name);
            return;
          }
          group.setFlexiBones(pathContainer, ret.flexi[name]);
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
}
