--! @file bn_addboneshape.lua

-- **************************************************
-- Provide Moho with the name of this script object
-- **************************************************

ScriptName = "BN_AddBoneShape"

-- **************************************************
-- General information about this script
-- **************************************************

BN_AddBoneShape = {}

--! Returns the name of the script.
--! @retval LM_String
function BN_AddBoneShape:Name()
	return "BUN Add Bone Shape"
end

--! Returns the version of the script.
--! @retval LM_String
function BN_AddBoneShape:Version()
	return "1.0"
end

--! Returns a localized description of the script's functionality.
--! @retval LM_String
function BN_AddBoneShape:Description()
	return "Add Bone Shape"
end

--! Returns name of creator.
--! @retval LM_String
function BN_AddBoneShape:Creator()
	return "BUN"
end

--! Returns the localized label.
--! @retval LM_String
function BN_AddBoneShape:UILabel()
	return "Add Bone Shape"
end

-- **************************************************
-- Recurring values
-- **************************************************

BN_AddBoneShape.boneNamePrefix = "bone_"
BN_AddBoneShape.boneLayerName = "bone"

-- **************************************************
-- The guts of this script
-- **************************************************

--! Returns false if the user is in the middle of an action, otherwise returns true.
--! @param ScriptInterface moho
--! @retval bool
function BN_AddBoneShape:IsEnabled(moho)
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
function BN_AddBoneShape:SetupAlert(text)
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
function BN_AddBoneShape:Run(moho)
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
		"ボーンのシェイプ出力を行います",
		"対象レイヤー：" .. layer:Name() .. "\n\n",
		"対象ボーン数：" .. self.skel:CountBones(),
		MOHO.Localize("/Scripts/OK=OK"),
		MOHO.Localize("/Scripts/Cancel=Cancel"),
		nil) == 1) then
		return
	end
	
	moho.document:SetDirty()
	moho.document:PrepUndo(NULL)
	
	layer:ActivateAction("")
	moho:SetCurFrame(0)
	
	local parent = moho:CreateNewLayer(MOHO.LT_GROUP)
	moho:PlaceLayerInGroup(parent, layer, true)
	parent:SetName(self.boneLayerName)
	
	moho:SetSelLayer(layer)
	
	for i = 0, self.skel:CountBones()-1 do
		self:CreateShapeLayer(parent, i)
	end
end

--! Creates a polygon graphic with the current bone.
--! @param GroupLayer parent
--! @param Integer boneID
function BN_AddBoneShape:CreateShapeLayer(parent, boneID)
	local bone = self.skel:Bone(boneID)
	
	local layer = self.moho:CreateNewLayer(MOHO.LT_VECTOR)
	layer:SetName(self.boneNamePrefix .. bone:Name())
	
	local mesh = self.moho:Mesh()
	mesh:SelectNone()
	
	
	local boneList = {}
	local numBone = 0
	local parentBoneID = bone.fParent
	while (parentBoneID ~= -1) do
		boneList[numBone] = parentBoneID
		parentBoneID = self.skel:Bone(parentBoneID).fParent
		numBone = numBone + 1
	end
	
	local v = LM.Vector2:new_local()
	local angle = 0
	for i = 1, numBone do
		local parentBone = self.skel:Bone(boneList[numBone - i])
		local p = parentBone.fPos
		local parentAngle = parentBone.fAngle
		v.x = v.x + p.x * math.cos(angle) - p.y * math.sin(angle) 
		v.y = v.y + p.x * math.sin(angle) + p.y * math.cos(angle)
		angle = angle + parentAngle
	end
	
	local p = bone.fPos
	v.x = v.x + p.x * math.cos(angle) - p.y * math.sin(angle) 
	v.y = v.y + p.x * math.sin(angle) + p.y * math.cos(angle)
	mesh:AddLonePoint(v, 0)
	
	local radius = bone.fLength
	if (radius == 0) then
		radius = 0.05
	end
	angle = angle + bone.fAngle
	v.x = v.x + radius * math.cos(angle)
	v.y = v.y + radius * math.sin(angle)
	mesh:AppendPoint(v, 0)
	
	mesh:WeldPoints(0, 1, 0)
	mesh:Point(0):SetCurvature(MOHO.PEAKED, 0)
	mesh:Point(1):SetCurvature(MOHO.PEAKED, 0)
	
	mesh:SelectConnected()
	self.moho:CreateShape(false)
	mesh:AddGroup("Bone")
	
	local shape = mesh:Shape(0)
	local color = LM.ColorVector:new_local()
	color:Set(0, 1, 0)
	shape.fMyStyle.fLineCol:SetValue(0, color)
	
	layer:AddToFlexiBoneSubset(boneID)
	
	self.moho:PlaceLayerInGroup(layer, parent, false)
end
