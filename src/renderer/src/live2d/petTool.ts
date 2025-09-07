import { type Model } from './model';



const setText = (text: string) => {
    const div = document.getElementById('text_container') as HTMLDivElement;
    if (div) {
        div.replaceChildren();
        const span = document.createElement('span');
        span.textContent = text;
        span.style.animation = 'fadeIn 0.5s ease forwards';
        div.appendChild(span);

        // 强制重排以确保 transition 生效（可选）
        // void span.offsetWidth;

        return span;
    } else {
        return null;
    }
}



const cleanText = (span: HTMLSpanElement) => {
    const div = document.getElementById('text_container') as HTMLDivElement;
    span.style.animation = 'fadeOut 0.5s ease forwards';
    span.addEventListener('animationend', function onEnd() {
        span.removeEventListener('animationend', onEnd);
        div && div.removeChild(span);
    });
}




// --------------------------------------------------------------------------------------------




export const noAudio = (model: Model, configItem: RelationshipItem, defaultExpression: string) => {
    model.setExpression(configItem.expressionName)
    // 延迟回归默认动作
    const expressionTime = setTimeout(() => {
        // 回到初始表情
        model.setExpression(defaultExpression)
        // 清空计时器
        clearTimeout(expressionTime);
    }, configItem.delayed);
}




export const haveAudio = async (model: Model, configItem: RelationshipItem, defaultExpression: string, petFilePath: string, audioId: string) => {
    const audioArrayBuffer: NonSharedBuffer = await window.electron.ipcRenderer.invoke(
        'get-buffer',
        `${petFilePath}/audio/${configItem.audioName}`
    );

    const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' });

    const audioPlayer = document.getElementById(audioId) as HTMLAudioElement;

    audioPlayer.src = URL.createObjectURL(audioBlob);

    let spanHTMLSpanElement: HTMLSpanElement | null = null;

    // 可以播放媒体文件时
    const canPlayHandler = () => {
        // 设置文本
        if (configItem.text) {
            spanHTMLSpanElement = setText(configItem.text);
        }
        // 自动播放
        audioPlayer.play();
        // 变化表情
        model.setExpression(configItem.expressionName);
        // 移除监听
        audioPlayer.removeEventListener('canplay', canPlayHandler);
    }


    // 播放完成后
    const endedHandler = () => {
        const timeoutId = setTimeout(() => {
            // 关闭对话框
            spanHTMLSpanElement && cleanText(spanHTMLSpanElement);
            // 回到初始表情
            model.setExpression(defaultExpression);
            // 移除 ended 事件监听器
            audioPlayer.removeEventListener('ended', endedHandler);
            // 清除计算器
            clearTimeout(timeoutId);
        }, configItem.delayed);

    };

    // 设置监听回调
    audioPlayer.addEventListener('canplay', canPlayHandler);
    audioPlayer.addEventListener('ended', endedHandler);
}




// 轮询哔哩哔哩直播间直播状态 (跨域 转主线程)
// export const pollBilibiliLive = async (roomId: number) => {
//     try {
//         const response = await fetch(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${roomId}`);

//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }

//         const data = await response.json();

//         // 检查返回码
//         if (data.code !== 0) {
//             throw new Error(`API 返回错误`);
//         }

//         if (!data.data.live_status) {
//             throw new Error(`API 返回错误`);
//         }

//         return {
//             flag: data.data.live_status === 1 ? true : false,
//             time: data.data.live_time
//         }

//     } catch (error) {
//         return {
//             flag: false,
//             time: null
//         }
//     }
// }