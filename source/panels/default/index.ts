/* eslint-disable vue/one-component-per-file */

import { readFileSync, writeJsonSync, ensureDirSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App, defineComponent, h } from 'vue';

const panelDataMap = new WeakMap<any, App>();

// FontAwesome 圖標路徑資料庫
const ICON_PATHS: Record<string, { viewBox: string, d: string }> = {
    'magnifying-glass': { viewBox: '0 0 512 512', d: 'M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z' },
    'chart-line': { viewBox: '0 0 512 512', d: 'M64 64c0-17.7-14.3-32-32-32S0 46.3 0 64V400c0 44.2 35.8 80 80 80H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H80V64zM406.6 228.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-96-96c-12.5-12.5-32.8-12.5-45.3 0L240 154.7l-57.4-57.4c-12.5-12.5-32.8-12.5-45.3 0l-48 48c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 165.3l57.4 57.4c12.5 12.5 32.8 12.5 45.3 0l70.6-70.6 73.4 73.4z' },
    'chevron-down': { viewBox: '0 0 448 512', d: 'M201.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 306.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z' },
    'chevron-right': { viewBox: '0 0 320 512', d: 'M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z' }
};

const FaIcon = defineComponent({
    props: {
        name: { type: String, required: true },
        size: { type: [String, Number], default: 14 }
    },
    setup(props) {
        return () => {
            const icon = ICON_PATHS[props.name];
            if (!icon) return h('span', '?');
            return h('svg', {
                viewBox: icon.viewBox,
                width: props.size,
                height: props.size,
                style: { fill: 'currentColor', display: 'inline-block', verticalAlign: 'middle' }
            }, [
                h('path', { d: icon.d })
            ]);
        };
    }
});

module.exports = Editor.Panel.define({
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: { app: '#app' },
    ready() {
        if (this.$.app) {
            try {
                const extensionPath = join(__dirname, '../../../');
                const vueTemplate = readFileSync(join(extensionPath, 'static/template/vue/health-check.html'), 'utf-8');

                const app = createApp({
                    data() {
                        return {
                            report: null as any,
                            lastExportPath: '',
                            expanded: { oversizedTextures: true, abnormalScales: true, emptySpriteFrames: true, systemFontLabels: true },
                            isScanning: false,
                        };
                    },
                    computed: {
                        isClean() {
                            if (!this.report) return true;
                            return (this.report.oversizedTextures || []).length === 0 &&
                                   (this.report.abnormalScales || []).length === 0 &&
                                   (this.report.emptySpriteFrames || []).length === 0 &&
                                   (this.report.systemFontLabels || []).length === 0 &&
                                   !this.isScanning;
                        }
                    },
                    methods: {
                        async scan() {
                            this.isScanning = true;
                            this.lastExportPath = ''; // 重置導出路徑，隱藏相關 UI
                            try {
                                const result = await Editor.Message.request('scene', 'execute-scene-script', {
                                    name: 'scene-health-check',
                                    method: 'scanScene',
                                    args: [],
                                });
                                if (result) this.report = result;
                            } finally {
                                this.isScanning = false;
                            }
                        },
                        async selectNode(uuid: string) {
                            await Editor.Selection.clear('node');
                            await Editor.Selection.select('node', uuid);
                        },
                        /**
                         * 開啟導出目錄
                         */
                        openExportDir() {
                            if (!this.lastExportPath) return;
                            // 使用 Editor 內建的 Explorer 工具，通常比原生 shell 更容易獲得聚焦
                            const utils = Editor.Utils as any;
                            if (utils.Explorer && utils.Explorer.select) {
                                utils.Explorer.select(this.lastExportPath);
                            } else {
                                const { shell } = require('electron');
                                shell.showItemInFolder(this.lastExportPath);
                            }
                        },
                        /**
                         * 導出報告至檔案
                         */
                        exportReport() {
                            if (!this.report) return;

                            const now = new Date();
                            const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
                            const fileName = `SceneHealthReport_${this.report.sceneName}_${timestamp}.json`;
                            
                            // 儲存至專案根目錄的 temp 目錄
                            const projectPath = Editor.Project.path;
                            const exportDir = join(projectPath, 'temp/scene-health-check');
                            const fullPath = join(exportDir, fileName);

                            try {
                                ensureDirSync(exportDir);
                                writeJsonSync(fullPath, this.report, { spaces: 4 });
                                this.lastExportPath = fullPath;
                                console.log(`[HealthCheck] Report exported to: ${fullPath}`);
                                
                                // 在系統資源管理器中顯示該檔案
                                const { shell } = require('electron');
                                shell.showItemInFolder(fullPath);
                            } catch (err) {
                                console.error('[HealthCheck] Failed to export report:', err);
                            }
                        }
                    },
                    template: vueTemplate,
                    mounted() {
                        this.scan();
                    }
                });

                app.component('fa-icon', FaIcon);
                app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
                app.mount(this.$.app);
                panelDataMap.set(this, app);
            } catch (err) {
                console.error('[HealthCheck] Error during Vue initialization:', err);
            }
        }
    },
    close() {
        const app = panelDataMap.get(this);
        if (app) app.unmount();
    },
});
