--! @file bn_bn_saveaction.lua

-- **************************************************
-- Provide Moho with the name of this script object
-- **************************************************

ScriptName = "BN_SaveAction"

-- **************************************************
-- General information about this script
-- **************************************************

BN_SaveAction = {}

--! Returns the name of the script.
--! @retval LM_String
function BN_SaveAction:Name()
	return "Save Action"
end

--! Returns the version of the script.
--! @retval LM_String
function BN_SaveAction:Version()
	return "1.0"
end

--! Returns a localized description of the script's functionality.
--! @retval LM_String
function BN_SaveAction:Description()
	return "Save Action"
end

--! Always returns "Smith Micro Software, Inc."
--! @retval LM_String
function BN_SaveAction:Creator()
	return "BUN"
end

--! Returns the localized label for the number sequence function.
--! @retval LM_String
function BN_SaveAction:UILabel()
	return "Save Action"
end

-- **************************************************
-- Recurring values
-- **************************************************

BN_SaveAction.targetAction = ""

-- **************************************************
-- Credits dialog
-- **************************************************

local BN_SaveActionDialog = {}

BN_SaveActionDialog.UPDATE = MOHO.MSG_BASE

function BN_SaveActionDialog:new(moho)
	local d = LM.GUI.SimpleDialog("Save Smart Action", BN_SaveActionDialog)
	local l = d:GetLayout()

	d.moho = moho

	l:AddChild(LM.GUI.StaticText("以下のアクション別にmohoを保存します"), LM.GUI.ALIGN_LEFT)
	
	d.actionList = LM.GUI.TextList(200, 128, self.UPDATE)
	l:AddChild(d.actionList, LM.GUI.ALIGN_FILL)
	
	return d
end

function BN_SaveActionDialog:UpdateWidgets()
	local layer = self.moho.layer
	for i = 0, layer:CountActions()-1 do
		self.actionList:AddItem(layer:ActionName(i))
	end
	
	self.actionList:SetSelItem(0)
end

function BN_SaveActionDialog:OnOK()
	BN_SaveAction.targetAction = self.actionList:SelItemLabel()
end

--! Setup alert info.
--! @param String text
function BN_SaveAction:SetupAlert(text)
	LM.GUI.Alert(LM.GUI.ALERT_WARNING,
		text,
		nil,
		nil,
		MOHO.Localize("/Scripts/OK=OK"),
		nil,
		nil)
end

-- **************************************************
-- The guts of this script
-- **************************************************

--! Returns false if the user is in the middle of an action, otherwise returns true.
--! @param ScriptInterface moho
--! @retval bool
function BN_SaveAction:IsEnabled(moho)
	if (moho.layer:LayerType() ~= MOHO.LT_BONE) then
		return false
	end
	if (moho:Skeleton() == nil) then
		return false
	end
	return true
end

function BN_SaveAction:Run(moho)
	local layer = moho.layer
	if (layer:LayerType() ~= MOHO.LT_BONE) then
		self:SetupAlert("ボーンレイヤーを選択してから実行してください")
		return
	end
	local skel = moho:Skeleton()
	if (skel == nil) then
		self:SetupAlert("ボーンが見つかりません")
		return
	end
	if (layer:CountActions() == 0) then
		self:SetupAlert("選択されたレイヤーのアクションが見つかりません")
		return
	end
	
	local dlog = BN_SaveActionDialog:new(moho)
	if (dlog:DoModal() == LM.GUI.MSG_CANCEL) then
		return
	end
	
	moho.document:SetDirty()
	moho.document:PrepUndo(NULL)
	
	local orgPath = moho.document:Path()
	local path = string.sub(orgPath, 0, string.len(orgPath)-5)
	
	layer:ActivateAction(NULL)
	moho.document:ClearAnimation(0, false)
	moho.document:SetEndFrame(1)
	moho:FileSaveAs(path .. "_base.moho")
	
	for i = 0, layer:CountActions()-1 do
		local actionName = layer:ActionName(i)
		if (layer:IsSmartBoneAction(actionName)) then
			layer:ActivateAction(actionName)
			local bone = skel:BoneByName(actionName)
			if (bone == nil) then
				bone = skel:BoneByName(string.sub(actionName, 0, string.len(actionName)-2))
			end
			
			local animAngle = bone.fAnimAngle
			local keyInfo = {}
			local whenEndKey = 0
			for i = 0, animAngle:CountKeys()-1 do
				local when = animAngle:GetKeyWhen(i)
				keyInfo[when] = animAngle:GetValue(when)
				whenEndKey = math.max(whenEndKey, when)
			end
			
			layer:ActivateAction(NULL)
			moho.document:ClearAnimation(0, false)
			
			for when, val in pairs(keyInfo) do
				animAngle:SetValue(when, val)
				animAngle:SetKeyInterp(when, MOHO.INTERP_LINEAR, -1, -1)
			end
			
			moho.document:SetEndFrame(whenEndKey)
		else
			layer:ActivateAction(NULL)
			moho.document:ClearAnimation(0, false)
			layer:InsertAction(actionName, 1, true)
			moho.document:SetEndFrame(layer:AnimDuration())
		end
		moho:FileSaveAs(path .. "_" .. actionName .. ".moho")
	end
end
