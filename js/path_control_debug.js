/**
 * DebugPath
 * Singleton
 */
var DebugPath = {
  isShowBones: false,
  
  /**
   * @param {PathContainer} pathContainer
   */
  addEvents: function(pathContainer) {
    /*
    let groupList = ["layer_head", "neck", "hair", "hat_brim", "jacket", "clothes", "right_arm", "left_arm"];
    let move =(x, y)=>{
      let bone = pathContainer.getGroup("bone1_clothes");
      bone.anchorX = bone.x = 0.35;
      bone.anchorY = bone.y = 0.6;
      bone.rotation = Math.atan2(x - bone.x - pathContainer.x, - y + bone.y);
      
      groupList.forEach(name=>{
        pathContainer.getGroup(name).setSprite(bone);
      });
    };
    window.addEventListener("mousemove", e=>{move(e.clientX/pathContainer.pathRatio, e.clientY/pathContainer.pathRatio)});
    window.addEventListener("touchmove", e=>{move(e.touches[0].pageX/pathContainer.pathRatio, e.touches[0].pageY/pathContainer.pathRatio)});
    */
    window.addEventListener("keyup", function(e) {
      let keyCode = e.keyCode;
      switch(keyCode) {
        case 66:  // B
          DebugPath.isShowBones = !DebugPath.isShowBones;
          break;
      }
    });
  },
}
