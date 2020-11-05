function setup(pathContainer) {
  if(pathContainer.name != "walk") return;
  pathContainer.setAction("歩き", 100);
  
  //let hair = pathContainer.getGroup("bone11_hair");
  //hair.mRotation = 0;
  
  let leftArm = pathContainer.getGroup("bone_B11");
  leftArm.initIK();
}

function control(pathContainer) {
  if(pathContainer.name != "walk") return;
  
  //let hair = pathContainer.getGroup("bone11_hair");
  //hair.rotation = hair.mRotation += 0.01;
  
  let leftArm = pathContainer.getGroup("bone_B11");
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
