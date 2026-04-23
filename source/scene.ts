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
            sceneName: scene.name || 'Untitled',
            oversizedTextures: [] as any[],
            abnormalScales: [] as any[],
            emptySpriteFrames: [] as any[],
            systemFontLabels: [] as any[],
            drawCallEstimate: 0,
        };

        // 獲取所有節點 (遵循渲染順序：深度優先遍歷)
        let allNodes: any[] = [];
        try {
            allNodes = scene.getComponentsInChildren('cc.Node');
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

        let drawCallCount = 0;
        let lastBatchState = {
            textureUuid: '',
            materialUuid: '',
            type: '' // '2d' or '3d'
        };

        for (const node of allNodes) {
            const path = this.getNodePath(node);
            const uuid = node.uuid;

            // 跳過編輯器系統節點
            if (path.includes('Editor Scene Foreground') || path.includes('Editor Scene Background')) {
                continue;
            }

            // --- 資源檢查邏輯 ---

            // 1. 檢查異常 Scale
            const scale = node.scale;
            if (Math.abs(scale.x - 1) > 0.0001 || Math.abs(scale.y - 1) > 0.0001 || Math.abs(scale.z - 1) > 0.0001) {
                report.abnormalScales.push({
                    uuid,
                    name: node.name,
                    path,
                    value: `(${scale.x.toFixed(3)}, ${scale.y.toFixed(3)}, ${scale.z.toFixed(3)})`
                });
            }

            const sprite = node.getComponent('cc.Sprite');
            const label = node.getComponent('cc.Label');
            const meshRenderer = node.getComponent('cc.MeshRenderer');
            const renderable2D = node.getComponent('cc.Renderable2D');

            // 2 & 3. 檢查 Sprite
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

            // 4. 檢查 Label
            if (label && label.useSystemFont) {
                report.systemFontLabels.push({
                    uuid,
                    name: node.name,
                    path
                });
            }

            // --- Draw Call 預估邏輯 (模擬合批) ---
            
            if (node.activeInHierarchy) {
                let currentTextureUuid = '';
                let currentMaterialUuid = '';
                let currentType = '';

                if (renderable2D) {
                    currentType = '2d';
                    const mat = renderable2D.getMaterial(0);
                    currentMaterialUuid = mat ? mat.uuid : 'default-2d-mat';
                    
                    if (sprite && sprite.spriteFrame && sprite.spriteFrame.texture) {
                        currentTextureUuid = sprite.spriteFrame.texture.uuid;
                    } else if (label) {
                        // Label 通常會打斷合批，除非是 BMFont 且在同一圖集
                        // 這裡簡化處理：每個使用系統字體或不同字體的 Label 視為獨立貼圖
                        currentTextureUuid = `label-${uuid}`; 
                    }
                } else if (meshRenderer) {
                    currentType = '3d';
                    const mat = meshRenderer.getMaterial(0);
                    currentMaterialUuid = mat ? mat.uuid : 'default-3d-mat';
                    // 3D 節點除非開啟 GPU Instancing，否則通常每個都是獨立 Draw Call
                    currentTextureUuid = `mesh-${uuid}`;
                }

                if (currentType) {
                    // 判斷是否可以與上一個節點合批
                    const canBatch = (
                        currentType === '2d' && 
                        lastBatchState.type === '2d' &&
                        currentMaterialUuid === lastBatchState.materialUuid &&
                        currentTextureUuid === lastBatchState.textureUuid &&
                        currentTextureUuid !== '' &&
                        !currentTextureUuid.startsWith('label-') // 簡單化：Label 不合批
                    );

                    if (!canBatch) {
                        drawCallCount++;
                        lastBatchState = {
                            textureUuid: currentTextureUuid,
                            materialUuid: currentMaterialUuid,
                            type: currentType
                        };
                    }
                }
            }
        }

        report.drawCallEstimate = drawCallCount;
        console.log(`[HealthCheck] Scan completed: ${allNodes.length} nodes, Estimated DrawCalls: ${drawCallCount}`);
        return report;
    },

    /**
     * 獲取節點在場景中的完整路徑
     */
    getNodePath(node: any): string {
        let path = node.name;
        let parent = node.parent;
        while (parent && parent.parent) {
            path = parent.name + '/' + path;
            parent = parent.parent;
        }
        return path;
    }
};
