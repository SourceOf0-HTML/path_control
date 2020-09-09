function loadComplete() {
  
  PathMain.postMessage({
    cmd: "change-action", 
    name: "walk",
  });
  /*
  PathMain.postMessage({
    cmd: "set-group-control",
    name: "bone11_hair",
    initFuncStr: `
      this.mRotation = 0;
    `,
    controlFuncStr: `
      this.mRotation += 0.01;
      this.rotation = this.mRotation;
    `,
  });
  */
  PathMain.postMessage({
    cmd: "set-group-control",
    //name: "bone6_left_arm",
    name: "bone4_head",
    initFuncStr: `
      this.initIK();
    `,
    controlFuncStr: `
      if(!pathContainer.mouseX && !pathContainer.mouseY) {
        this.posIK.enable = false;
        return;
      }
      this.posIK.enable = true;
      this.posIK.x = pathContainer.mouseX;
      this.posIK.y = pathContainer.mouseY;
    `,
  });
  PathMain.postMessage({
    cmd: "set-group-control",
    name: "main_bone",
    controlFuncStr: `
      let childGroups = this.childGroups.result = this.childGroups.result.concat();
      let armUID = pathContainer.getGroup("left_arm").uid;
      let jacketIndex = childGroups.indexOf(pathContainer.getGroup("jacket").uid);
      let armIndex = childGroups.indexOf(armUID);
      if(jacketIndex > armIndex) {
        childGroups.splice(armIndex, 1);
        childGroups.push(armUID);
      }
    `,
  });
}

PathMain.init("../resource/path_data.bin", loadComplete, true);
