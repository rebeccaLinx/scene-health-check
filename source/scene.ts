// @ts-ignore
const cc = require('cc');

export function load() {}
export function unload() {}

export const methods = {
    /**
     * 掃描當前場景並返回資源健康度報告
     */
    async scanScene() {
        const director = cc.director;
        const scene = director.getScene();

        if (!scene) {
            return null;
        }

        const report = {
            oversizedTextures: [] as any[],
            abnormalScales: [] as any[],
            emptySpriteFrames: [] as any[],
            systemFontLabels: [] as any[],
            drawCallEstimate: 0,
        };

        // 獲取所有節點
        let allNodes: any[] = [];
        try {
            // 優先使用引擎內建方法獲取所有節點
            allNodes = scene.getComponentsInChildren('cc.Node');
            
            // 如果數量為 0，嘗試手動遍歷 (應對某些編輯器環境)
            if (allNodes.length === 0 && scene.children) {
                const walk = (node: any) => {
                    allNodes.push(node);
                    if (node.children) {
                        node.children.forEach((c: any) => walk(c));
                    }
                };
                scene.children.forEach((c: any) => walk(c));
            }
        } catch (e) {
            console.error('[HealthCheck] Error during node traversal:', e);
        }

        if (allNodes.length === 0) {
            return report;
        }

        let activeRenderables = 0;

        for (const node of allNodes) {
            const path = this.getNodePath(node);
            const uuid = node.uuid;

            // 跳過編輯器系統節點 (例如 Editor Scene Foreground / Background)
            if (path.includes('Editor Scene Foreground') || path.includes('Editor Scene Background')) {
                continue;
            }

            // 1. 檢查異常 Scale (精度提升)
            const scale = node.scale;
            if (Math.abs(scale.x - 1) > 0.0001 || Math.abs(scale.y - 1) > 0.0001 || Math.abs(scale.z - 1) > 0.0001) {
                report.abnormalScales.push({
                    uuid,
                    name: node.name,
                    path,
                    value: `(${scale.x.toFixed(3)}, ${scale.y.toFixed(3)}, ${scale.z.toFixed(3)})`
                });
            }

            // 2 & 3. 檢查 Sprite 組件
            const sprite = node.getComponent('cc.Sprite');
            if (sprite) {
                if (sprite.spriteFrame) {
                    const tex = sprite.spriteFrame.texture;
                    if (tex && (tex.width > 2048 || tex.height > 2048)) {
                        report.oversizedTextures.push({
                            uuid,
                            name: node.name,
                            path,
                            value: `${tex.width}x${tex.height}`
                        });
                    }
                } else {
                    report.emptySpriteFrames.push({
                        uuid,
                        name: node.name,
                        path
                    });
                }
            }

            // 4. 檢查 Label 組件 (系統字型)
            const label = node.getComponent('cc.Label');
            if (label) {
                if (label.useSystemFont) {
                    report.systemFontLabels.push({
                        uuid,
                        name: node.name,
                        path
                    });
                }
            }

            // 5. Draw Call 預估 (統計 Active 且帶有渲染組件的節點)
            if (node.activeInHierarchy) {
                const renderable = node.getComponent('cc.Renderable2D') || node.getComponent('cc.MeshRenderer');
                if (renderable) {
                    activeRenderables++;
                }
            }
        }

        report.drawCallEstimate = activeRenderables;
        console.log(`[HealthCheck] Scan completed: ${allNodes.length} nodes checked.`);
        return report;
    },

    /**
     * 獲取節點在場景中的完整路徑
     */
    getNodePath(node: any): string {
        let path = node.name;
        let parent = node.parent;
        // 遍歷直到根節點 (Scene 的 parent 通常是 null)
        while (parent && parent.parent) {
            path = parent.name + '/' + path;
            parent = parent.parent;
        }
        return path;
    }
};
