/* eslint-disable vue/one-component-per-file */

import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App, defineComponent } from 'vue';

const panelDataMap = new WeakMap<any, App>();

module.exports = Editor.Panel.define({
    listeners: {
        show() {
            console.log('Health Check Panel Showed');
        },
        hide() {
            console.log('Health Check Panel Hidden');
        },
    },
    // index.html 只是個空殼子
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
    },
    methods: {
    },
    ready() {
        console.log('[HealthCheck] Panel Ready, initializing Vue...');
        if (this.$.app) {
            try {
                // 明確讀取實際的 UI 模板
                const vueTemplate = readFileSync(join(__dirname, '../../../static/template/vue/health-check.html'), 'utf-8');

                const app = createApp({
                    data() {
                        return {
                            report: {
                                oversizedTextures: [],
                                abnormalScales: [],
                                emptySpriteFrames: [],
                                systemFontLabels: [],
                                drawCallEstimate: 0,
                            },
                            expanded: {
                                oversizedTextures: true,
                                abnormalScales: true,
                                emptySpriteFrames: true,
                                systemFontLabels: true,
                            },
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
                            console.log('[HealthCheck] Starting scan...');
                            this.isScanning = true;
                            try {
                                const result = await Editor.Message.request('scene', 'execute-scene-script', {
                                    name: 'vue3-template-cc',
                                    method: 'scanScene',
                                    args: [],
                                });
                                if (result) {
                                    console.log('[HealthCheck] Scan results received:', result);
                                    this.report = result;
                                }
                            } catch (err) {
                                console.error('[HealthCheck] Failed to scan scene:', err);
                            } finally {
                                this.isScanning = false;
                            }
                        },
                        /**
                         * 在編輯器中選中節點 (單一選取)
                         */
                        async selectNode(uuid: string) {
                            console.log('[HealthCheck] Selecting node exclusively:', uuid);
                            // 先清除目前的節點選取，確保點擊後是單選模式
                            await Editor.Selection.clear('node');
                            await Editor.Selection.select('node', uuid);
                        }
                    },
                    // 將模板內容直接交給 Vue 編譯
                    template: vueTemplate,
                    mounted() {
                        console.log('[HealthCheck] App mounted, triggering initial scan');
                        this.scan();
                    }
                });

                app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
                app.mount(this.$.app);
                
                panelDataMap.set(this, app);
                console.log('[HealthCheck] Vue App mounted successfully.');
            } catch (err) {
                console.error('[HealthCheck] Error during Vue initialization:', err);
            }
        }
    },
    beforeClose() {},
    close() {
        const app = panelDataMap.get(this);
        if (app) {
            app.unmount();
        }
    },
});
