/**
 * DebugPath
 * Singleton
 */
var DebugPath = {
  isStop: false,
  isStep: false,
  isShowBones: false,
  
  bonePointSize: 2,
  boneLineSize: 2,
  boneColor: "rgb(0, 255, 0)",
  strengthPointColor: "rgba(0, 255, 0, 0.005)",
  strengthLineColor: "rgba(0, 255, 0, 0.2)",
  
  isShowPoints: false,
  pointSize: 2,
  pointColor: "rgb(255, 0, 0)",
  
  isShowControls: false,
  controlSize: 1,
  controlColor: "rgb(255, 255, 0)",
  
  
  /**
   * @param {PathContainer} pathContainer
   */
  addEvents: function(pathContainer) {
    let mouseX = null;
    let mouseY = null;
    
    let bone = pathContainer.getGroup("bone1_clothes");
    bone.control = function(pathContainer) {
      if(mouseX == null && mouseY == null) return;
      this.rotation = Math.atan2(mouseX - this.currentState.pos[0] - pathContainer.x, - mouseY + this.currentState.pos[1]);
      //this.x = mouseX;
      //this.y = mouseY;
    };
    window.addEventListener("mousemove", e=>{mouseX = e.clientX/pathContainer.pathRatio; mouseY = e.clientY/pathContainer.pathRatio});
    window.addEventListener("touchmove", e=>{mouseX = e.touches[0].pageX/pathContainer.pathRatio; mouseY = e.touches[0].pageY/pathContainer.pathRatio});
    
    window.addEventListener("keyup", e=>{
      switch(e.code) {
        case "Space":
          this.isStop = !this.isStop;
          console.log(this.isStop? "--STOP--":"--START--");
          break;
        case "ArrowRight":
          this.isStep = true;
          break;
        case "KeyD":
          PathCtr.isOutputDebugPrint = !PathCtr.isOutputDebugPrint;
          break;
        case "KeyL":
          PathCtr.isOutputLoadState = !PathCtr.isOutputLoadState;
          break;
        case "KeyB":
          this.isShowBones = !this.isShowBones;
          break;
        case "KeyC":
          this.isShowControls = !this.isShowControls;
          break;
        case "KeyP":
          this.isShowPoints = !this.isShowPoints;
          break;
        case "KeyO":
          if(confirm("現在の状態をJSONに出力します")) {
            this.outputPathContainer(PathCtr.pathContainer);
          }
          break;
      }
    });
  },
  
  isDebugDraw: function() {
    return this.isShowBones || this.isShowPoints || this.isShowControls;
  },
  
  outputPathContainer: function(pathContainer) {
    let data = JSON.stringify(pathContainer, (key, val)=>{
      if(key == "resultPath") return undefined;
      return val;
    }, 2);
    let a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    console.log(a);
    
    a.href = "data:text/plain," + encodeURIComponent(data);
    a.download = "pathContainer.json";
    a.click();
    a.remove();
  },
}
