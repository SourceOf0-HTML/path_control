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
    
    let move =(x, y)=>{
      let bone = pathContainer.getGroup("bone1_clothes");
      let x0 = 0.35;
      let y0 = 0.6;
      /*
      let bone = pathContainer.getGroup("bone18_face_S");
      let x0 = 0.7;
      let y0 = 0.5;
      */
      bone.rotation = Math.atan2(x - x0 - pathContainer.x, - y + y0);
    };
    window.addEventListener("mousemove", e=>{move(e.clientX/pathContainer.pathRatio, e.clientY/pathContainer.pathRatio)});
    window.addEventListener("touchmove", e=>{move(e.touches[0].pageX/pathContainer.pathRatio, e.touches[0].pageY/pathContainer.pathRatio)});
    
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
          this.outputPathContainer(PathCtr.pathContainer);
          break;
      }
    });
  },
  
  isDebugDraw: function() {
    return this.isShowBones || this.isShowPoints || this.isShowControls;
  },
  
  outputPathContainer: function(pathContainer) {
    let data = JSON.stringify(pathContainer, null, 2);
    let a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    console.log(a);
    
    a.href = "data:text/plain," + encodeURIComponent(data);
    a.download = "pathContainer_" + PathCtr.currentFrame + ".json";
    a.click();
    a.remove();
  },
}
