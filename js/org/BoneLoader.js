
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
          let id = pathContainer.groupNameToIDList[name];
          if(!id) {
            console.error("group is not found : " + name);
            return;
          }
          pathContainer.groups[id].setFlexiBones(pathContainer, ret.flexi[name]);
        });
      }
      
      PathCtr.loadState("bones JSON load complete.");
      PathCtr.loadState(pathContainer);
    }
    request.open("GET", filePath, true);
    request.send();
  },
}
