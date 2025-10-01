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
    describeBoxShow.value = false
    emit('refreshList')
}, 500)



// 从文件管理器打开桌宠文件目录
const openPetPath = async () => {
    await window.electron.ipcRenderer.invoke('open-pet-path')
}


const data = ref([
    {
        label: 'C:\\Users\\用户名\\AppData\\Roaming\\petsFile',
        children: [
            {
                label: '以下文件命名不建议出现中文字符',
            },
            {
                label: '桌宠1',
                children: [
                    {
                        label: '文件夹：audio',
                        children: [
                            {
                                label: '用途：存储语音mp3文件'
                            },
                            {
                                label: 'mp3的文件名与下方RelationshipItem类型中'
                            },
                            {
                                label: 'audioName属性互相映射'
                            }
                        ]
                    },
                    {
                        label: '文件夹：Live2D模型文件夹',
                        children: [
                            {
                                label: '在[桌宠1]文件夹下的配置文件中，',
                            },
                            {
                                label: '提到的Live2D模型文件夹，均为此文件夹',
                            },
                            {
                                label: '命名无要求',
                            }
                        ]
                    },
                    {
                        label: '文件：config_pet.json',
                        children: [
                            {
                                label: '用途：桌宠配置文件,下为字段说明'
                            },
                            {
                                label: 'defaultExpression: string',
                                children: [
                                    {
                                        label: '用途：模型默认表情名称',
                                    }
                                ]
                            },
                            {
                                label: 'shieldPartList: Array<string>',
                                children: [
                                    {
                                        label: '用途：屏蔽的部件（透明度调整为0）'
                                    },
                                    {
                                        label: '使用Cubism Viewer打开moc3文件后'
                                    },
                                    {
                                        label: '点击左侧文件栏中xxx.moc3后'
                                    },
                                    {
                                        label: '将下方"参数"选项卡调整为"部件"'
                                    },
                                    {
                                        label: '将要透明化的部件名称写入列表'
                                    }
                                ]
                            },
                            {
                                label: 'sleep: Array<SleepItem> | null',
                                children: [
                                    {
                                        label: '用途：休眠动画和语音',
                                    },
                                    {
                                        label: '这个功能鸽了，写null吧',
                                    }
                                ]
                            },
                            {
                                label: 'awaken: Array<AwakenItem> | null',
                                children: [
                                    {
                                        label: '用途：唤醒动画和语音',
                                    },
                                    {
                                        label: '这个功能鸽了，写null吧',
                                    }
                                ]
                            },
                            {
                                label: 'touchList: Array<TouchItem>',
                                children: [
                                    {
                                        label: '用途：触摸动画列表',
                                    }
                                ]
                            },
                            {
                                label: '泛型参数解释',
                                children: [
                                    {
                                        label: 'RelationshipItem: Object',
                                        children: [
                                            {
                                                label: '用途：使用表情完成动作变化，',
                                            },
                                            {
                                                label: '超出持续时间后，变为默认表情',
                                            },
                                            {
                                                label: '解决大部分获取的Live2D文件没有运动动画问题',
                                            },
                                            {
                                                label: 'type: "Expression"',
                                                children: [
                                                    {
                                                        label: '"Expression"为字面量'
                                                    }
                                                ]
                                            },
                                            {
                                                label: 'expressionName: string',
                                                children: [
                                                    {
                                                        label: 'Live2D文件中 .exp3.json的文件名'
                                                    },
                                                    {
                                                        label: '如无.exp3.json文件'
                                                    },
                                                    {
                                                        label: '使用Cubism Viewer'
                                                    },
                                                    {
                                                        label: '左上角 文件→追加→表情，保存'
                                                    }
                                                ]
                                            },
                                            {
                                                label: 'audioName: string | null',
                                                children: [
                                                    {
                                                        label: '对应的语音'
                                                    },
                                                    {
                                                        label: '可为空，作为无语音动作'
                                                    },
                                                    {
                                                        label: '文件名为audio文件夹内容对应'
                                                    },
                                                    {
                                                        label: '需带文件后缀名'
                                                    }
                                                ]
                                            },
                                            {
                                                label: 'text: string | null',
                                                children: [
                                                    {
                                                        label: '字幕文字'
                                                    },
                                                    {
                                                        label: '有语音时不建议为空'
                                                    }
                                                ]
                                            },
                                            {
                                                label: 'delayed: number',
                                                children: [
                                                    {
                                                        label: '持续时间,毫秒'
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        label: 'SleepItem = RelationshipItem',
                                    },
                                    {
                                        label: 'AwakenItem = RelationshipItem',
                                    },
                                    {
                                        label: 'TouchItem: Object',
                                        children: [
                                            {
                                                label: '用途：点击响应的动画列表',
                                            },
                                            {
                                                label: 'drawableId: number',
                                                children: [
                                                    {
                                                        label: '请使用Cubism Viewer打开moc3文件后'
                                                    },
                                                    {
                                                        label: '点击左侧文件栏中xxx.moc3后'
                                                    },
                                                    {
                                                        label: '将下方"参数"选项卡调整为"图形网格"'
                                                    },
                                                    {
                                                        label: 'drawableId为选项卡中的index'
                                                    }
                                                ]
                                            },
                                            {
                                                label: 'drawableName: string',
                                                children: [
                                                    {
                                                        label: 'drawableName为选项卡中的ID'
                                                    },
                                                    {
                                                        label: '用来绑定点击位置'
                                                    }
                                                ]
                                            },
                                            {
                                                label: 'relationship: Array<RelationshipItem>',
                                                children: [
                                                    {
                                                        label: '动作配置列表，随机运动'
                                                    }
                                                ]
                                            },
                                        ]
                                    },
                                ]
                            },
                        ]
                    },
                    {
                        label: '文件：preview_pet.jpg',
                        children: [
                            {
                                label: '列表预览图，要求JPG文件，尺寸984px * 1210px'
                            }
                        ]
                    },
                    {
                        label: '文件：preview_pet.json',
                        children: [
                            {
                                label: '用途：桌宠管理器基础配置文件'
                            },
                            {
                                label: 'id: string',
                                children: [
                                    {
                                        label: '桌宠唯一标识，确保petsFile文件夹下，'
                                    },
                                    {
                                        label: '配置文件中的id不重复即可'
                                    }
                                ]
                            },
                            {
                                label: 'name: string',
                                children: [
                                    {
                                        label: '预览列表中显示的名称'
                                    }
                                ]
                            },
                            {
                                label: 'infor: string',
                                children: [
                                    {
                                        label: '预览列表中显示的信息'
                                    }
                                ]
                            },
                            {
                                label: 'position: { x: number, y: number }',
                                children: [
                                    {
                                        label: '在桌面中的位置坐标，纯数字，测量单位为逻辑像素'
                                    },
                                    {
                                        label: '如果x与y均为-100000，则显示在主屏幕中央'
                                    }
                                ]
                            },
                            {
                                label: 'size: { width: number, height: number }',
                                children: [
                                    {
                                        label: '在桌面中的尺寸，纯数字，测量单位为逻辑像素'
                                    }
                                ]
                            },
                            {
                                label: 'volume: number',
                                children: [
                                    {
                                        label: '桌宠软件音量，互相独立'
                                    },
                                    {
                                        label: '该数值会被软件相关操作修改'
                                    }
                                ]
                            },
                            {
                                label: 'selfStart: boolean',
                                children: [
                                    {
                                        label: '桌宠软件内是否自启'
                                    },
                                    {
                                        label: '该数值会被软件相关操作修改'
                                    }
                                ]
                            },
                            {
                                label: 'live2dFolder: string',
                                children: [
                                    {
                                        label: 'Live2D模型文件夹的名称'
                                    }
                                ]
                            },
                            {
                                label: 'modelJsonName: string',
                                children: [
                                    {
                                        label: 'Live2D文件夹中'
                                    },
                                    {
                                        label: '.model3.json后缀文件的完整文件名'
                                    }
                                ]
                            },
                            {
                                label: 'roomId: number | null',
                                children: [
                                    {
                                        label: '需要轮询开播状态的直播间ID'
                                    }
                                ]
                            },
                            {
                                label: 'roomName: string | null',
                                children: [
                                    {
                                        label: '需要轮询开播状态的直播间名称'
                                    }
                                ]
                            }

                        ]
                    }
                ],
            },
            {
                label: '桌宠x',
                children: [
                    {
                        label: '同上配置',
                    },
                ],
            },
        ],
    }
]
)
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

                <div class="structureDescriptionBox">
                    <span style="display: block;margin-bottom: 14px; width: 100%; text-align: center;">配置说明</span>
                    <el-tree style="max-width: 100%" :data="data" />
                </div>
            </div>
        </Transition>

    </div>
</template>

<style lang="css" scoped>
.describeBoxShell {
    z-index: 500;
    position: fixed;
    top: 0%;
    left: 0%;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    pointer-events: none;
    overflow: hidden;
}

.buttonOpenBox {
    position: fixed;
    right: 0%;
    top: 50%;
    transform: translateY(-50%);
    height: 85px;
    width: 25px;
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
    width: 25px;
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
    width: 52%;
    background-color: white;
    padding: 14px 12px;
    box-sizing: border-box;
    overflow: auto;
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