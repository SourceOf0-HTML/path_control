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
    
    let groupList = ["neck", "hair", "hat_brim", "jacket", "clothes", "right_arm", "left_arm"];
    let move =(x, y)=>{
      let group = pathContainer.getGroup("layer_head");
      group.anchorX = group.x = 0.35;
      group.anchorY = group.y = 0.6;
      group.rotation = Math.atan2(x - group.x - pathContainer.x, - y + group.y);
      
      groupList.forEach(name=>{
        pathContainer.getGroup(name).setSprite(group);
      });
    };
    window.addEventListener("mousemove", e=>{move(e.clientX/pathContainer.pathRatio, e.clientY/pathContainer.pathRatio)});
    window.addEventListener("touchmove", e=>{move(e.touches[0].pageX/pathContainer.pathRatio, e.touches[0].pageY/pathContainer.pathRatio)});
    
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
