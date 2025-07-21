<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { throttle } from 'lodash';

const emit = defineEmits(['refreshList'])

// 设置页是否显示
const describeBoxShow = ref(false)
// 是否开机自启
const systemSelfStart = ref(true)


onMounted(async () => {
    // 获取当前是否开机自启 设置按钮状态
    const flag = await window.electron.ipcRenderer.invoke('get-auto-launch')
    systemSelfStart.value = flag
})


// 设置开机自启
const setAutoLaunchLocal = ref(false)
const setAutoLaunch = async (enable: boolean) => {
    setAutoLaunchLocal.value = true
    await window.electron.ipcRenderer.invoke('set-auto-launch', enable)
    setAutoLaunchLocal.value = false
}


// 刷新列表
const refreshList = throttle(() => {
    emit('refreshList')
}, 500)



// 从文件管理器打开桌宠文件目录
const openPetPath = async () => {
    await window.electron.ipcRenderer.invoke('open-pet-path')
}
</script>

<template>
    <div class="buttonOpenBox" @click="describeBoxShow = true">
        <el-icon size="22" color="#ffffff">
            <ArrowLeft />
        </el-icon>
    </div>


    <div class="describeBoxShell">
        <Transition name="fade">
            <div class="backgroundBox" v-show="describeBoxShow"></div>
        </Transition>

        <Transition name="slide-right">
            <div class="contentBox" v-show="describeBoxShow">
                <div class="buttonClossBox" @click="describeBoxShow = false">
                    <el-icon size="22">
                        <ArrowRight />
                    </el-icon>
                </div>

                <div class="descriptionAndSettingsBox">

                    <div class="descriptionBox">
                        <div>
                            <span style="width: 100%; text-align: center;">控件说明</span>
                        </div>
                        <div>
                            <el-button type="primary">设置位置</el-button>
                            <span>记录当前桌宠在屏幕上的位置，用于下次启动时恢复显示在相同位置</span>
                        </div>
                        <div>
                            <el-button type="warning">重置位置</el-button>
                            <span>如果桌宠已启动但未在桌面上显示，点击此按钮可重置到桌面中心位置。 若显示器的虚拟坐标宽高超过 -100000，请手动编辑 preview_pet.json 文件中的 x 和
                                y
                                值以调整初始位置。</span>
                        </div>
                        <div>
                            <el-button type="info">设为自启</el-button>
                            <span>此处的“设为自启”表示在用户手动运行程序后，自动启动所设置的桌宠。如果没有桌宠被设为自启，则双击运行程序后将默认打开管理页面。</span>
                        </div>
                        <div>
                            <div style="width: 87px; flex-shrink: 0;">
                                <el-slider vertical height="80px" disabled />
                            </div>
                            <span>通过此音量调节器设置的音量值会在程序关闭后保留，并在下次启动时生效。每个桌宠的音量设置是独立的，互不影响。</span>
                        </div>
                    </div>


                    <div class="settingsBox">
                        <div>
                            <span style="width: 100%; text-align: center;">设置与操作</span>
                        </div>
                        <div>
                            <el-checkbox v-model="systemSelfStart" :disabled="setAutoLaunchLocal"
                                @change="setAutoLaunch" label="设置软件为系统开机自启" />
                        </div>
                        <div>
                            <el-button @click="openPetPath">打开桌宠文件夹</el-button>
                            <el-button @click="refreshList" type="danger">刷新桌宠列表</el-button>
                        </div>
                    </div>

                </div>

                <div class="structureDescriptionBox"></div>
            </div>
        </Transition>

    </div>
</template>

<style lang="css" scoped>
.describeBoxShell {
    z-index: 500;
    position: absolute;
    top: 0%;
    left: 0%;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    pointer-events: none;
    overflow: hidden;
}

.buttonOpenBox {
    position: absolute;
    right: 0%;
    top: 50%;
    transform: translateY(-50%);
    height: 85px;
    width: 30px;
    border-radius: 8px 0px 0px 8px;
    background-color: rgb(235, 115, 23);
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    pointer-events: auto;
    cursor: pointer;
}

.backgroundBox {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0%;
    left: 0%;
    background-color: rgba(0, 0, 0, 0.6);
}

.contentBox {
    position: absolute;
    top: 0%;
    left: 0%;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    pointer-events: auto;
    display: flex;
    justify-content: flex-end;
    align-items: center;
}

.contentBox>div {
    box-sizing: border-box;
}

.buttonClossBox {
    height: 85px;
    width: 30px;
    border-radius: 8px 0px 0px 8px;
    background-color: white;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    cursor: pointer;
}

.descriptionAndSettingsBox {
    border-right: 1px solid #dcdfe6;
    height: 100%;
    width: 40%;
    background-color: white;
}

.descriptionBox {
    box-sizing: border-box;
    height: max-content;
    width: 100%;
    padding: 14px 16px;
    border-bottom: 2px solid #dcdfe6;
    pointer-events: none;
}

.settingsBox>div,
.descriptionBox>div {
    display: flex;
    gap: 12px;
    font-size: 15px;
    margin-bottom: 14px;
}

.settingsBox>div {
    margin-bottom: 10px;
    justify-content: center;
}

.settingsBox {
    box-sizing: border-box;
    height: max-content;
    width: 100%;
    padding: 12px 16px;
}

.structureDescriptionBox {
    border-left: 1px solid #dcdfe6;
    height: 100%;
    width: 40%;
    background-color: white;
}

/* ---------------------------------------- */

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}


.slide-right-enter-active,
.slide-right-leave-active {
    transition: transform 0.2s;
    transform-origin: right;
}

.slide-right-enter-from {
    transform: translateX(100%);
}

.slide-right-leave-to {
    transform: translateX(100%);
}
</style>