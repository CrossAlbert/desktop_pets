<script setup lang="ts">
import { Ref, ref } from 'vue'


// 渲染线程解析后 生成的在视图层的预览列表元素
type PreviewItemRenderer = {
  // 预览信息
  previewInfor: PreviewInfor
  // 预览图编码
  previewJpgBase64: string
  // 桌宠（live2d文件、音频文件、触摸预设文件）文件夹路径
  petFilePath: string
  // 桌宠窗口id null代表未启动
  windowId: null | number
}


const previewList: Ref<PreviewItemRenderer[]> = ref([])


// 获取桌宠预览列表
const getPreviewList = async () => {
  // 从主线程获取预览列表
  const response = await window.electron.ipcRenderer.invoke('get-preview-list') as PreviewItemIpc[];

  // 遍历列表 获取预览图base64编码、桌宠基础信息
  response.forEach(async (el) => {
    const [
      imageBase64,
      previewInfor
    ] = await Promise.all([
      window.electron.ipcRenderer.invoke('get-image-base64', el.previewJpgPath),
      window.electron.ipcRenderer.invoke('get-json', el.previewJsonPath)
    ])

    // 添加到视图层列表
    previewList.value.push({
      previewInfor: previewInfor,
      previewJpgBase64: imageBase64,
      petFilePath: el.petFilePath,
      windowId: null
    })

  });

}


getPreviewList()


// 修改位置信息显示格式
const getPosition = (i: 'random' | { x: number, y: number }): string => {
  if (
    typeof i === 'object' &&
    Object.prototype.hasOwnProperty.call(i, 'x') &&
    Object.prototype.hasOwnProperty.call(i, 'y')
  ) {
    return `${i.x},${i.y}`
  } else {
    return '随机移动'
  }
}


// 开启桌宠窗口
const startPet = async (petFilePath: string, previewInfor: PreviewInfor, index: number) => {
  // 一个配置文件只能开启一个窗口
  if (previewList.value[index].windowId === null) {
    // 准备桌宠必要配置信息
    const infor: PreviewInforIpc = {
      petFilePath,
      // 解决vue深层代理导致的数据无法序列化给ipc
      ...JSON.parse(JSON.stringify(previewInfor))
    }
    // 开启桌宠窗口 并获取窗口id
    const windowId = await window.electron.ipcRenderer.invoke('start-pet', infor) as number;
    // 设置窗口id
    previewList.value[index].windowId = windowId
  }
}


// 关闭桌宠窗口
const stopPet = async (windowId: number, index: number) => {
  await window.electron.ipcRenderer.invoke('stop-pet', windowId);
  previewList.value[index].windowId = null
}


</script>

<template>
  <div class="manageBox">

    <div class="manageItem" v-for="(item, index) in previewList">

      <img :src="item.previewJpgBase64">
      <span>{{ item.previewInfor.name }}</span>
      <span>{{ item.previewInfor.infor }}</span>
      <span>位置：{{ getPosition(item.previewInfor.position) }}</span>

      <div class="statusPrompt">
        <span v-if="item.windowId" class="start">&#9679;启动中</span>
        <span v-else class="stop">&#9679;未启动</span>
      </div>

      <div class="operateBox">
        <el-button type="danger" v-if="item.windowId" @click="stopPet(item.windowId, index)">关闭</el-button>
        <el-button type="success" v-else @click="startPet(item.petFilePath, item.previewInfor, index)">启动</el-button>
      </div>


    </div>

  </div>
</template>

<style lang="css" scoped>
.manageBox {
  width: 100%;
  max-width: 900px;
  height: max-content;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  padding: 32px;
}

.manageBox>span {
  color: #303133;
}

.manageItem {
  position: relative;
  width: 100%;
  height: max-content;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 28px 10px;
  border-radius: 4px;
  box-shadow: 0px 0px 12px rgba(0, 0, 0, .12);
  border: 1px solid #e4e7ed;
  cursor: pointer;
  transition: all .2s;
  background-color: white;
  overflow: hidden;
}

.manageItem:hover {
  box-shadow: 0px 0px 12px rgba(0, 0, 0, .22);
}

.manageItem>img {
  object-fit: contain;
  width: 100%;
  height: 190px;
}

.manageItem>span {
  display: block;
  font-size: 15px;
  cursor: pointer;
}

.statusPrompt {
  position: absolute;
  top: 0%;
  left: 0%;
  width: max-content;
  height: max-content;
  padding: 8px 12px;
  box-sizing: border-box;
}

.statusPrompt>span {
  font-size: 14px;
}

.statusPrompt>.start {
  color: #67C23A;
}

.statusPrompt>.stop {
  color: #d03050;
}

.operateBox {
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.35);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: all .25s;
}

.manageItem:hover>.operateBox {
  opacity: 1;
}
</style>