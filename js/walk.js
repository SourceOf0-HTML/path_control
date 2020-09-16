function setup(pathContainer) {
  pathContainer.setAction("walk", 100);
  
  //let hair = pathContainer.getGroup("bone11_hair");
  //hair.mRotation = 0;
  
  let leftArm = pathContainer.getGroup("bone6_left_arm");
  leftArm.initIK();
}

function control(pathContainer) {
  //let hair = pathContainer.getGroup("bone11_hair");
  //hair.rotation = hair.mRotation += 0.01;
  
  let leftArm = pathContainer.getGroup("bone6_left_arm");
  if(InputInfo.isValidPointer) {
    leftArm.posIK.enable = true;
    leftArm.posIK.x = InputInfo.pointerX / pathContainer.pathRatio;
    leftArm.posIK.y = InputInfo.pointerY / pathContainer.pathRatio;
  }
  
  let mainBone = pathContainer.getGroup("main_bone");
  let childGroups = mainBone.childGroups.result = mainBone.childGroups.result.concat();
  let armUID = pathContainer.getGroup("left_arm").uid;
  let jacketIndex = childGroups.indexOf(pathContainer.getGroup("jacket").uid);
  let armIndex = childGroups.indexOf(armUID);
  if(jacketIndex > armIndex) {
    childGroups.splice(armIndex, 1);
    childGroups.push(armUID);
  }
}