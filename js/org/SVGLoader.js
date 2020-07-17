/**
 * SVGLoader
 * Singleton
 */
var SVGLoader = {
  
  FILE_KIND_BASE: "BASE",
  FILE_KIND_BONE: "BONE",
  FILE_KIND_SMRT: "SMRT",
  initKind: "",
  
  /**
   * @param {String} maskStr - mask attribute of element
   * @return {GroupObj} - mask group
   */
  getMaskId: function(maskStr) {
    if(!maskStr) return null;
    let maskID = maskStr.replace(/^url\(#/, "").replace(/\)$/, "");
    if(!!PathCtr.initTarget.masks[maskID]) {
      return PathCtr.initTarget.masks[maskID];
    }
    console.error("unknown mask name : " + maskStr);
    return null;
  },
  
  /**
   * @param {String} dataAttribute - d attribute of path element
   * @return {Array} - list of path data
   */
  makePathDataList: function(dataAttribute) {
    let ret = [];
    
    let data;
    if(dataAttribute.indexOf(",") < 0) {
      data = dataAttribute.split(/ /);
    } else {
      data = dataAttribute.replace(/([MCZ])/g,",$1,").replace(/[^,]-/g,",-").split(/[, ]/);
    }
    
    let baseX = PathCtr.initTarget.originalWidth;
    let baseY = PathCtr.initTarget.originalHeight;
    let base = (baseX > baseY)? baseX : baseY;
    let getX=()=>parseFloat(data.shift())/base;
    let getY=()=>parseFloat(data.shift())/base;
    
    while(data.length > 0) {
      let type = data.shift();
      switch(type) {
        case "M":
          // USEGE : path2D.moveTo(pos[0], pos[1])
          ret.push({type:"M", pos:[getX(), getY()]});
          break;
        case "C":
          // USEGE : path2D.bezierCurveTo(pos[0], pos[1], pos[2], pos[3], pos[4], pos[5])
          ret.push({type:"C", pos:[getX(), getY(), getX(), getY(), getX(), getY()]});
          break;
        case "Z":
          // USEGE : path2D.closePath()
          ret.push({type:"Z"});
          break;
        case "":
          // do nothing.
          break;
        default:
          console.error("unknown type : " + type);
          console.log(type);
          break;
      }
    }
    return ret;
  },
  
  /**
   * @param {HTMLElement} pathDOM - path element
   * @param {CSSStyleDeclaration} style - window.getComputedStyle(pathDOM)
   * @return {PathObj}
   */
  makePath: function(pathDOM, style) {
    //PathCtr.debugPrint("makePath");
    //PathCtr.debugPrint(style.fill);
    let fillStyle = style.fill;
    if(fillStyle == "none") {
      fillStyle = "transparent";
    }
    
    let lineWidth = 0;
    let strokeStyle = style.stroke;
    if(strokeStyle == "none") {
      strokeStyle = "transparent";
    } else {
      lineWidth = parseFloat(style.strokeWidth.match(/([\d\.]+)/)[1]);
    }
    
    let pathDataList = this.makePathDataList(pathDOM.getAttribute("d"));
    let pathDiffList = [];
    pathDataList.forEach(d=>pathDiffList.push((!d.pos)? undefined : d.pos.slice().fill(0)));
    
    return new PathObj(
      this.getMaskId(pathDOM.getAttribute("mask")),
      pathDataList,
      pathDiffList,
      style.fillRule,
      fillStyle,
      lineWidth,
      strokeStyle,
    );
  },
  
  /**
   * @param {PathObj} path
   * @param {HTMLElement} pathDOM - path element
   * @param {CSSStyleDeclaration} style - window.getComputedStyle(pathDOM)
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   */
  addActionPath: function(path, pathDOM, style, frame, actionID) {
    let fillStyle = (!pathDOM)? "none" : style.fill;
    if(fillStyle == "none") {
      fillStyle = "transparent";
    }
    
    let lineWidth = 0;
    let strokeStyle = (!pathDOM)? "none" : style.stroke;
    if(strokeStyle == "none") {
      strokeStyle = "transparent";
    } else {
      lineWidth = parseFloat(style.strokeWidth.match(/([\d\.]+)/)[1]);
    }
    
    let pathDataList = null;
    if(!!pathDOM) {
      pathDataList = this.makePathDataList(pathDOM.getAttribute("d"));
    }
    
    path.addAction(
      pathDataList,
      fillStyle,
      lineWidth,
      strokeStyle,
      frame,
      actionID,
    );
  },
  
  /**
   * @param {String} dataAttribute - d attribute of path element
   * @return {Array} - list of path data
   */
  makeBonePathDataList: function(dataAttribute) {
    let ret = [];
    
    let data;
    if(dataAttribute.indexOf(",") < 0) {
      data = dataAttribute.split(/ /);
    } else {
      data = dataAttribute.replace(/([MCZ])/g,",$1,").replace(/[^,]-/g,",-").split(/[, ]/);
    }
    
    let baseX = PathCtr.initTarget.originalWidth;
    let baseY = PathCtr.initTarget.originalHeight;
    let base = (baseX > baseY)? baseX : baseY;
    let getX=()=>parseFloat(data.shift())/base;
    let getY=()=>parseFloat(data.shift())/base;
    
    let posData = [];
    while(data.length > 0 && posData.length < 3) {
      let type = data.shift();
      switch(type) {
        case "M":
          posData.push([getX(), getY()]);
          break;
        case "C":
          data.shift();
          data.shift();
          data.shift();
          data.shift();
          posData.push([getX(), getY()]);
          break;
        case "":
          // do nothing.
          break;
        default:
          console.error("unknown type : " + type);
          console.log(type);
          break;
      }
    }
    
    let dist1X = posData[1][0] - posData[0][0];
    let dist1Y = posData[1][1] - posData[0][1];
    let dist1 = dist1X * dist1X + dist1Y * dist1Y;
    
    let dist2X = posData[2][0] - posData[0][0];
    let dist2Y = posData[2][1] - posData[0][1];
    let dist2 = dist2X * dist2X + dist2Y * dist2Y;
    
    if(dist1 > dist2) {
      ret.push({type:"M", pos:[posData[0][0] + dist2X/2, posData[0][1] + dist2Y/2]});
      ret.push({type:"L", pos:[posData[1][0], posData[1][1]]});
    } else {
      ret.push({type:"M", pos:[posData[0][0] + dist1X/2, posData[0][1] + dist1Y/2]});
      ret.push({type:"L", pos:[posData[2][0], posData[2][1]]});
    }
    
    return ret;
  },
  
  /**
   * @param {HTMLElement} pathDOM - path element
   * @return {PathObj}
   */
  makeBonePath: function(pathDOM) {
    let pathDataList = this.makeBonePathDataList(pathDOM.getAttribute("d"));
    let pathDiffList = [];
    pathDataList.forEach(d=>pathDiffList.push((!d.pos)? undefined : d.pos.slice().fill(0)));
    return new PathObj(
      this.getMaskId(pathDOM.getAttribute("mask")),
      pathDataList,
      pathDiffList,
      "nonzero",
      "transparent",
      2,
      "rgb(0, 255, 0)",
    );
  },
  
  /**
   * @param {PathObj} path
   * @param {HTMLElement} pathDOM - path element
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   */
  addBoneActionPath: function(path, pathDOM, frame, actionID) {
    let pathDataList = null;
    if(!!pathDOM) {
      pathDataList = this.makeBonePathDataList(pathDOM.getAttribute("d"));
    }
    
    path.addAction(
      pathDataList,
      "transparent",
      2,
      "rgb(0, 255, 0)",
      frame,
      actionID,
    );
  },
  
  /**
   * @param {HTMLElement} groupDOM - group element
   * @return {GroupObj}
   */
  makeGroup: function(groupDOM) {
    let name = groupDOM.getAttribute("id");
    let paths = [];
    let childGroups = [];
    let children = Array.prototype.slice.call(groupDOM.children);
    let isBone = name.startsWith(PathCtr.defaultBoneName);
    
    if(!isBone && this.initKind === this.FILE_KIND_BONE) {
      PathCtr.loadState("  skip load : " + name);
      return null;
    }
    
    children.forEach(child=>{
      let tagName = child.tagName;
      PathCtr.debugPrint("make group : " + name + " : " + tagName);
      switch(tagName) {
        case "path":
          if(isBone) {
            paths.push( this.makeBonePath(child) );
          } else {
            paths.push( this.makePath(child, window.getComputedStyle(child)) );
          }
          break;
        case "mask":
          // do nothing.
          break;
        case "clipPath":
          // TODO
          break;
        case "g":
          childGroups.push(PathCtr.initTarget.groupNameToIDList[child.getAttribute("id")]);
          this.makeGroup(child);
          break;
        default:
          console.error("unknown element");
          console.log(child);
          break;
      }
    });
    
    let ret;
    if(isBone) {
      ret = new BoneObj(
        name,
        paths,
        childGroups,
        false,
      );
      PathCtr.initTarget.bones.push(PathCtr.initTarget.groupNameToIDList[name]);
    } else {
      ret = new GroupObj(
        name,
        paths,
        childGroups,
        false,
        this.getMaskId(groupDOM.getAttribute("mask"))
      );
    }
    
    PathCtr.initTarget.groups[PathCtr.initTarget.groupNameToIDList[name]] = ret;
    
    return ret;
  },
  
  /**
   * @param {HTMLElement} groupDOM - group element
   * @param {String} name - group name
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   */
  addActionGroup: function(groupDOM, name, frame, actionID) {
    let id = PathCtr.initTarget.groupNameToIDList[name];
    let targetGroup = PathCtr.initTarget.groups[id];
    let childGroups = [];
    let dataIndex = 0;
    let isBone = PathCtr.initTarget.bones.includes(id);
    
    if(!isBone && this.initKind === this.FILE_KIND_BONE) {
      PathCtr.loadState("  skip load : " + name);
      return;
    }
    
    if(!!groupDOM) {
      let children = Array.prototype.slice.call(groupDOM.children);
      children.forEach(child=>{
        let name = child.tagName;
        switch(name) {
          case "path":
            if(isBone) {
              this.addBoneActionPath(targetGroup.paths[dataIndex++], child, frame, actionID);
            } else {
              this.addActionPath(targetGroup.paths[dataIndex++], child, window.getComputedStyle(child), frame, actionID);
            }
            break;
          case "mask":
          case "clipPath":
            break;
          case "g":
            childGroups.push(PathCtr.initTarget.groupNameToIDList[child.getAttribute("id")]);
            break;
          default:
            console.error("unknown element");
            console.log(child);
            break;
        }
      });
    } else {
      let children = Array.prototype.slice.call(targetGroup.paths);
      children.forEach(child=>{
        this.addActionPath(child, null, null, frame, actionID);
      });
    }
    targetGroup.addAction(childGroups, frame, actionID);
  },
  
  /**
   * @param {HTMLElement} groupDOM - group element
   * @return {PathContainer}
   */
  init: function(groupsDOM) {
    if(!groupsDOM) {
      console.error("groups dom is not found");
      return null;
    }
    
    PathCtr.loadState("init");
    
    let pathContainer = PathCtr.initTarget = new PathContainer();
    
    pathContainer.originalWidth = pathContainer.displayWidth = parseInt(groupsDOM.getAttribute("width").replace("px", ""));
    pathContainer.originalHeight = pathContainer.displayHeight = parseInt(groupsDOM.getAttribute("height").replace("px", ""));
    
    let groups = Array.prototype.slice.call(groupsDOM.getElementsByTagName("g"));
    groups.forEach(group=>{
      let name = group.getAttribute("id");
      if(pathContainer.groupNameToIDList[name] != null) {
        console.error("group ID is duplicated : " + name);
        return;
      }
      pathContainer.groupNameToIDList[name] = Object.keys(pathContainer.groupNameToIDList).length;
    });
    
    let masks = Array.prototype.slice.call(groupsDOM.getElementsByTagName("mask"));
    masks.forEach(mask=>{
      let maskChildren = Array.prototype.slice.call(mask.children);
      maskChildren.forEach(child=>{
        if( child.tagName == "use" ) {
          pathContainer.masks[mask.getAttribute("id")] = pathContainer.groupNameToIDList[child.getAttribute("xlink:href").slice(1)];
        } else {
          console.error("unknown mask data");
          console.log(child);
        }
      });
    });
    
    let children = Array.prototype.slice.call(groupsDOM.children);
    children.forEach(child=>{
      if(child.tagName != "g") return;
      let group = this.makeGroup(child);
      if(!group) return;
      pathContainer.rootGroups.push(pathContainer.groupNameToIDList[group.id]);
    });
    PathCtr.initTarget = null;
    
    return pathContainer;
  },
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Array} groupsDOMList - group elements array
   * @param {String} actionName
   */
  addActionFromList: function(pathContainer, groupsDOMList, actionID = 0) {
    if(!pathContainer) {
      console.error("path container is not found");
      return;
    }
    if(!groupsDOMList) {
      console.error("groups dom list is not found");
      return;
    }
    
    PathCtr.initTarget = pathContainer;
    
    PathCtr.loadState("check id");
    let actionGroup = {};
    let groupsDOMArr = Array.prototype.slice.call(groupsDOMList);
    let baseDom = groupsDOMArr[0];
    let baseGroups = baseDom.getElementsByTagName("g");
    let frame = 0;
    groupsDOMArr.forEach(targetDom=>{
      let targetGroups = targetDom.getElementsByTagName("g");
      let targetIds = [].map.call(targetGroups, group=>group.getAttribute("id"));
      Array.prototype.forEach.call(targetIds, id=>{
        if(pathContainer.groupNameToIDList[id] != null) return;
        pathContainer.groupNameToIDList[id] = Object.keys(pathContainer.groupNameToIDList).length;
        this.makeGroup(targetDom.getElementById(id));
      });
      let masks = Array.prototype.slice.call(targetDom.getElementsByTagName("mask"));
      masks.forEach(mask=>{
        let maskID = mask.getAttribute("id");
        if(pathContainer.masks[maskID]) return;
        let maskChildren = Array.prototype.slice.call(mask.children);
        maskChildren.forEach(child=>{
          if( child.tagName == "use" ) {
            pathContainer.masks[maskID] = pathContainer.groupNameToIDList[child.getAttribute("xlink:href").slice(1)];
          } else {
            console.error("unknown mask data");
            console.log(child);
          }
        });
      });
    });
    
    PathCtr.loadState(pathContainer);
    PathCtr.loadState("check diff");
    groupsDOMArr.forEach(targetDom=>{
      Object.keys(pathContainer.groupNameToIDList).forEach(name=>{
        let base = baseDom.getElementById(name);
        if( !base || !targetDom || !base.isEqualNode(targetDom.getElementById(name)) ) {
          actionGroup[name] = true;
        }
      });
    });
    
    groupsDOMArr.forEach((targetDom, frame)=>{
      if(frame == 0) return;
      if(frame % 10 == 0) PathCtr.loadState("add action : " + actionID + " - " + frame);
      Object.keys(actionGroup).forEach(key=>{
        this.addActionGroup(targetDom.getElementById(key), key, frame, actionID);
      });
    });
    
    PathCtr.initTarget = null;
  },
  
  /**
   * @param {Array} fileInfoList - [ [ kind, totalFrames, actionName, filePath ], ... ]
   * @param {Function} completeFunc - callback when loading complete
   */
  load: function(fileInfoList, completeFunc = null) {
    if(!fileInfoList || !Array.isArray(fileInfoList) || !Array.isArray(fileInfoList[0])) {
      console.error("fileInfoList format is woring");
      console.log(fileInfoList);
      return;
    }
    if(fileInfoList[0][0] != SVGLoader.FILE_KIND_BASE) {
      console.error("action kind \"" + SVGLoader.FILE_KIND_BASE + "\" is missing in fileInfoList");
      return;
    }
    
    let pathContainer = null;
    let fileIndex = 0;
    let domList = [];
    let getFrameNum=i=>("00000".substr(0, 5 - i.toString().length) + i + ".svg");
    
    let loadFile=fileInfo=>{
      this.initKind = fileInfo[0];
      let totalFrames = fileInfo[1];
      let actionName = fileInfo[2];
      let filePath = fileInfo[3];
      
      let loadFrame = 1;
      let request = new XMLHttpRequest();
      let loadSVG = request.onload = function(e) {
        let target = e.target;
        if(target.readyState != 4) return;
        if(target.status != 200 && target.status != 0) return;
        
        let ret = target.responseText;
        let div = document.createElement("div");
        div.setAttribute("style", "display:none;");
        div.innerHTML = ret;
        let svg = div.firstElementChild;
        document.body.append(div);
        domList[parseInt(ret.match(/id="Frame_(\d+)"/)[1]) - 1] = svg;
        div = svg = null;
        
        delete request;
        if(loadFrame <= totalFrames) {
          if(loadFrame % 10 == 0) PathCtr.loadState("load file : " + loadFrame);
          request = new XMLHttpRequest();
          request.open("GET", filePath + getFrameNum(loadFrame++), true);
          request.onreadystatechange = loadSVG;
          request.send();
          return;
        }
        
        if(!pathContainer) {
          pathContainer = SVGLoader.init(domList[0]);
        }
        
        let action = pathContainer.addAction(actionName, -1, totalFrames);
        
        SVGLoader.addActionFromList(pathContainer, domList, action.id);
        PathCtr.loadState("loading completed");
        PathCtr.loadState(pathContainer);
        
        domList.forEach(dom=>dom.parentNode.remove());
        domList.length = 0;
        
        this.initKind = "";
        
        if(++fileIndex < fileInfoList.length) {
          loadFile(fileInfoList[fileIndex]);
        } else {
          PathCtr.loadComplete(pathContainer);
          if(!!completeFunc) {
            completeFunc();
          }
        }
      };
      request.open("GET", filePath + getFrameNum(loadFrame++), true);
      request.send();
    };
    
    loadFile(fileInfoList[fileIndex]);
  },
  
  /**
   * @param {PathContainer} pathContainer
   * @return {ArrayBuffer}
   */
  toBin: function(pathContainer) {
    if(!pathContainer) {
      console.error("path container is not found");
      return null;
    }
    
    let buffer = new ArrayBuffer(1000000000);
    let dv = new DataView(buffer);
    let sumLength = 0;
    
    // -- prepare setting function --
    let setUint8  =val=>{dv.setUint8(sumLength, val); sumLength += 1};
    let setUint16 =val=>{dv.setUint16(sumLength, val); sumLength += 2};
    let setUint32 =val=>{dv.setUint32(sumLength, val); sumLength += 4};
    let setFloat32=val=>{dv.setFloat32(sumLength, val); sumLength += 4};
    let setPos    =val=>{dv.setInt16(sumLength, val*PathCtr.binDataPosRange); sumLength += 2};
    let setString=str=>{
      setUint8(str.length);
      [].map.call(str, c=>setUint16(c.charCodeAt(0)));
    };
    let setColor=str=>{
      if(str == "transparent") {
        setUint8(0);  // A
      } else {
        let colorArr = str.match(/(\d+), (\d+), (\d+)/);
        setUint8(1);  // A
        setUint8(colorArr[1]);  // R
        setUint8(colorArr[2]);  // G
        setUint8(colorArr[3]);  // B
      }
    };
    let setArray=(arr, setLengFunc, setFunc)=>{
      let num = arr.length;
      setLengFunc(num);
      for(let i = 0; i < num;) {
        let val = arr[i];
        let j = 1;
        if(typeof val === "undefined") {
          setUint16(0);
          for(; j < num; ++j) {
            if(typeof arr[i + j] !== "undefined") break;
          }
          setUint16(j);
          i += j;
          continue;
        }
        for(; j < num; ++j) {
          if(typeof arr[i + j] === "undefined" || JSON.stringify(val) != JSON.stringify(arr[i + j])) break;
        }
        setUint16(j);
        i += j;
        setFunc(val);
      }
    };
    
    let setAction=(ids, func)=>{
      setArray(ids, setUint8, frames=>{
        setArray(frames, setUint16, func);
      });
    };
    
    let setPathData=pathDataList=>{
      setUint16(pathDataList.length);
      pathDataList.forEach(d=>{
        switch(d.type) {
          case "M":
            setUint8(0);
            setPos(d.pos[0]);
            setPos(d.pos[1]);
            break;
          case "L":
            setUint8(1);
            setPos(d.pos[0]);
            setPos(d.pos[1]);
            break;
          case "C":
            setUint8(2);
            for(let i = 0; i < 6; ++i) {
              setPos(d.pos[i]);
            }
            break;
          case "Z":
            setUint8(3);
            break;
          default:
            console.error("unknown type");
            break;
        }
      });
    };
    
    let setPathDiff=pathDiff=>{
      setArray(pathDiff, setUint16, posArray=>{
        setArray(posArray, setUint16, setPos);
      });
    };
    
    let setPath=path=>{
      setUint16(path.maskIdToUse == null? 0 : path.maskIdToUse+1);
      setUint8(path.fillRule == "nonzero" ? 0 : 1);
      
      setPathData(path.defPath.pathDataList);
      
      let hasAction = (path.hasActionList.length > 0);
      if(hasAction) {
        setUint8(1);
        setAction(path.lineWidth, setFloat32);
        setAction(path.fillStyle, setColor);
        setAction(path.strokeStyle, setColor);
        setAction(path.pathDiffList, setPathDiff);
      } else {
        setUint8(0);
        setFloat32(path.lineWidth);
        setColor(path.fillStyle);
        setColor(path.strokeStyle);
        setPathDiff(path.pathDiffList);
      }
    };
    
    let setGroup=group=>{
      setString(group.id);
      setUint16(group.maskIdToUse == null? 0 : group.maskIdToUse+1);
      setArray(group.paths, setUint16, setPath);
      
      let hasAction = (group.hasActionList.length > 0);
      if(hasAction) {
        setUint8(1);
        setAction(group.childGroups, childGroups=>{
          setArray(childGroups, setUint8, setUint16);
        });
      } else {
        setUint8(0);
        setArray(group.childGroups, setUint8, setUint16);
      }
    };
    
    
    // -- storage processing --
    
    setUint16(pathContainer.originalWidth);
    setUint16(pathContainer.originalHeight);
    
    setUint8(Object.keys(pathContainer.actionList).length);
    Object.keys(pathContainer.actionList).forEach(key=>{
      setString(key);
      setUint8(pathContainer.actionList[key].id);
      setUint16(pathContainer.actionList[key].totalFrames);
    });
    
    setArray(pathContainer.rootGroups, setUint8, setUint16);
    
    let groupsNum = pathContainer.groups.length;
    setUint16(groupsNum);
    pathContainer.groups.forEach(group=>{
      PathCtr.loadState("count : " + groupsNum--);
      PathCtr.debugPrint(sumLength);
      setGroup(group);
      PathCtr.debugPrint(group);
    });
    
    delete dv;
    return buffer.slice(0, sumLength);
  },
  
  /**
   * @param {PathContainer} pathContainer
   */
  outputBin: function(pathContainer) {
    if(!pathContainer) return;
    
    let buffer = SVGLoader.toBin(PathCtr.pathContainer);
    
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    console.log(a);
    
    var blob = new Blob([buffer], {type: "octet/stream"}),
    url = window.URL.createObjectURL(blob);
    
    a.href = url;
    a.download = "path_data.bin";
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },
};
