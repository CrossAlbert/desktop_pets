<script setup lang="ts">
import MaskBox from '@renderer/components/MaskBox.vue';
import { onMounted, onUnmounted, ref } from 'vue';
import { live2dManage } from '../live2d/main';
import { useRoute } from 'vue-router';
import logger from 'electron-log';
const route = useRoute();

const dragFlag = ref(false);
let startX = 0;
let startY = 0;

const mousedownHandle = (e: MouseEvent) => {
    if (e.button !== 2) { return }
    // 右键按下
    dragFlag.value = true;
    startX = e.screenX;
    startY = e.screenY;
}


const mouseupHandle = (e: MouseEvent) => {
    if (e.button !== 2) { return }
    // 右键松开
    dragFlag.value = false;
    startX = 0;
    startY = 0;
}


// 移动窗口
const mousemoveHandle = (e: MouseEvent) => {
    if (dragFlag.value) {
        const deltaX = e.screenX - startX;
        const deltaY = e.screenY - startY;
        window.electron.ipcRenderer.send('move-window', deltaX, deltaY);
        startX = e.screenX;
        startY = e.screenY;
    }
}




let live2dManageInstance: live2dManage | null = null;
// 轮询计时器
let liveTimer: NodeJS.Timeout | null = null;
// 上一次记录的直播时间
let lastLiveTime: string | null = null;


onMounted(async () => {
    try {
        const {
            petFilePath,
            live2dFolder,
            modelJsonName,
            volume,
            roomId,
            roomName
        } = route.params as unknown as PreviewInforIpc;

        // 开启实例
        live2dManageInstance = new live2dManage({ petFilePath, live2dFolder, modelJsonName, containerId: 'canvas_container' });
        await live2dManageInstance.start();
        live2dManageInstance.changeVolume(volume);


        if (roomId && roomName) {
            liveTimer = setInterval(
                async () => {
                    const newLiveTime = await window.electron.ipcRenderer.invoke(
                        'ipc-poll-bilibili-live',
                        roomId, roomName, lastLiveTime
                    );
                    lastLiveTime = newLiveTime;
                }, 120000
            )
        }


        // 添加右键监听 用于拖动窗口
        document.addEventListener('mousedown', mousedownHandle);
        document.addEventListener('mouseup', mouseupHandle);
        document.addEventListener('mousemove', mousemoveHandle);
    } catch (error) {
        logger.error(error);
    }
})




onUnmounted(() => {
    try {
        // 关闭sdk 
        if (live2dManageInstance) {
            live2dManageInstance.stop();
        }

        if ( liveTimer ) {
            clearInterval(liveTimer);
        }
        // 移除监听
        document.removeEventListener('mousedown', mousedownHandle);
        document.removeEventListener('mouseup', mouseupHandle);
        document.removeEventListener('mousemove', mousemoveHandle);
    } catch (error) {
        logger.error(error);
    }
})




// 监听消息 重设音量
window.electron.ipcRenderer.on('send-change-volume',
    (_event, data: number) => {
        if (live2dManageInstance) {
            live2dManageInstance.changeVolume(data);
        }
    }
);

</script>

<template>
    <div class="petHome">
        <MaskBox v-if="dragFlag"></MaskBox>
        <!-- 语音文字框 -->
        <div id="text_container"></div>
        <!-- live2d画布容器 -->
        <div id="canvas_container"></div>
    </div>
</template>

<style scoped>
.petHome {
    width: 100vw;
    height: 100vh;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>


<style>
#canvas_container {
    flex-shrink: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    box-sizing: border-box;
    overflow: hidden;
}


#text_container {
    position: absolute;
    z-index: 1000;
    bottom: 22vh;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: max-content;
    pointer-events: none;
    transition: all .2s;
}


#text_container>span {
    display: block;
    padding: 20px;
    letter-spacing: 2px;
    border-radius: 16px;
    color: #303133;
    background-color: rgba(255, 255, 255, 0.75);
    opacity: 0;
    transform-origin: center bottom;
}


@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(1, 0);
    }

    to {
        opacity: 1;
        transform: scale(1, 1);
    }
}


@keyframes fadeOut {
    from {
        opacity: 1;
        transform: scale(1, 1);
    }

    to {
        opacity: 0;
        transform: scale(1, 0);
    }
}
</style>