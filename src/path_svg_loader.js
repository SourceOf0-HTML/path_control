/**
 * SVGLoader
 * Singleton
 */
var SVGLoader = {
  FILE_KIND_BASE: "BASE",
  FILE_KIND_BONE: "BONE",
  FILE_KIND_SMRT: "SMRT",
  initKind: "",
  
  width: 0,
  height: 0,
  groupNameToIDList: null,
  masksList: null,
  domList: [],
  
  loadWorker: null,
  
  /**
   * @param {String} maskStr - mask attribute of element
   * @return {GroupObj} - mask group
   */
  getMaskId: function(maskStr) {
    if(!maskStr) return null;
    let maskID = maskStr.replace(/^url\(#/, "").replace(/\)$/, "");
    if(!!this.masksList[maskID]) {
      return this.masksList[maskID];
    }
    console.error("unknown mask name: " + maskStr);
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
    
    let baseX = this.width;
    let baseY = this.height;
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
   * @param {Integer} uid - group id
   * @param {HTMLElement} pathDOM - path element
   * @param {CSSStyleDeclaration} style - window.getComputedStyle(pathDOM)
   */
  makePath: function(uid, pathDOM, style) {
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
    pathDataList.forEach(d=>pathDiffList.push((!d.pos)? undefined : d.pos.concat().fill(0)));
    
    PathMain.postMessage({
      cmd: "new-path",
      uid: uid,
      maskID: this.getMaskId(pathDOM.getAttribute("mask")),
      pathDataList: pathDataList,
      pathDiffList: pathDiffList,
      fillRule: style.fillRule,
      fillStyle: fillStyle,
      lineWidth: lineWidth,
      strokeStyle: strokeStyle,
    });
  },
  
  /**
   * @param {Integer} uid - group id
   * @param {Integer} pathID - path id
   * @param {HTMLElement} pathDOM - path element
   * @param {CSSStyleDeclaration} style - window.getComputedStyle(pathDOM)
   * @param {Integer} frame
   * @param {String} actionName
   */
  addActionPath: function(uid, pathID, pathDOM, style, frame, actionName) {
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
    
    PathMain.postMessage({
      cmd: "add-path-action",
      uid: uid,
      pathID: pathID,
      pathDataList: pathDataList,
      fillStyle: fillStyle,
      lineWidth: lineWidth,
      strokeStyle: strokeStyle,
      frame: frame,
      actionName: actionName,
    });
    
    pathDataList = null;
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
    
    let baseX = this.width;
    let baseY = this.height;
    let base = (baseX > baseY)? baseX : baseY;
    let getX=()=>parseFloat(data.shift())/base;
    let getY=()=>parseFloat(data.shift())/base;
    
    let posData = [];
    while(data.length > 0 && posData.length < 2) {
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
    
    ret.push({type:"M", pos:[posData[0][0], posData[0][1]]});
    ret.push({type:"L", pos:[posData[1][0], posData[1][1]]});
    
    return ret;
  },
  
  /**
   * @param {Integer} uid - group id
   * @param {HTMLElement} pathDOM - path element
   */
  makeBonePath: function(uid, pathDOM) {
    let pathDataList = this.makeBonePathDataList(pathDOM.getAttribute("d"));
    let pathDiffList = [];
    pathDataList.forEach(d=>pathDiffList.push((!d.pos)? undefined : d.pos.slice().fill(0)));
    
    PathMain.postMessage({
      cmd: "new-bone-path",
      uid: uid,
      pathDataList: pathDataList,
      pathDiffList: pathDiffList,
    });
    pathDataList = null;
    pathDiffList = null;
  },
  
  /**
   * @param {Integer} uid - group id
   * @param {Integer} pathID - path id
   * @param {HTMLElement} pathDOM - path element
   * @param {Integer} frame - frame number
   * @param {String} actionName
   */
  addBoneActionPath: function(uid, pathID, pathDOM, frame, actionName) {
    let pathDataList = null;
    if(!!pathDOM) {
      pathDataList = this.makeBonePathDataList(pathDOM.getAttribute("d"));
    }
    
    PathMain.postMessage({
      cmd: "add-bone-path-action",
      uid: uid,
      pathID: pathID,
      pathDataList: pathDataList,
      frame: frame,
      actionName: actionName,
    });
    pathDataList = null;
  },
  
  /**
   * @param {HTMLElement} groupDOM - group element
   * @return {GroupObj}
   */
  makeGroup: function(groupDOM) {
    let name = groupDOM.getAttribute("id");
    let uid = this.groupNameToIDList[name];
    let isBone = name.startsWith(PathMain.defaultBoneName);
    let isPathSkip = (!isBone && this.initKind === this.FILE_KIND_BONE);
    
    if(isBone) {
      PathMain.postMessage({
        cmd: "new-bone",
        uid: uid,
        name: name,
      });
    } else {
      PathMain.postMessage({
        cmd: "new-group",
        uid: uid,
        name: name,
        maskID: this.getMaskId(groupDOM.getAttribute("mask")),
      });
    }
    
    let childGroups = [];
    Array.prototype.slice.call(groupDOM.children).forEach(child=>{
      let tagName = child.tagName;
      //console.log("make group : " + name + " : " + tagName);
      switch(tagName) {
        case "path":
          if(isPathSkip) break;
          if(isBone) {
            this.makeBonePath(uid, child);
          } else {
            this.makePath(uid, child, window.getComputedStyle(child));
          }
          break;
        case "mask":
          Array.prototype.slice.call(child.children).forEach(c=>{
            if(c.tagName != "g") return;
            this.makeGroup(c);
          });
          break;
        case "clipPath":
          // TODO
          break;
        case "g":
          childGroups.push(this.groupNameToIDList[child.getAttribute("id")]);
          this.makeGroup(child);
          break;
        default:
          console.error("unknown element");
          console.log(child);
          break;
      }
    });
    
    if(childGroups.length > 0) {
      PathMain.postMessage({
        cmd: "set-child-group-id",
        uid: uid,
        childGroups: childGroups,
      });
    }
    
    childGroups = null;
    
    return uid;
  },
  
  /**
   * @param {Integer} index
   * @param {HTMLElement} groupDOM - group element
   * @param {String} name - group name
   * @param {Integer} frame
   * @param {String} actionName
   */
  addActionGroup: function(index, groupDOM, name, frame, actionName) {
    if(frame % 10 == 0 && index == 0) console.log("add action DOM: " + actionName + " - " + frame);
    
    let uid = SVGLoader.groupNameToIDList[name];
    let childGroups = [];
    let dataIndex = 0;
    let isBone = name.startsWith(PathMain.defaultBoneName);
    let isPathSkip = (!isBone && SVGLoader.initKind === SVGLoader.FILE_KIND_BONE);
    
    if(!!groupDOM) {
      Array.prototype.slice.call(groupDOM.children).forEach(child=>{
        switch(child.tagName) {
          case "path":
            if(isPathSkip) break;
            if(isBone) {
              SVGLoader.addBoneActionPath(uid, dataIndex++, child, frame, actionName);
            } else {
              SVGLoader.addActionPath(uid, dataIndex++, child, window.getComputedStyle(child), frame, actionName);
            }
            break;
          case "mask":
          case "clipPath":
            break;
          case "g":
            childGroups.push(SVGLoader.groupNameToIDList[child.getAttribute("id")]);
            break;
          default:
            console.error("unknown element");
            console.log(child);
            break;
        }
      });
    } else {
      PathMain.postMessage({
        cmd: "set-unvisible-path-action",
        uid: uid,
        frame: frame,
        actionName: actionName,
      });
    }
    
    PathMain.postMessage({
      cmd: "add-group-action",
      uid: uid,
      childGroups: childGroups,
      frame: frame,
      actionName: actionName,
    });
    
    childGroups = null;
  },
  
  /**
   * @param {String} actionName
   */
  addActionFromList: function(actionName) {
    if(!this.domList) {
      console.error("groups dom list is not found");
      return;
    }
    
    console.log("check id");
    let groupsDOMArr = Array.prototype.slice.call(this.domList);
    let baseDom = groupsDOMArr[0];
    groupsDOMArr.forEach(targetDom=>{
      let targetGroups = targetDom.getElementsByTagName("g");
      let targetIds = [].map.call(targetGroups, group=>group.getAttribute("id"));
      Array.prototype.forEach.call(targetIds, id=>{
        if(this.groupNameToIDList[id] != null) return;
        this.groupNameToIDList[id] = Object.keys(this.groupNameToIDList).length;
        this.makeGroup(targetDom.getElementById(id));
      });
      Array.prototype.slice.call(targetDom.getElementsByTagName("mask")).forEach(mask=>{
        let maskID = mask.getAttribute("id");
        if(this.masksList[maskID]) return;
        let maskChildren = Array.prototype.slice.call(mask.children);
        maskChildren.forEach(child=>{
          if( child.tagName == "use" ) {
            this.masksList[maskID] = this.groupNameToIDList[child.getAttribute("xlink:href").slice(1)];
          } else if( child.tagName == "g" ) {
            this.masksList[maskID] = this.groupNameToIDList[child.getAttribute("id")];
          } else {
            console.error("unknown mask data");
            console.log(child);
          }
        });
        maskChildren = null;
      });
      targetGroups = null;
      targetIds = null;
    });
    
    console.log("check diff");
    let actionGroup = [];
    Object.keys(this.groupNameToIDList).forEach(name=> {
      let base = baseDom.getElementById(name);
      groupsDOMArr.some(targetDom=> {
        if( !targetDom || !base || !base.isEqualNode(targetDom.getElementById(name)) ) {
          actionGroup.push(name);
          return true;
        }
      });
      base = null;
    });
    
    groupsDOMArr.forEach((targetDom, frame)=> {
      if(frame == 0) return;
      if(frame % 10 == 0) console.log("add action : " + actionName + " - " + frame);
      actionGroup.forEach((name, i)=> {
        setTimeout(this.addActionGroup, 0, i, targetDom.getElementById(name), name, frame, actionName);
      });
    });
    setTimeout(this.loadDOMEnd);
    
    groupsDOMArr = null;
    baseDom = null;
    actionGroup = null;
  },
  
  /**
   * @param {HTMLElement} groupDOM - group element
   */
  initPathContainer: function(groupsDOM) {
    if(!groupsDOM) {
      console.error("groups dom is not found");
      return null;
    }
    
    this.width = parseInt(groupsDOM.getAttribute("width").replace("px", ""));
    this.height = parseInt(groupsDOM.getAttribute("height").replace("px", ""));
    
    PathMain.postMessage({
      cmd: "create-path-container",
      name: this.name,
      index: this.index,
      width: this.width,
      height: this.height,
    });
    
    Array.prototype.slice.call(groupsDOM.getElementsByTagName("g")).forEach(group=>{
      let name = group.getAttribute("id");
      if(this.groupNameToIDList[name] != null) {
        console.error("group ID is duplicated : " + name);
        return;
      }
      this.groupNameToIDList[name] = Object.keys(this.groupNameToIDList).length;
    });
    
    Array.prototype.slice.call(groupsDOM.getElementsByTagName("mask")).forEach(mask=>{
      Array.prototype.slice.call(mask.children).forEach(child=>{
        if( child.tagName == "use" ) {
          this.masksList[mask.getAttribute("id")] = this.groupNameToIDList[child.getAttribute("xlink:href").slice(1)];
        } else if( child.tagName == "g" ) {
          this.masksList[mask.getAttribute("id")] = this.groupNameToIDList[child.getAttribute("id")];
        } else {
          console.error("unknown mask data");
          console.log(child);
        }
      });
    });
    
    Array.prototype.slice.call(groupsDOM.children).forEach(child=>{
      if(child.tagName != "g") return;
      PathMain.postMessage({
        cmd: "add-root-group",
        id: this.makeGroup(child),
      });
    });
  },
  
  /**
   * @param {String} kind
   * @param {String} actionName
   * @param {Integer} totalFrames
   * @param {Boolean} isEnd
   */
  loadFromDOM: function(kind, actionName, totalFrames) {
    this.initKind = kind;
    if(kind == this.FILE_KIND_BASE) {
      this.initPathContainer(this.domList[0]);
    }
    
    PathMain.postMessage({
      cmd: "add-action",
      actionName: actionName,
      frame: -1,
      totalFrames: totalFrames,
    });
    
    this.addActionFromList(actionName);
  },
  
  /**
   * @param {String} svg
   */
  addSvgDOM: function(svg) {
    let div = document.createElement("div");
    div.setAttribute("style", "display:none;");
    div.innerHTML = svg;
    let svgDOM = div.firstElementChild;
    document.body.append(div);
    this.domList[parseInt(svg.match(/id="Frame_(\d+)"/)[1]) - 1] = svgDOM;
    div = null;
    svgDOM = null;
  },
  
  loadDOMEnd: function() {
    console.log("DOM END");
    SVGLoader.domList.forEach(dom=>dom.parentNode.remove());
    SVGLoader.domList.length = 0;
    SVGLoader.initKind = "";
    SVGLoader.loadWorker.postMessage({cmd: "load-next"});
  },
  
  loadEnd: function() {
    console.log("LOAD END")
    SVGLoader.groupNameToIDList = null;
    SVGLoader.masksList = null;
    PathMain.postMessage({cmd: "load-complete"});
  },
  
  /**
   * @param {String} name
   * @param {Integer} index - paths layer index
   * @param {Array} fileInfoList - [ [ kind, totalFrames, actionName, filePath ], ... ]
   * @param {String} jsonPath - json file path
   * @param {Function} completeFunc - callback when loading complete
   */
  load: function(name, index, fileInfoList, jsonPath = null, completeFunc = null) {
    if(!fileInfoList || !Array.isArray(fileInfoList) || !Array.isArray(fileInfoList[0])) {
      console.error("fileInfoList format is woring");
      console.log(fileInfoList);
      return;
    }
    if(fileInfoList[0][0] != this.FILE_KIND_BASE) {
      console.error("action kind \"" + this.FILE_KIND_BASE + "\" is missing in fileInfoList");
      return;
    }
    fileInfoList.forEach(info=> {
      info[3] = new URL(info[3], window.location.href).href;
    });
    
    this.name = name;
    this.index = index;
    this.groupNameToIDList = {};
    this.masksList = {};
    
    let blob = new Blob([path_load_svg_worker], {type: "text/javascript"});
    let filePath = window.URL.createObjectURL(blob);
    
    this.loadWorker = new Worker(filePath);
    this.loadWorker.addEventListener("message", function(e) {
      let data = e.data;
      switch(data.cmd) {
        case "load-complete":
          SVGLoader.loadFromDOM(data.kind, data.actionName, data.totalFrames);
          setTimeout(SVGLoader.loadEnd);
          break;
          
        case "load-add":
          SVGLoader.loadFromDOM(data.kind, data.actionName, data.totalFrames);
          break;
          
        case "new-svg":
          if(data.frame % 10 == 0) console.log("load file: " + data.actionName + " - " + data.frame);
          SVGLoader.addSvgDOM(data.svg);
          break;
          
        default:
          console.error("unknown command: " + data.cmd);
          break;
      }
    });
    
    if(jsonPath == null) {
      PathMain.completeLoadFunc = completeFunc;
    } else {
      PathMain.completeLoadFunc =()=> {
        PathMain.loadBone(jsonPath, completeFunc);
      };
    }
    
    this.loadWorker.postMessage({
      cmd: "load",
      fileInfoList: fileInfoList
    });
  },
};
