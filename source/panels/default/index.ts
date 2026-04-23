/* eslint-disable vue/one-component-per-file */

import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App, defineComponent, h } from 'vue';

const panelDataMap = new WeakMap<any, App>();

// FontAwesome 圖標路徑資料庫
const ICON_PATHS: Record<string, { viewBox: string, d: string }> = {
    'magnifying-glass': { viewBox: '0 0 512 512', d: 'M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z' },
    'chart-line': { viewBox: '0 0 512 512', d: 'M64 64c0-17.7-14.3-32-32-32S0 46.3 0 64V400c0 44.2 35.8 80 80 80H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H80V64zM406.6 228.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-96-96c-12.5-12.5-32.8-12.5-45.3 0L240 154.7l-57.4-57.4c-12.5-12.5-32.8-12.5-45.3 0l-48 48c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 165.3l57.4 57.4c12.5 12.5 32.8 12.5 45.3 0l70.6-70.6 73.4 73.4z' },
    'chevron-down': { viewBox: '0 0 448 512', d: 'M201.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 306.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z' },
    'chevron-right': { viewBox: '0 0 320 512', d: 'M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z' },
    'image': { viewBox: '0 0 512 512', d: 'M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zM323.8 202.5c-4.5-6.6-11.9-10.5-19.8-10.5s-15.4 3.9-19.8 10.5l-87 127.6L170.7 297c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6h336c8.9 0 17.1-4.9 21.2-12.8s3.6-17.4-1.4-24.7l-120-176zM112 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z' },
    'maximize': { viewBox: '0 0 448 512', d: 'M32 32C14.3 32 0 46.3 0 64V176c0 17.7 14.3 32 32 32s32-14.3 32-32V96h80c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM160 448c-17.7 0-32 14.3-32 32s14.3 32 32 32H256 448c17.7 0 32-14.3 32-32V352c0-17.7-14.3-32-32-32s-32 14.3-32 32v80H352c-17.7 0-32 14.3-32 32s14.3 32 32 32H256V448H160zM448 32c17.7 0 32 14.3 32 32V176c0 17.7-14.3 32-32 32s-32-14.3-32-32V96H336c-17.7 0-32-14.3-32-32s14.3-32 32-32H448zM32 480c-17.7 0-32-14.3-32-32V336c0-17.7 14.3-32 32-32s32 14.3 32 32V416h80c17.7 0 32 14.3 32 32s-14.3 32-32 32H32z' },
    'font': { viewBox: '0 0 448 512', d: 'M441 489.4c12.9 5.4 27.7-1.4 31.9-14.9L480 448l32 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-32 0-21.3-64 37.3 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-58.7 0L311.4 32c-4.7-12.1-16.4-20-29.4-20s-24.7 7.9-29.4 20L130.7 256 56 256c-17.7 0-32 14.3-32 32s14.3 32 32 32l53.3 0-21.3 64-32 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l32 0-7.1 22.5c-4.3 13.5 2.5 28.3 15.4 33.7s27.7-2.5 31.9-16l10.2-32.2L400.7 456l10.2 32.2c4.3 13.5 19.1 20.3 31.9 14.9zM200 256L282 45.3 364 256 200 256zm-44.4 128l21.3-64 210.1 0 21.3 64-252.7 0z' },
    'link': { viewBox: '0 0 640 512', d: 'M579.8 267.7c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114L422.3 334.8c-31.5 31.5-82.5 31.5-114 0c-27.9-27.9-31.5-71.8-8.6-103.8l1.1-1.6c10.3-14.4 6.9-34.4-7.4-44.6s-34.4-6.9-44.6 7.4l-1.1 1.6C206.5 251.2 213 330 263 380c56.5 56.5 148 56.5 204.5 0L579.8 267.7zM60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 378.5 74 327.5 105.5 296L217.7 183.8c31.5-31.5 82.5-31.5 114 0c27.9 27.9 31.5 71.8 8.6 103.8l-1.1 1.6c-10.3 14.4-6.9 34.4 7.4 44.6s34.4 6.9 44.6-7.4l1.1-1.6C305.5 260.8 299 182 249 132c-56.5-56.5-148-56.5-204.5 0L60.2 244.3z' },
    'circle-check': { viewBox: '0 0 512 512', d: 'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z' }
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
                            report: { oversizedTextures: [], abnormalScales: [], emptySpriteFrames: [], systemFontLabels: [], drawCallEstimate: 0 },
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
                        }
                    },
                    template: vueTemplate,
                    mounted() {
                        console.log('[HealthCheck] Panel opened, triggering initial scan...');
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
