--! @file bn_outputjson.lua

-- **************************************************
-- Provide Moho with the name of this script object
-- **************************************************

ScriptName = "BN_OutputJson"

-- **************************************************
-- General information about this script
-- **************************************************

BN_OutputJson = {}

--! Returns the name of the script.
--! @retval LM_String
function BN_OutputJson:Name()
	return "BUN Output Json"
end

--! Returns the version of the script.
--! @retval LM_String
function BN_OutputJson:Version()
	return "1.0"
end

--! Returns a localized description of the script's functionality.
--! @retval LM_String
function BN_OutputJson:Description()
	return "Output Json"
end

--! Returns name of creator.
--! @retval LM_String
function BN_OutputJson:Creator()
	return "BUN"
end

--! Returns the localized label.
--! @retval LM_String
function BN_OutputJson:UILabel()
	return "Output Json"
end

-- **************************************************
-- Recurring values
-- **************************************************

BN_OutputJson.boneLayerName = "bone"
BN_OutputJson.bonesProp = "bones"
BN_OutputJson.flexiProp = "flexi"
BN_OutputJson.boneNamePrefix = "bone_"

-- **************************************************
-- The guts of this script
-- **************************************************

--! Returns false if the user is in the middle of an action, otherwise returns true.
--! @param ScriptInterface moho
--! @retval bool
function BN_OutputJson:IsEnabled(moho)
	if (moho.layer:LayerType() ~= MOHO.LT_BONE) then
		return false
	end
	if (moho:Skeleton() == nil) then
		return false
	end
	return true
end

--! Setup alert info.
--! @param String text
function BN_OutputJson:SetupAlert(text)
	LM.GUI.Alert(LM.GUI.ALERT_WARNING,
		text,
		nil,
		nil,
		MOHO.Localize("/Scripts/OK=OK"),
		nil,
		nil)
end

--! Runs this script.
--! @param ScriptInterface moho
function BN_OutputJson:Run(moho)
	self.moho = moho
	self.layer = moho.layer
	local layer = self.layer
	
	if (layer:LayerType() ~= MOHO.LT_BONE) then
		self:SetupAlert("ボーンレイヤーを選択してから実行してください")
		return
	end
	
	self.skel = moho:Skeleton()
	if (self.skel == nil) then
		self:SetupAlert("ボーンが見つかりません")
		return
	end
	
	if (LM.GUI.Alert(LM.GUI.ALERT_INFO,
		"JSONの出力を行います",
		nil,
		nil,
		MOHO.Localize("/Scripts/OK=OK"),
		MOHO.Localize("/Scripts/Cancel=Cancel"),
		nil) == 1) then
		return
	end
	
	layer:ActivateAction("")
	moho:SetCurFrame(0)
	
	self.json = {}
	self.json[self.bonesProp] = {}
	for i = 0, self.skel:CountBones()-1 do
		self:SetBoneInfo(i)
	end
	
	self.json[self.flexiProp] = {}
	local boneLayer = moho:LayerAsBone(layer)
	for i = 0, boneLayer:CountLayers()-1 do
		self:setFlexiInfo(i, boneLayer:Layer(i), 0)
	end
	
	path = LM.GUI.SaveFile("ボーン用jsonファイルの保存先を指定してください")
	if (path ~= "") then
		fp = io.open("bones.json","w")
		if (fp == nil) then
			self:SetupAlert("bones.jsonの保存に失敗しました。\nファイルを開いている場合は閉じてから実行してください。")
		else
			fp:write(self:OutputJson(self.json, 0))
			io.close(fp)
			self:SetupAlert("bones.jsonを保存しました")
		end
	end
end

--! Set infomation of flexi-bone.
--! @param Integer
--! @param MohoLayer
--! @param Integer
function BN_OutputJson:setFlexiInfo(index, layer, count)
	local indent = ""
	for k = 0, count do
		indent = indent .. "    "
	end
	
	local data = {}
	local boneIndex = 0
	
	local dataStr = "[\""
	for j = 0, self.skel:CountBones()-1 do
		if (layer:IsIncludedInFlexiBoneSubset(j) or layer:LayerParentBone() == j) then
			if (boneIndex > 0) then
				dataStr = dataStr .. "\", \""
			end
			dataStr = dataStr .. self.boneNamePrefix .. self.skel:Bone(j):Name()
			boneIndex = boneIndex + 1
		end
	end
	dataStr = dataStr .. "\"]"
	if (boneIndex > 0) then
		self.json[self.flexiProp][layer:Name()] = dataStr
	end
	
	if (layer:IsGroupType() and layer:Name() ~= self.boneLayerName) then
		local groupLayer = self.moho:LayerAsGroup(layer)
		for i = 0, groupLayer:CountLayers()-1 do
			self:setFlexiInfo(i, groupLayer:Layer(i), count+1)
		end
	end
end

--! Adjust angle.
--! @param Float angle
--! @retval Float
function BN_OutputJson:AdjustAngle(angle)
	local ret = math.floor(angle / math.pi * 180 + 0.5)
	local addCount = 1
	while (ret < 0) do
		ret = math.floor(angle / math.pi * 180 + addCount * math.pi * 2 + 0.5)
		addCount = addCount + 1
	end
	return ret
end

--! Set bone info at json.
--! @param Integer boneID
function BN_OutputJson:SetBoneInfo(boneID)
	local bone = self.skel:Bone(boneID)
	local boneName = bone:Name()
	
	local data = {}
	local isEnable = false
	
	if (bone.fParent ~= -1) then
		data["parent"] = "\"" .. self.boneNamePrefix .. self.skel:Bone(bone.fParent):Name() .. "\""
		isEnable = true
	end
	
	if (self.layer:HasAction(boneName)) then
		data["smartAction"] = "\"" .. boneName .. "\""
		data["smartBase"] = self:AdjustAngle(bone.fAngle + bone.fMinConstraint)
		data["smartMax"] = self:AdjustAngle(bone.fMaxConstraint - bone.fMinConstraint)
		isEnable = true
	elseif (bone.fConstraints) then
		data["maxAngle"] = self:AdjustAngle(bone.fMinConstraint)
		data["minAngle"] = self:AdjustAngle(bone.fMaxConstraint)
		isEnable = true
	end
	
	local strength = bone.fStrength
	if (strength ~= 0) then
		data["strength"] = strength/10
		isEnable = true
	end
	
	if (bone.fLength == 0) then
		data["isPin"] = "\"true\""
		isEnable = true
	end
	
	if (isEnable) then
		self.json[self.bonesProp][self.boneNamePrefix .. boneName] = data
	end
end


--! Output json
--! @param Table table
--! @param Integer indentCount
--! @retval String
function BN_OutputJson:OutputJson(table, indentCount)
	local indent = ""
	for k = 0, indentCount do
		indent = indent .. "  "
	end
	
	local ret = ""
	if (indentCount == 0) then
		ret = "{\n"
	end
	
	local dataCount = 0
	for key, val in pairs(table) do
		if (dataCount > 0) then
			ret = ret .. ",\n"
		end
		if (type(val) == "table") then
			ret = ret .. indent .. "\"" .. key .. "\" : {\n"
			ret = ret .. self:OutputJson(val, indentCount+1)
			ret = ret .. indent .. "}"
		else
			ret = ret .. indent .. "\"" .. key .. "\" : " .. val
		end
		dataCount = dataCount + 1
	end
	
	ret = ret .. "\n"
	if (indentCount == 0) then
		ret = ret .. "}\n"
	end
	
	return ret
end
