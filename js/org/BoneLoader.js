
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
    
    console.log(pathContainer);
    
    request.onload = function(e) {
      let target = e.target;
      if(target.readyState != 4) return;
      if(target.status != 200 && target.status != 0) return;
      
      let ret = JSON.parse(target.responseText);
      Object.keys(ret).forEach(id=>{
        let bone = pathContainer.getGroup(id);
        if(!bone) {
          console.error("bone is not found : " + id);
          return;
        }
        if(!bone.setJSONData) {
          console.error(id + " is not bone");
          return;
        }
        bone.setJSONData(pathContainer, ret[id]);
      });
    }
    request.open("GET", filePath, true);
    request.send();
  },
}
