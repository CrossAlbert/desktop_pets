<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Ref, ref } from 'vue'
import DescribeBox from '@renderer/components/DescribeBox.vue'


// 渲染线程解析后 生成的在视图层的预览列表元素
type PreviewItemRenderer = {
  // 预览信息
  previewInfor: PreviewInfor
  // 预览图Blob路径
  previewJpgBlobUrl: string
  // 桌宠（live2d文件、音频文件、触摸预设文件）文件夹路径
  petFilePath: string
  // 桌宠窗口id null代表未启动
  windowId: null | number,
  // 预览信息json存储地址
  previewJsonPath: string
}


const previewList: Ref<PreviewItemRenderer[]> = ref([])


// 释放图片blob img标签加载完成后执行
const handleImageLoad = (url: string) => {
  // 释放内存
  URL.revokeObjectURL(url);
}


// 修改位置信息显示格式
const getPosition = (i: { x: number, y: number }): string => {
  if (i.x == -100000 && i.y == -100000) {
    return '屏幕中心'
  } else {
    return `${i.x},${i.y}`
  }
}


// 获取桌宠预览列表
const getPreviewList = async () => {
  // 从主线程获取预览列表
  const response = await window.electron.ipcRenderer.invoke('get-preview-list') as PreviewItemIpc[]
  // 从主线程获取已有的桌宠窗口id petId:windowId
  const synchronousData = await window.electron.ipcRenderer.invoke('ipc-synchronous-pet-window-id') as { [k: string]: number }

  // 遍历列表 获取预览图、桌宠基础信息
  response.forEach(async (el) => {
    const [
      imageBuffer,
      previewInfor
    ] = await Promise.all([
      window.electron.ipcRenderer.invoke('get-buffer', el.previewJpgPath),
      window.electron.ipcRenderer.invoke('get-json', el.previewJsonPath)
    ])

    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
    const imageUrl = URL.createObjectURL(imageBlob)

    // 添加到视图层列表
    previewList.value.push({
      previewInfor: previewInfor,
      previewJpgBlobUrl: imageUrl,
      petFilePath: el.petFilePath,
      windowId: synchronousData[previewInfor.id] || null,
      previewJsonPath: el.previewJsonPath
    })

  });

}


getPreviewList();


// --------------------------------------------------------------------------------------------------------


const startPetButtonLock = ref(false);

// 开启桌宠窗口
const startPet = async (petFilePath: string, previewInfor: PreviewInfor, index: number) => {
  try {
    // 一个配置文件只能开启一个窗口
    if (previewList.value[index].windowId !== null) { return }
    // 锁定按钮 开启加载动画
    startPetButtonLock.value = true
    // 准备桌宠必要配置信息
    const infor: PreviewInforIpc = {
      petFilePath,
      // 解决vue深层代理导致的数据无法序列化给ipc
      ...JSON.parse(JSON.stringify(previewInfor))
    }
    // 开启桌宠窗口 并获取窗口id
    const windowId = await window.electron.ipcRenderer.invoke('start-pet', infor) as number
    // 设置窗口id
    previewList.value[index].windowId = windowId
    // 解锁按钮 关闭加载动画
    startPetButtonLock.value = false
  } catch (error) {
    ElMessage.error('启动失败')
  }
}


const stopPetButtonLock = ref(false);


// 关闭桌宠窗口
const stopPet = async (index: number) => {
  try {
    const item = previewList.value[index]

    if (item.windowId === null) { return }

    stopPetButtonLock.value = true
    await window.electron.ipcRenderer.invoke('stop-pet', item.windowId, item.previewInfor.id)

    previewList.value[index].windowId = null
    stopPetButtonLock.value = false
  } catch (error) {
    ElMessage.error('关闭失败')
  }
}


// 防抖 节流
import { debounce, throttle } from 'lodash';


// 控制特定桌宠音量
const changeVolume = debounce(async (volume: number, windowId: number | null, previewJsonPath: string) => {
  try {
    if (windowId) {
      await window.electron.ipcRenderer.invoke('ipc-change-volume', windowId, volume, previewJsonPath);
    }
  } catch (error) {
    ElMessage.error('音量设置失败');
  }
}, 500)



const changePositionButtonLock = ref(false)
// 修改特定桌宠以后默认启动位置
const changePosition = throttle(async (index: number) => {

  const item = previewList.value[index]

  if (item.windowId === null) { return }

  changePositionButtonLock.value = true

  try {
    const result = await window.electron.ipcRenderer.invoke('ipc-change-position', item.windowId, item.previewJsonPath)
    previewList.value[index].previewInfor.position.x = result.x
    previewList.value[index].previewInfor.position.y = result.y
    ElMessage.success('设置成功')
  } catch (error) {
    ElMessage.error('设置失败')
  }

  changePositionButtonLock.value = false

}, 500)



const resetPositionButtonLock = ref(false)
// 重置特定桌宠以后默认启动位置
const resetPosition = throttle(async (index: number) => {
  const item = previewList.value[index]

  if (item.windowId === null) { return }

  try {
    resetPositionButtonLock.value = true;
    // 重置json配置文件内容
    await window.electron.ipcRenderer.invoke('ipc-reset-position', item.previewJsonPath)
    // 关闭旧位置窗口
    await window.electron.ipcRenderer.invoke('stop-pet', item.windowId)
    // 修改内存中的配置信息
    previewList.value[index].previewInfor.position.x = -100000
    previewList.value[index].previewInfor.position.y = -100000
    previewList.value[index].windowId = null
    // 重启桌宠
    await startPet(item.petFilePath, item.previewInfor, index)
    resetPositionButtonLock.value = false
    ElMessage.success('重置成功')
  } catch (error) {
    ElMessage.error('重置失败')
  }

}, 500)



const changeSelfStartButtonLock = ref(false)
// 设置桌宠是否自启
const changeSelfStart = throttle(async (index: number, flag: boolean) => {
  changeSelfStartButtonLock.value = true
  try {
    const item = previewList.value[index]

    if (item.windowId === null) { return }

    await window.electron.ipcRenderer.invoke('ipc-change-self-start', item.previewJsonPath, flag)
    item.previewInfor.selfStart = flag

    ElMessage.success('设置成功')
  } catch (error) {
    ElMessage.success('设置失败')
  }
  changeSelfStartButtonLock.value = false
}, 500)

</script>

<template>
  <div class="manageBox">

    <DescribeBox></DescribeBox>

    <div class="manageItem" v-for="(item, index) in previewList">

      <img :src="item.previewJpgBlobUrl" @load="handleImageLoad(item.previewJpgBlobUrl)">
      <span>{{ item.previewInfor.name }}</span>
      <span>{{ item.previewInfor.infor }}</span>
      <span>位置：{{ getPosition(item.previewInfor.position) }}</span>

      <div class="statusPrompt">
        <span v-if="item.windowId" class="start">&#9679;启动中</span>
        <span v-else class="stop">&#9679;未启动</span>
      </div>

      <div class="operateBox">
        <div class="buttonBox">

          <el-button :disabled="startPetButtonLock" :loading="startPetButtonLock" type="danger" v-if="item.windowId"
            @click="stopPet(index)">关闭桌宠</el-button>

          <el-button :disabled="stopPetButtonLock" :loading="stopPetButtonLock" type="success" v-else
            @click="startPet(item.petFilePath, item.previewInfor, index)">启动桌宠</el-button>

          <el-button :disabled="!item.windowId || changePositionButtonLock" type="primary"
            @click="changePosition(index)">设置位置</el-button>

          <el-button :disabled="!item.windowId || resetPositionButtonLock" type="warning"
            @click="resetPosition(index)">重置位置</el-button>

          <el-button v-if="!item.previewInfor.selfStart" :disabled="!item.windowId || changeSelfStartButtonLock"
            type="info" @click="changeSelfStart(index, true)">设为自启</el-button>

          <el-button v-else :disabled="!item.windowId || changeSelfStartButtonLock" type="info"
            @click="changeSelfStart(index, false)">取消自启</el-button>

        </div>

        <el-slider v-model="item.previewInfor.volume" vertical height="200px" :disabled="!item.windowId"
          @change="changeVolume(item.previewInfor.volume, item.windowId, item.previewJsonPath)" />

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

.buttonBox {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-right: 10px;
  margin-left: 18px;
  gap: 14px;
}

.buttonBox>button {
  margin: 0px;
}

.manageItem:hover>.operateBox {
  opacity: 1;
}
</style>