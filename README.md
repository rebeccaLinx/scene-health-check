# Cocos Creator 場景資源健康度檢查工具

本插件為 Cocos Creator 3.8.x 開發，旨在協助美術與開發團隊自動化檢查場景中的隱性資源問題，確保提交前的資源規範。

## 1. 安裝與執行步驟

1. 將本插件目錄放置於 Cocos Creator 專案的 `extensions` 目錄下。
2. 在插件目錄內執行終端機指令：
   ```bash
   npm install
   npm run build
   ```
3. 打開 Cocos Creator 專案，在頂部選單列找到 `Panel -> 場景資源健康度檢查` 並點擊開啟。
4. 開啟後，點擊面板中的「重新掃描 (Rescan)」按鈕即可獲取當前場景的資源檢查報告。
5. 點擊報告清單中的任何節點項目，編輯器將自動在「層級管理器 (Hierarchy)」中選中對應的節點。

## 2. 設計決策

### 為什麼使用 Scene Script 架構？
在 Cocos Creator 3.x 插件系統中，Panel 進程與 Scene 執行進程是隔離的。為了準確獲取場景中節點的運作時狀態（如 `node.scale`、`Label.useSystemFont` 以及已加載貼圖的實際尺寸），最可靠的方式是透過 **Scene Script**。
*   **優點**：可以直接呼叫 `cc` 引擎 API (如 `cc.director.getScene()`)，獲取最精確的數據。
*   **替代方案考慮**：曾考慮直接解析 `.scene` 的 JSON 檔案，但這樣難以獲取如預設值補全後的數值，且無法獲取貼圖資源的實際渲染尺寸，因此最終選擇 Scene Script 方案。

### UI 架構
使用了 **Vue 3** 作為 UI 框架，配合 Cocos Creator 內建的 `ui-button` 等元件，確保外觀風格與編輯器一致。

## 3. 已知限制或不完美之處
*   **Draw Call 估算**：目前的估算邏輯是統計 active 的渲染元件數量。這是一個粗略的上限估計，實際渲染時可能會因為合圖 (Auto-batching) 而大幅降低。
*   **深度掃描**：目前的掃描僅限於節點上的元件屬性，尚未遍歷檢查 Material 內部使用的所有貼圖。
*   **多場景支援**：目前僅支持掃描當前編輯器正在打開的場景。

## 4. 未來改善方向
*   **支援一鍵修復**：例如將所有 Scale 回歸 (1, 1, 1) 或一鍵關閉 Label 的系統字型選型。
*   **資產預覽**：在面板中直接顯示超規格貼圖的縮圖。
*   **報告導出**：將掃描結果導出為 JSON 或 Excel 報表供團隊追蹤。

## 5. AI 使用說明
*   **主導設計**：插件的整體架構（Vue + Scene Script）、掃描邏輯的遍歷規則、以及與編輯器選中機制的整合由本人設計。
*   **AI 協助部分**：
    *   協助產生基礎的 Vue 模板代碼與 CSS 樣式修飾。
    *   提供部分 Cocos Creator 3.x Message API 的參數參考（例如 `Editor.Selection.select`）。
    *   協助編寫腳本中的 Node 路徑遞歸算法。
*   **理解與修改**：本人已逐行閱讀並驗證所有 AI 產生的代碼，並針對 Cocos Creator 3.8 的 API 變更進行了修正（如處理 `Renderable2D` 基類以獲取渲染組件）。
