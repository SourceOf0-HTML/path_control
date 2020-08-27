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
    name: "bone4_head",
    initFuncStr: `
      this.initIK(1);
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
}

PathMain.init("../resource/path_data.bin", loadComplete, true);
