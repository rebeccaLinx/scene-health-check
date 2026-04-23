# Scene Resource Health Check Tool - AI Developer Guide

此文件旨在幫助 AI 助理快速理解本插件的架構、通訊邏輯與掃描機制，以便進行後續維護或功能擴充。

## 1. 專案架構概覽 (Architecture)

本插件基於 Cocos Creator 3.x 擴展系統與 Vue 3 構建，採用 **Panel-Scene 隔離架構**：
- **Panel Process (UI)**: 負責顯示報告與用戶互動。
- **Scene Process (Logic)**: 透過 `Scene Script` 直接操作引擎 `cc` 命名空間，執行場景遍歷。

## 2. 關鍵檔案說明

- `package.json`: 
    - 註冊插件名稱 (`scene-health-check`)。
    - 註冊場景腳本 (`contributions.scene.script`: `./dist/scene.js`)。
- `source/scene.ts`: 
    - **核心邏輯所在**。直接 `require('cc')`。
    - 實作 `scanScene` 方法，遍歷 `cc.director.getScene()` 下的所有節點。
- `source/panels/default/index.ts`: 
    - **UI 控制中樞**。建立 Vue 3 App。
    - 透過 `Editor.Message.request('scene', 'execute-scene-script', ...)` 與場景腳本通訊。
- `static/template/vue/health-check.html`: Vue 模板，包含摺疊面板邏輯。
- `static/style/default/index.css`: 定義摺疊面板 (`.collapsible`) 與點擊回饋的樣式。

## 3. 掃描機制與方法 (`source/scene.ts`)

`scanScene` 方法採用**全方位遍歷策略**以確保穩定性：
1. **節點獲取**: 優先嘗試 `scene.getComponentsInChildren('cc.Node')`，若失敗則改用手動遞歸 `walk(scene.children)`。
2. **檢查項邏輯**:
    - **Scale**: 檢查 `node.scale`。判定標準為 `Math.abs(val - 1) > 0.0001`。
    - **Texture**: 透過 `sprite.spriteFrame.texture` 獲取尺寸，檢查是否超過 2048。
    - **Empty Sprite**: 檢查 `cc.Sprite` 元件是否存在且其 `spriteFrame` 為 null。
    - **System Font**: 檢查 `cc.Label` 的 `useSystemFont` 屬性。
    - **Draw Call**: 模擬渲染順序（DFS）的合批預估。
        - 追蹤連續節點的 **材質 (Material)** 與 **貼圖 (Texture)** UUID。
        - 若連續 2D 渲染節點具備相同材質與貼圖，則視為同一個 Draw Call。
        - `cc.Label` (系統字體) 與 3D `MeshRenderer` 預設視為打斷合批的獨立渲染。
        - **過濾機制**: 自動跳過 `Editor Scene Foreground` 與 `Editor Scene Background` 下的所有輔助節點。

## 4. 通訊與互動流程

- **觸發掃描**: UI 點擊 -> `Editor.Message.request('scene', 'execute-scene-script', ...)` -> 執行 `scene.ts` 中的 `scanScene` -> 返回 JSON 報告給 Vue。
- **節點跳轉**: UI 點擊項目 -> `Editor.Selection.clear('node')` -> `Editor.Selection.select('node', uuid)`。**注意：必須先 clear 再 select 以確保為單選模式。**

## 5. 開發注意事項 (Tips for AI)

- **編譯指令**: 修改 `source/*.ts` 後必須執行 `npm run build` 以更新 `dist/` 目錄。
- **環境差異**: 
    - 插件環境下 `import { ... } from 'cc'` 可能失效，建議在 `scene.ts` 中始終使用 `const cc = require('cc')`。
    - `getComponent(Sprite)` 有時會失效，建議使用字串形式 `getComponent('cc.Sprite')`。
- **UI 渲染**: 使用 Vue 3 的編譯器模式，將 HTML 模板內容讀入組件的 `template` 屬性，避免編輯器預處理 `{{}}` 標籤導致的渲染錯誤。

## 6. 常見問題 (Troubleshooting)
- **掃描結果為 0**: 通常是 `director.getScene()` 取得的是空場景。本工具已實作手動遞歸與 `cc.find` 作為後備方案。
- **Module Not Found (scene.js)**: 檢查 `package.json` 中的路徑是否正確指向 `dist/scene.js`，且 `tsconfig.json` 是否包含 `source/**/*`。
